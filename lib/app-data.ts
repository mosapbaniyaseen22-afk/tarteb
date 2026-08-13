import { supabase } from './supabase';
import { guestStore, newId, type Bookmark } from './guest-db';
import type {
  AiConversation,
  Note,
  QuranProgress,
  ScheduleEntry,
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
    guestStore.setTasks(data as Task[]);
    return data as Task[];
  }
  return guestStore.getTasks();
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

export async function loadSchedule(userId: string, date: string): Promise<ScheduleEntry[]> {
  const { data } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('schedule_date', date)
    .order('start_time');
  if (data) return data as ScheduleEntry[];
  return guestStore.getSchedule(date);
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
  if (data) return data as ScheduleEntry[];
  return guestStore.getScheduleRange(start, end);
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
