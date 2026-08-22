-- Journal extras on personal notes (subject_id is null for دفتر مذكراتي).

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS paper text NOT NULL DEFAULT 'cream',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_mood_check;
ALTER TABLE notes
  ADD CONSTRAINT notes_mood_check
  CHECK (mood IS NULL OR mood IN ('happy', 'calm', 'tired', 'proud', 'anxious', 'motivated'));

ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_paper_check;
ALTER TABLE notes
  ADD CONSTRAINT notes_paper_check
  CHECK (paper IN ('cream', 'sage', 'rose', 'sky', 'lavender', 'ink'));

CREATE INDEX IF NOT EXISTS notes_user_updated_idx ON notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_user_journal_idx ON notes (user_id) WHERE subject_id IS NULL;
