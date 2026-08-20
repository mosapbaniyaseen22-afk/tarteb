/*
  # Routine weekdays for school and center

  School and center attendance is not every day. Store weekday indexes
  (0=Sunday … 6=Saturday) so the generator only places those blocks
  on the selected days.
*/

ALTER TABLE user_routines
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}';
