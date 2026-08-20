/*
# Scheduling Wizard — schema additions

## Summary
Adds the tables/columns needed by the 4-step scheduling wizard
(نوابتي / مهامي / ملاحظاتي / طريقة الجدول):

1. `tasks.duration_minutes` — estimated duration entered in the wizard
   (tasks created here have no fixed start/end time; the generator assigns one).
2. `schedule_entries.task_id` / `schedule_entries.completed` — links a generated
   block back to its source task and tracks completion for daily stats.
3. `user_routines` — fixed daily commitments (نوابت) like sleep/school/center/sport.
4. `schedule_preferences` — per-user wizard defaults: wake/sleep time, notes,
   schedule mode ('same' | 'different' | 'manual'), and the break toggle.

## Security
- RLS enabled on the two new tables, owner-scoped policies using auth.uid(),
  matching the existing pattern from `tasks` / `schedule_entries`.
*/

-- TASKS: estimated duration for wizard-created tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- SCHEDULE ENTRIES: link back to source task + completion tracking
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- USER ROUTINES (نوابت)
CREATE TABLE IF NOT EXISTS user_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'sleep', -- 'sleep' | 'school' | 'center' | 'sport' | 'custom'
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_routines" ON user_routines;
CREATE POLICY "select_own_routines" ON user_routines FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_routines" ON user_routines;
CREATE POLICY "insert_own_routines" ON user_routines FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_routines" ON user_routines;
CREATE POLICY "update_own_routines" ON user_routines FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_routines" ON user_routines;
CREATE POLICY "delete_own_routines" ON user_routines FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SCHEDULE PREFERENCES (wizard defaults, one row per user)
CREATE TABLE IF NOT EXISTS schedule_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  wake_time time NOT NULL DEFAULT '06:30',
  sleep_time time NOT NULL DEFAULT '22:30',
  notes text NOT NULL DEFAULT '',
  schedule_mode text NOT NULL DEFAULT 'different', -- 'same' | 'different' | 'manual'
  break_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE schedule_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_schedule_prefs" ON schedule_preferences;
CREATE POLICY "select_own_schedule_prefs" ON schedule_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_schedule_prefs" ON schedule_preferences;
CREATE POLICY "insert_own_schedule_prefs" ON schedule_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_schedule_prefs" ON schedule_preferences;
CREATE POLICY "update_own_schedule_prefs" ON schedule_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_schedule_prefs" ON schedule_preferences;
CREATE POLICY "delete_own_schedule_prefs" ON schedule_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_routines_user ON user_routines(user_id);
