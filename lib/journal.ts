import type { Note, NoteMood, NotePaper } from './supabase';

export type NoteMoodOption = {
  id: NoteMood;
  label: string;
  emoji: string;
};

export type NotePaperTheme = {
  id: NotePaper;
  label: string;
  bg: string;
  line: string;
  ink: string;
  muted: string;
};

export const NOTE_MOODS: NoteMoodOption[] = [
  { id: 'happy', label: 'سعيد', emoji: '😊' },
  { id: 'calm', label: 'هادي', emoji: '🌿' },
  { id: 'motivated', label: 'متحمس', emoji: '🔥' },
  { id: 'proud', label: 'فخور', emoji: '⭐' },
  { id: 'tired', label: 'تعبان', emoji: '😴' },
  { id: 'anxious', label: 'قلق', emoji: '💭' },
];

export const JOURNAL_PROMPTS = [
  'شو اللي تعلمت اليوم؟',
  'إنجاز صغير أفتخر فيه',
  'شو اللي ضايقني وكيف أتعامل معه؟',
  'خطة بكرة بجملة وحدة',
  'رسالة تشجيع لنفسك',
];

export function noteMoodMeta(mood: NoteMood | null): NoteMoodOption | null {
  if (!mood) return null;
  switch (mood) {
    case 'happy':
      return NOTE_MOODS[0];
    case 'calm':
      return NOTE_MOODS[1];
    case 'motivated':
      return NOTE_MOODS[2];
    case 'proud':
      return NOTE_MOODS[3];
    case 'tired':
      return NOTE_MOODS[4];
    case 'anxious':
      return NOTE_MOODS[5];
    default: {
      const exhaustive: never = mood;
      return exhaustive;
    }
  }
}

export function notePaperTheme(paper: NotePaper): NotePaperTheme {
  switch (paper) {
    case 'cream':
      return { id: 'cream', label: 'كراس', bg: '#FBF6EA', line: 'rgba(180,83,9,0.16)', ink: '#3F2E1F', muted: '#8A7460' };
    case 'sage':
      return { id: 'sage', label: 'أخضر', bg: '#EEF4EC', line: 'rgba(22,101,52,0.16)', ink: '#1F3D2B', muted: '#5C7A66' };
    case 'rose':
      return { id: 'rose', label: 'وردي', bg: '#FBF0F2', line: 'rgba(190,18,60,0.14)', ink: '#4A1D2A', muted: '#8C5A66' };
    case 'sky':
      return { id: 'sky', label: 'سماوي', bg: '#EEF5FB', line: 'rgba(37,99,235,0.16)', ink: '#1E3A5F', muted: '#5B7390' };
    case 'lavender':
      return { id: 'lavender', label: 'لافندر', bg: '#F4F0FB', line: 'rgba(124,58,237,0.16)', ink: '#2E2150', muted: '#6E6288' };
    case 'ink':
      return { id: 'ink', label: 'ليلي', bg: '#1C1917', line: 'rgba(251,191,36,0.2)', ink: '#F5E6C8', muted: '#A8A29E' };
    default: {
      const exhaustive: never = paper;
      return exhaustive;
    }
  }
}

export const NOTE_PAPERS: NotePaperTheme[] = [
  notePaperTheme('cream'),
  notePaperTheme('sage'),
  notePaperTheme('rose'),
  notePaperTheme('sky'),
  notePaperTheme('lavender'),
  notePaperTheme('ink'),
];

export function defaultJournalTitle(date = new Date()) {
  return new Intl.DateTimeFormat('ar-JO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function journalPreview(content: string, max = 72) {
  const text = content.replace(/\s+/g, ' ').trim();
  if (!text) return 'صفحة فاضية… اكتب أول سطر';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function journalWordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

export function formatJournalStamp(iso: string) {
  return new Intl.DateTimeFormat('ar-JO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function sortJournalNotes(notes: Note[]) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updated_at.localeCompare(a.updated_at);
  });
}
