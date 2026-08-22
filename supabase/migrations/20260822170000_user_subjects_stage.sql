/*
  Keep first-year and second-year subjects on the same account.
  Active year stays on profiles.stage.
*/

ALTER TABLE user_subjects
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'tawjihi_first';

UPDATE user_subjects AS us
SET stage = CASE
  WHEN p.stage IN ('tawjihi_second', 'second_year') THEN 'tawjihi_second'
  ELSE 'tawjihi_first'
END
FROM profiles AS p
WHERE p.id = us.user_id;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.user_subjects'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%(user_id, subject_id)%'
    AND pg_get_constraintdef(oid) NOT LIKE '%stage%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_subjects DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_subjects_user_subject_stage_key
  ON user_subjects (user_id, subject_id, stage);
