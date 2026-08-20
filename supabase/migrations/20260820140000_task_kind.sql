/*
  # Task kinds for flexible placement

  Tasks like sport/quran/study only store a duration. The generator
  places them into free gaps around fixed routines.
*/

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'study';
