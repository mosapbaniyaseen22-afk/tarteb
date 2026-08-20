/*
  # Weekly schedule templates

  Repeated (`same`) and custom-day (`custom`) schedules are stored as a
  weekday template (0=Sunday … 6=Saturday). Future weeks reuse the same
  Saturday/Sunday/… blocks. The per-day (`different`) mode is not saved
  as a template.
*/

CREATE TABLE IF NOT EXISTS schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  activity text NOT NULL,
  activity_type text NOT NULL,
  subject_name text,
  color text NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  sort_index integer NOT NULL DEFAULT 0
);

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_schedule_templates" ON schedule_templates;
CREATE POLICY "select_own_schedule_templates" ON schedule_templates FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_schedule_templates" ON schedule_templates;
CREATE POLICY "insert_own_schedule_templates" ON schedule_templates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_schedule_templates" ON schedule_templates;
CREATE POLICY "update_own_schedule_templates" ON schedule_templates FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_schedule_templates" ON schedule_templates;
CREATE POLICY "delete_own_schedule_templates" ON schedule_templates FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_weekday
  ON schedule_templates(user_id, weekday);
