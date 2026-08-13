
/*
# Labib Educational Platform - Full Schema

## Summary
Creates all tables for the Labib Tawjihi educational platform for Jordanian students.

## New Tables
1. `profiles` - Student profiles with name, region, educational stage, field of study
2. `subjects` - Subject catalog with associated field/stage
3. `user_subjects` - Many-to-many join between users and their selected subjects
4. `tasks` - Student tasks with title, subject, schedule, priority, status
5. `schedule_entries` - Smart daily schedule entries
6. `bookmarks` - Saved/bookmarked content items
7. `notes` - Personal notes per subject
8. `quran_progress` - Daily Quran wird tracking
9. `study_sessions` - Logged study sessions for statistics
10. `ai_conversations` - Chat history with Labib AI

## Security
- RLS enabled on all tables
- Owner-scoped policies using auth.uid()
- All inserts default user_id to auth.uid()
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  region text,
  stage text, -- 'tawjihi' | 'first_year' | 'second_year' | 'other'
  tawjihi_year integer,
  study_field text, -- 'medical' | 'engineering' | 'business' | 'arts'
  avatar_url text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- SUBJECTS CATALOG
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  stage text, -- 'tawjihi' | 'first_year' | 'second_year'
  field text, -- 'medical' | 'engineering' | 'business' | 'arts' | 'all'
  color text DEFAULT '#2563EB',
  icon text DEFAULT 'BookOpen',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_select_subjects" ON subjects;
CREATE POLICY "anyone_select_subjects" ON subjects FOR SELECT
  TO authenticated USING (true);

-- USER SUBJECTS (selected subjects per user)
CREATE TABLE IF NOT EXISTS user_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_subjects" ON user_subjects;
CREATE POLICY "select_own_user_subjects" ON user_subjects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_subjects" ON user_subjects;
CREATE POLICY "insert_own_user_subjects" ON user_subjects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_subjects" ON user_subjects;
CREATE POLICY "update_own_user_subjects" ON user_subjects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_subjects" ON user_subjects;
CREATE POLICY "delete_own_user_subjects" ON user_subjects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name text,
  task_date date,
  start_time time,
  end_time time,
  priority text NOT NULL DEFAULT 'medium', -- 'high' | 'medium' | 'low'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'completed'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SCHEDULE ENTRIES
CREATE TABLE IF NOT EXISTS schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  activity text NOT NULL,
  activity_type text NOT NULL DEFAULT 'study', -- 'study' | 'prayer' | 'break' | 'sleep' | 'quran' | 'center' | 'meal' | 'wake'
  subject_name text,
  color text DEFAULT '#2563EB',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_schedule" ON schedule_entries;
CREATE POLICY "select_own_schedule" ON schedule_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_schedule" ON schedule_entries;
CREATE POLICY "insert_own_schedule" ON schedule_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_schedule" ON schedule_entries;
CREATE POLICY "update_own_schedule" ON schedule_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_schedule" ON schedule_entries;
CREATE POLICY "delete_own_schedule" ON schedule_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- BOOKMARKS
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL DEFAULT 'lesson', -- 'lesson' | 'summary' | 'exam' | 'video'
  url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
CREATE POLICY "select_own_bookmarks" ON bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON bookmarks;
CREATE POLICY "insert_own_bookmarks" ON bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookmarks" ON bookmarks;
CREATE POLICY "update_own_bookmarks" ON bookmarks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON bookmarks;
CREATE POLICY "delete_own_bookmarks" ON bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- NOTES
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- QURAN PROGRESS
CREATE TABLE IF NOT EXISTS quran_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_date date NOT NULL DEFAULT CURRENT_DATE,
  surah_name text NOT NULL DEFAULT 'سورة الكهف',
  pages_read integer NOT NULL DEFAULT 0,
  target_pages integer NOT NULL DEFAULT 4,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, progress_date)
);

ALTER TABLE quran_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quran" ON quran_progress;
CREATE POLICY "select_own_quran" ON quran_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_quran" ON quran_progress;
CREATE POLICY "insert_own_quran" ON quran_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_quran" ON quran_progress;
CREATE POLICY "update_own_quran" ON quran_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quran" ON quran_progress;
CREATE POLICY "delete_own_quran" ON quran_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- STUDY SESSIONS (statistics)
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name text,
  duration_minutes integer NOT NULL DEFAULT 0,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON study_sessions;
CREATE POLICY "select_own_sessions" ON study_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON study_sessions;
CREATE POLICY "insert_own_sessions" ON study_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON study_sessions;
CREATE POLICY "update_own_sessions" ON study_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON study_sessions;
CREATE POLICY "delete_own_sessions" ON study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'user' | 'assistant'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai" ON ai_conversations;
CREATE POLICY "select_own_ai" ON ai_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai" ON ai_conversations;
CREATE POLICY "insert_own_ai" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai" ON ai_conversations;
CREATE POLICY "delete_own_ai" ON ai_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SEED SUBJECTS
INSERT INTO subjects (name, name_ar, stage, field, color, icon) VALUES
  -- First Year (all students)
  ('mathematics', 'الرياضيات', 'first_year', 'all', '#2563EB', 'Calculator'),
  ('arabic', 'اللغة العربية', 'first_year', 'all', '#DC2626', 'BookOpen'),
  ('islamic', 'التربية الإسلامية', 'first_year', 'all', '#059669', 'Moon'),
  ('jordan_history', 'تاريخ الأردن', 'first_year', 'all', '#D97706', 'Globe'),
  -- Tawjihi Medical
  ('biology', 'الأحياء', 'second_year', 'medical', '#059669', 'Microscope'),
  ('chemistry', 'الكيمياء', 'second_year', 'medical', '#7C3AED', 'FlaskConical'),
  ('physics', 'الفيزياء', 'second_year', 'medical', '#2563EB', 'Atom'),
  ('math_med', 'الرياضيات', 'second_year', 'medical', '#DC2626', 'Calculator'),
  ('arabic_med', 'اللغة العربية', 'second_year', 'medical', '#0F172A', 'BookOpen'),
  ('islamic_med', 'التربية الإسلامية', 'second_year', 'medical', '#059669', 'Moon'),
  -- Tawjihi Engineering
  ('math_eng', 'الرياضيات', 'second_year', 'engineering', '#2563EB', 'Calculator'),
  ('physics_eng', 'الفيزياء', 'second_year', 'engineering', '#7C3AED', 'Atom'),
  ('chemistry_eng', 'الكيمياء', 'second_year', 'engineering', '#D97706', 'FlaskConical'),
  ('arabic_eng', 'اللغة العربية', 'second_year', 'engineering', '#0F172A', 'BookOpen'),
  ('islamic_eng', 'التربية الإسلامية', 'second_year', 'engineering', '#059669', 'Moon'),
  -- Tawjihi Business
  ('economics', 'الاقتصاد', 'second_year', 'business', '#0891B2', 'TrendingUp'),
  ('accounting', 'المحاسبة', 'second_year', 'business', '#2563EB', 'BarChart'),
  ('business_math', 'الرياضيات التجارية', 'second_year', 'business', '#DC2626', 'Calculator'),
  ('arabic_bus', 'اللغة العربية', 'second_year', 'business', '#0F172A', 'BookOpen'),
  ('islamic_bus', 'التربية الإسلامية', 'second_year', 'business', '#059669', 'Moon'),
  -- Tawjihi Arts
  ('history', 'التاريخ', 'second_year', 'arts', '#D97706', 'Globe'),
  ('geography', 'الجغرافيا', 'second_year', 'arts', '#059669', 'Map'),
  ('english', 'اللغة الإنجليزية', 'second_year', 'arts', '#2563EB', 'Languages'),
  ('arabic_arts', 'اللغة العربية', 'second_year', 'arts', '#0F172A', 'BookOpen'),
  ('islamic_arts', 'التربية الإسلامية', 'second_year', 'arts', '#059669', 'Moon')
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_schedule_user_date ON schedule_entries(user_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_quran_user_date ON quran_progress(user_id, progress_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_user_subjects_user ON user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
