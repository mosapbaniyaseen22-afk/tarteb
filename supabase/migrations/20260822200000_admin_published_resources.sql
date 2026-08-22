-- Published study content for students (Netlify-safe).

CREATE TABLE IF NOT EXISTS admin_resources (
  id text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject_name text NOT NULL DEFAULT 'الكل',
  exam_year integer,
  stage text NOT NULL DEFAULT 'tawjihi_first',
  file_name text,
  file_mime text,
  file_path text,
  file_url text,
  external_url text,
  extracted_text text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_classified boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_resources_stage_type_idx ON admin_resources (stage, type);
CREATE INDEX IF NOT EXISTS admin_resources_created_idx ON admin_resources (created_at DESC);

ALTER TABLE admin_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_resources_public_read ON admin_resources;
CREATE POLICY admin_resources_public_read ON admin_resources
  FOR SELECT TO anon, authenticated
  USING (published IS TRUE);
