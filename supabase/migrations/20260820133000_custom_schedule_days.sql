/*
  # Custom schedule days

  Adds `custom_days` (weekday indexes 0-6) so the wizard can apply one
  generated schedule to a user-picked subset of the week (e.g. Monday + Wednesday).

  Also maps leftover `manual` mode values to `custom`.
*/

ALTER TABLE schedule_preferences
  ADD COLUMN IF NOT EXISTS custom_days integer[] NOT NULL DEFAULT '{}';

UPDATE schedule_preferences
  SET schedule_mode = 'custom'
  WHERE schedule_mode = 'manual';
