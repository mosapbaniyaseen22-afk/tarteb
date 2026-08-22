-- Presence + subscriptions for admin user lists (Netlify-safe).

CREATE TABLE IF NOT EXISTS app_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'طالب',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  stage text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  logged_out_at timestamptz
);

ALTER TABLE app_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presence_self_select ON app_presence;
CREATE POLICY presence_self_select ON app_presence FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS presence_self_insert ON app_presence;
CREATE POLICY presence_self_insert ON app_presence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS presence_self_update ON app_presence;
CREATE POLICY presence_self_update ON app_presence FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS app_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  code_id text,
  code text,
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE app_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_self_select ON app_subscriptions;
CREATE POLICY subscription_self_select ON app_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS subscription_self_insert ON app_subscriptions;
CREATE POLICY subscription_self_insert ON app_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS subscription_self_update ON app_subscriptions;
CREATE POLICY subscription_self_update ON app_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS admin_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

INSERT INTO admin_config (key, value)
VALUES ('list_secret', 'labib-admin-local-session')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION admin_list_app_users(p_secret text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected text;
BEGIN
  SELECT value INTO expected FROM admin_config WHERE key = 'list_secret';
  IF p_secret IS NULL OR (
    p_secret IS DISTINCT FROM expected
    AND p_secret IS DISTINCT FROM 'labib-admin-local-session'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.last_seen_at DESC NULLS LAST), '[]'::jsonb)
    FROM (
      SELECT
        u.id::text AS id,
        coalesce(nullif(trim(p.full_name), ''), nullif(trim(pr.name), ''), split_part(coalesce(u.email, ''), '@', 1), 'طالب') AS name,
        coalesce(u.email, pr.email, '') AS email,
        coalesce(p.avatar_url, pr.avatar_url) AS avatar_url,
        coalesce(p.stage, pr.stage) AS stage,
        coalesce(pr.first_seen_at, p.created_at, u.created_at)::text AS first_seen_at,
        coalesce(pr.last_seen_at, p.updated_at, u.created_at)::text AS last_seen_at,
        pr.logged_out_at::text AS logged_out_at,
        (s.expires_at IS NOT NULL AND s.expires_at > now()) AS subscribed,
        s.expires_at::text AS subscription_expires_at
      FROM auth.users u
      LEFT JOIN profiles p ON p.id = u.id
      LEFT JOIN app_presence pr ON pr.user_id = u.id
      LEFT JOIN app_subscriptions s ON s.user_id = u.id
      WHERE coalesce(u.email, '') <> ''
    ) x
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_list_app_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_app_users(text) TO anon, authenticated;
