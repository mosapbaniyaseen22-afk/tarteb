INSERT INTO subjects (name, name_ar, stage, field, color, icon)
SELECT 'mathematics_eng', 'الرياضيات', 'tawjihi_second', 'engineering', '#2563EB', 'Calculator'
WHERE NOT EXISTS (
  SELECT 1
  FROM subjects
  WHERE name = 'mathematics_eng'
     OR (name_ar = 'الرياضيات' AND stage = 'tawjihi_second' AND field = 'engineering')
);
