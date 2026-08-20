import { supabase, normalizePreferences, normalizeTaskKind, normalizeWeekdays, repeatingWeekdays, weekdayUsesRepeatingTemplate } from './supabase';
import { guestStore, newId, type Bookmark } from './guest-db';
import { jordanDateISO } from './prayer-times';
import { addDaysISO, weekdayIndex } from './week';
import type {
  AiConversation,
  Note,
  QuranProgress,
  Routine,
  SchedulePreferences,
  ScheduleEntry,
  ScheduleTemplateBlock,
  QuizAttempt,
  StudySession,
  Task,
  UserSubject,
} from './supabase';

export async function loadUserSubjects(userId: string): Promise<UserSubject[]> {
  const { data } = await supabase.from('user_subjects').select('*, subjects(*)').eq('user_id', userId);
  if (data && data.length > 0) {
    guestStore.setSubjects(data as UserSubject[]);
    return data as UserSubject[];
  }
  return guestStore.getSubjects();
}

export async function loadTasks(userId: string): Promise<Task[]> {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('task_date', { ascending: true });
  if (data) {
    const tasks = (data as Task[]).map((task) => ({
      ...task,
      kind: normalizeTaskKind(task.kind, task.title, task.subject_name),
    }));
    guestStore.setTasks(tasks);
    return tasks;
  }
  return guestStore.getTasks().map((task) => ({
    ...task,
    kind: normalizeTaskKind(task.kind, task.title, task.subject_name),
  }));
}

export async function addTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null> {
  const { data, error } = await supabase.from('tasks').insert(task).select('*').single();
  if (!error && data) return data as Task;
  return guestStore.addTask(task);
}

export async function updateTaskStatus(id: string, status: Task['status']) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) guestStore.updateTask(id, { status });
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) guestStore.deleteTask(id);
}

function groupTemplatesByWeekday(blocks: ScheduleTemplateBlock[]) {
  const grouped = new Map<number, ScheduleTemplateBlock[]>();
  const sorted = [...blocks].sort(
    (a, b) => a.weekday - b.weekday || a.sort_index - b.sort_index || a.start_time.localeCompare(b.start_time),
  );
  for (const block of sorted) {
    const list = grouped.get(block.weekday) ?? [];
    list.push(block);
    grouped.set(block.weekday, list);
  }
  return grouped;
}

function templateToEntries(
  userId: string,
  date: string,
  blocks: ScheduleTemplateBlock[],
): Omit<ScheduleEntry, 'id'>[] {
  return blocks.map((block) => ({
    user_id: userId,
    schedule_date: date,
    start_time: block.start_time,
    end_time: block.end_time,
    activity: block.activity,
    activity_type: block.activity_type,
    subject_name: block.subject_name,
    color: block.color,
    task_id: block.task_id,
    completed: false,
  }));
}

function datesInRange(start: string, end: string) {
  const dates: string[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    current = addDaysISO(current, 1);
  }
  return dates;
}

async function loadRecentScheduleEntries(userId: string): Promise<ScheduleEntry[]> {
  const start = addDaysISO(jordanDateISO(), -90);
  const { data } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('schedule_date', start)
    .order('schedule_date', { ascending: false });
  if (data && data.length > 0) return data as ScheduleEntry[];
  return guestStore.getScheduleRange(start, addDaysISO(jordanDateISO(), 90));
}

function latestEntriesForWeekday(entries: ScheduleEntry[], weekday: number) {
  const dates: string[] = [];
  for (const row of entries) {
    if (weekdayIndex(row.schedule_date) !== weekday) continue;
    if (!dates.includes(row.schedule_date)) dates.push(row.schedule_date);
  }
  dates.sort((a, b) => b.localeCompare(a));
  const latest = dates[0];
  if (!latest) return [];
  return entries
    .filter((row) => row.schedule_date === latest)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

async function ensureWeekdayTemplates(
  userId: string,
  prefs: SchedulePreferences | null,
  existing: ScheduleTemplateBlock[],
): Promise<Map<number, ScheduleTemplateBlock[]>> {
  const grouped = groupTemplatesByWeekday(existing);
  if (!prefs) return grouped;
  const needed = repeatingWeekdays(prefs.schedule_mode, prefs.custom_days);
  const missing = needed.filter((weekday) => (grouped.get(weekday) ?? []).length === 0);
  if (missing.length === 0) return grouped;

  const recent = await loadRecentScheduleEntries(userId);
  for (const weekday of missing) {
    const source = latestEntriesForWeekday(recent, weekday);
    if (source.length === 0) continue;
    const saved = await saveWeekdayTemplate(userId, weekday, source);
    grouped.set(weekday, saved);
  }
  return grouped;
}

async function materializeEmptyDay(
  userId: string,
  date: string,
  prefs: SchedulePreferences | null,
  templatesByWeekday: Map<number, ScheduleTemplateBlock[]>,
): Promise<ScheduleEntry[]> {
  if (!prefs) return [];
  const weekday = weekdayIndex(date);
  if (!weekdayUsesRepeatingTemplate(prefs.schedule_mode, prefs.custom_days, weekday)) return [];
  const blocks = templatesByWeekday.get(weekday) ?? [];
  if (blocks.length === 0) return [];
  return replaceSchedule(userId, date, templateToEntries(userId, date, blocks));
}

export async function loadWeekdayTemplates(userId: string): Promise<ScheduleTemplateBlock[]> {
  const { data } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index');
  if (data && data.length > 0) return data as ScheduleTemplateBlock[];
  const local = guestStore.getTemplates(userId);
  if (local.length > 0) return local;
  return data ?? [];
}

export async function saveWeekdayTemplate(
  userId: string,
  weekday: number,
  entries: Array<
    Pick<
      ScheduleEntry,
      'start_time' | 'end_time' | 'activity' | 'activity_type' | 'subject_name' | 'color' | 'task_id'
    >
  >,
): Promise<ScheduleTemplateBlock[]> {
  const rows = entries.map((entry, index) => ({
    user_id: userId,
    weekday,
    start_time: entry.start_time,
    end_time: entry.end_time,
    activity: entry.activity,
    activity_type: entry.activity_type,
    subject_name: entry.subject_name,
    color: entry.color,
    task_id: entry.task_id,
    sort_index: index,
  }));

  await supabase.from('schedule_templates').delete().eq('user_id', userId).eq('weekday', weekday);
  if (rows.length > 0) {
    const { data, error } = await supabase.from('schedule_templates').insert(rows).select('*');
    if (!error && data) {
      guestStore.replaceWeekdayTemplate(userId, weekday, data as ScheduleTemplateBlock[]);
      return data as ScheduleTemplateBlock[];
    }
  }

  const local = rows.map((row) => ({ ...row, id: newId('tmpl') }));
  guestStore.replaceWeekdayTemplate(userId, weekday, local);
  return local;
}

export async function loadSchedule(userId: string, date: string): Promise<ScheduleEntry[]> {
  const { data } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('schedule_date', date)
    .order('start_time');
  const existing = data ?? guestStore.getSchedule(date);
  if (existing.length > 0) return existing as ScheduleEntry[];

  const [prefs, templates] = await Promise.all([loadPreferences(userId), loadWeekdayTemplates(userId)]);
  const grouped = await ensureWeekdayTemplates(userId, prefs, templates);
  return materializeEmptyDay(userId, date, prefs, grouped);
}

export async function replaceSchedule(userId: string, date: string, entries: Omit<ScheduleEntry, 'id'>[]) {
  await supabase.from('schedule_entries').delete().eq('user_id', userId).eq('schedule_date', date);
  const { data, error } = await supabase.from('schedule_entries').insert(entries).select('*');
  if (!error && data) {
    guestStore.replaceSchedule(date, data as ScheduleEntry[]);
    return data as ScheduleEntry[];
  }
  const local = entries.map((entry) => ({ ...entry, id: newId('sched') })) as ScheduleEntry[];
  guestStore.replaceSchedule(date, local);
  return local;
}

export async function addScheduleEntry(entry: Omit<ScheduleEntry, 'id'>): Promise<ScheduleEntry> {
  const { data, error } = await supabase.from('schedule_entries').insert(entry).select('*').single();
  if (!error && data) {
    return data as ScheduleEntry;
  }
  return guestStore.addScheduleEntry(entry);
}

export async function updateScheduleEntry(id: string, patch: Partial<ScheduleEntry>): Promise<ScheduleEntry | null> {
  const { data, error } = await supabase.from('schedule_entries').update(patch).eq('id', id).select('*').single();
  if (!error && data) return data as ScheduleEntry;
  return guestStore.updateScheduleEntry(id, patch);
}

export async function deleteScheduleEntry(id: string) {
  const { error } = await supabase.from('schedule_entries').delete().eq('id', id);
  if (error) guestStore.deleteScheduleEntry(id);
}

export async function loadScheduleRange(userId: string, start: string, end: string): Promise<ScheduleEntry[]> {
  const { data } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('schedule_date', start)
    .lte('schedule_date', end)
    .order('start_time');
  const existing = (data ?? guestStore.getScheduleRange(start, end)) as ScheduleEntry[];
  const byDate = new Map<string, ScheduleEntry[]>();
  for (const row of existing) {
    const list = byDate.get(row.schedule_date) ?? [];
    list.push(row);
    byDate.set(row.schedule_date, list);
  }

  const [prefs, templates] = await Promise.all([loadPreferences(userId), loadWeekdayTemplates(userId)]);
  const templatesByWeekday = await ensureWeekdayTemplates(userId, prefs, templates);
  const result: ScheduleEntry[] = [];

  for (const date of datesInRange(start, end)) {
    const current = byDate.get(date) ?? [];
    if (current.length > 0) {
      result.push(...current);
      continue;
    }
    result.push(...(await materializeEmptyDay(userId, date, prefs, templatesByWeekday)));
  }

  return result.sort(
    (a, b) => a.schedule_date.localeCompare(b.schedule_date) || a.start_time.localeCompare(b.start_time),
  );
}

export async function toggleScheduleCompletion(entry: ScheduleEntry): Promise<ScheduleEntry | null> {
  const completed = !entry.completed;
  const updated = await updateScheduleEntry(entry.id, { completed });
  if (entry.task_id) {
    await updateTaskStatus(entry.task_id, completed ? 'completed' : 'pending');
  }
  return updated;
}

export async function loadRoutines(userId: string): Promise<Routine[]> {
  const { data } = await supabase
    .from('user_routines')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });
  if (data) {
    return (data as Routine[]).map((routine) => ({
      ...routine,
      weekdays: normalizeWeekdays(routine.weekdays),
    }));
  }
  return guestStore.getRoutines().map((routine) => ({
    ...routine,
    weekdays: normalizeWeekdays(routine.weekdays),
  }));
}

export async function addRoutine(routine: Omit<Routine, 'id' | 'created_at'>): Promise<Routine> {
  const { data, error } = await supabase.from('user_routines').insert(routine).select('*').single();
  if (!error && data) return { ...data, weekdays: normalizeWeekdays((data as Routine).weekdays) } as Routine;
  return guestStore.addRoutine(routine);
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from('user_routines').delete().eq('id', id);
  if (error) guestStore.deleteRoutine(id);
}

export async function loadPreferences(userId: string): Promise<SchedulePreferences | null> {
  const { data } = await supabase
    .from('schedule_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return normalizePreferences(data as SchedulePreferences);
  const local = guestStore.getPreferences(userId);
  return local ? normalizePreferences(local) : null;
}

export async function savePreferences(
  userId: string,
  patch: Partial<Omit<SchedulePreferences, 'id' | 'user_id' | 'updated_at'>>,
): Promise<SchedulePreferences> {
  const { data, error } = await supabase
    .from('schedule_preferences')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (!error && data) return data as SchedulePreferences;
  return guestStore.savePreferences(userId, patch);
}

export async function loadQuran(userId: string) {
  const { data } = await supabase
    .from('quran_progress')
    .select('*')
    .eq('user_id', userId)
    .order('progress_date', { ascending: false })
    .limit(30);
  if (data) return data as QuranProgress[];
  return guestStore.getQuran();
}

export async function upsertQuran(entry: Omit<QuranProgress, 'id'> & { id?: string }) {
  if (entry.id) {
    const { data, error } = await supabase
      .from('quran_progress')
      .update({
        surah_name: entry.surah_name,
        pages_read: entry.pages_read,
        target_pages: entry.target_pages,
        completed: entry.completed,
      })
      .eq('id', entry.id)
      .select('*')
      .single();
    if (!error && data) return data as QuranProgress;
  }
  const { data, error } = await supabase
    .from('quran_progress')
    .upsert(
      {
        user_id: entry.user_id,
        progress_date: entry.progress_date,
        surah_name: entry.surah_name,
        pages_read: entry.pages_read,
        target_pages: entry.target_pages,
        completed: entry.completed,
      },
      { onConflict: 'user_id,progress_date' },
    )
    .select('*')
    .single();
  if (!error && data) return data as QuranProgress;
  const local: QuranProgress = { ...entry, id: entry.id || newId('quran') };
  guestStore.upsertQuran(local);
  return local;
}

export async function loadNotes(userId: string, subjectId: string) {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  if (data) return data as Note[];
  return guestStore.getNotes(subjectId);
}

export async function addNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('notes').insert(note).select('*').single();
  if (!error && data) return data as Note;
  return guestStore.addNote(note);
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) guestStore.deleteNote(id);
}

export async function loadBookmarks(userId: string, subjectId: string) {
  const { data } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  if (data) return data as Bookmark[];
  return guestStore.getBookmarks(subjectId);
}

export async function addBookmark(bookmark: Omit<Bookmark, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('bookmarks').insert(bookmark).select('*').single();
  if (!error && data) return data as Bookmark;
  return guestStore.addBookmark(bookmark);
}

export async function deleteBookmark(id: string) {
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) guestStore.deleteBookmark(id);
}

export async function loadAiMessages(userId: string) {
  const { data } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);
  if (data) return data as AiConversation[];
  return guestStore.getAiMessages();
}

export async function addAiMessage(message: Omit<AiConversation, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('ai_conversations').insert(message).select('*').single();
  if (!error && data) return data as AiConversation;
  return guestStore.addAiMessage(message);
}

export async function loadSessions(userId: string): Promise<StudySession[]> {
  const { data } = await supabase.from('study_sessions').select('*').eq('user_id', userId);
  if (data) return data as StudySession[];
  return guestStore.getSessions();
}

export async function loadQuizAttempts(userId: string): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!error && data) {
    guestStore.setQuizAttempts(data as QuizAttempt[]);
    return data as QuizAttempt[];
  }
  return guestStore.getQuizAttempts().filter((item) => item.user_id === userId);
}

export async function addQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): Promise<QuizAttempt> {
  const { data, error } = await supabase.from('quiz_attempts').insert(attempt).select('*').single();
  if (!error && data) {
    const row = data as QuizAttempt;
    guestStore.setQuizAttempts([row, ...guestStore.getQuizAttempts().filter((item) => item.id !== row.id)]);
    return row;
  }
  return guestStore.addQuizAttempt(attempt);
}
