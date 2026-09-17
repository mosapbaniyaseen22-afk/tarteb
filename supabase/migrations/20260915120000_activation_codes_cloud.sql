-- Persistent activation codes for Netlify (admin generate + student activate).

CREATE TABLE IF NOT EXISTS activation_codes (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  duration_days integer NOT NULL DEFAULT 30,
  note text NOT NULL DEFAULT '',
  stored_status text NOT NULL DEFAULT 'unused'
    CHECK (stored_status IN ('unused', 'used', 'revoked')),
  used_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by_name text,
  used_by_email text,
  activated_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS activation_codes_status_idx ON activation_codes (stored_status);
CREATE UNIQUE INDEX IF NOT EXISTS activation_codes_code_norm_idx
  ON activation_codes (upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')));

ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_list_activation_codes(p_secret text)
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

  RETURN coalesce(
    (
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC)
      FROM activation_codes c
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_upsert_activation_code(p_secret text, p_item jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected text;
  next_id text;
  next_status text;
BEGIN
  SELECT value INTO expected FROM admin_config WHERE key = 'list_secret';
  IF p_secret IS NULL OR (
    p_secret IS DISTINCT FROM expected
    AND p_secret IS DISTINCT FROM 'labib-admin-local-session'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  next_id := coalesce(nullif(p_item->>'id', ''), gen_random_uuid()::text);
  next_status := coalesce(p_item->>'stored_status', p_item->>'storedStatus', 'unused');

  INSERT INTO activation_codes (
    id, code, created_at, duration_days, note, stored_status,
    used_by_user_id, used_by_name, used_by_email, activated_at, expires_at, revoked_at
  )
  VALUES (
    next_id,
    coalesce(p_item->>'code', ''),
    coalesce((p_item->>'created_at')::timestamptz, (p_item->>'createdAt')::timestamptz, now()),
    coalesce((p_item->>'duration_days')::int, (p_item->>'durationDays')::int, 30),
    coalesce(p_item->>'note', ''),
    next_status,
    nullif(coalesce(p_item->>'used_by_user_id', p_item->>'usedByUserId'), '')::uuid,
    nullif(coalesce(p_item->>'used_by_name', p_item->>'usedByName'), ''),
    nullif(coalesce(p_item->>'used_by_email', p_item->>'usedByEmail'), ''),
    coalesce((p_item->>'activated_at')::timestamptz, (p_item->>'activatedAt')::timestamptz),
    coalesce((p_item->>'expires_at')::timestamptz, (p_item->>'expiresAt')::timestamptz),
    coalesce((p_item->>'revoked_at')::timestamptz, (p_item->>'revokedAt')::timestamptz)
  )
  ON CONFLICT (id) DO UPDATE SET
    code = excluded.code,
    duration_days = excluded.duration_days,
    note = excluded.note,
    stored_status = excluded.stored_status,
    used_by_user_id = excluded.used_by_user_id,
    used_by_name = excluded.used_by_name,
    used_by_email = excluded.used_by_email,
    activated_at = excluded.activated_at,
    expires_at = excluded.expires_at,
    revoked_at = excluded.revoked_at;

  IF next_status = 'revoked' THEN
    UPDATE app_subscriptions
    SET expires_at = now()
    WHERE code_id = next_id AND expires_at > now();
  END IF;

  RETURN to_jsonb((SELECT c FROM activation_codes c WHERE c.id = next_id));
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_activation_code(p_secret text, p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected text;
  rec activation_codes%ROWTYPE;
BEGIN
  SELECT value INTO expected FROM admin_config WHERE key = 'list_secret';
  IF p_secret IS NULL OR (
    p_secret IS DISTINCT FROM expected
    AND p_secret IS DISTINCT FROM 'labib-admin-local-session'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO rec FROM activation_codes WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الكود غير موجود');
  END IF;
  IF rec.stored_status <> 'unused' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'يمكن حذف الأكواد غير المستخدمة فقط. ألغِ الكود بدل الحذف.');
  END IF;

  DELETE FROM activation_codes WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION activate_labib_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  rec activation_codes%ROWTYPE;
  now_ts timestamptz := now();
  base_ts timestamptz;
  new_exp timestamptz;
  uname text;
  uemail text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;
  IF length(normalized) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'أدخل كود التفعيل');
  END IF;

  SELECT * INTO rec
  FROM activation_codes
  WHERE upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = normalized
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'كود التفعيل غير صحيح');
  END IF;
  IF rec.stored_status = 'revoked' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'هذا الكود ملغى');
  END IF;
  IF rec.stored_status = 'used' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'هذا الكود مستخدم مسبقاً');
  END IF;

  SELECT coalesce(u.email, ''),
         coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(u.email, ''), '@', 1), 'طالب')
  INTO uemail, uname
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = uid;

  SELECT expires_at INTO base_ts FROM app_subscriptions WHERE user_id = uid;
  IF base_ts IS NULL OR base_ts <= now_ts THEN
    base_ts := now_ts;
  END IF;
  new_exp := base_ts + make_interval(days => coalesce(rec.duration_days, 30));

  UPDATE activation_codes SET
    stored_status = 'used',
    used_by_user_id = uid,
    used_by_name = uname,
    used_by_email = uemail,
    activated_at = now_ts,
    expires_at = new_exp
  WHERE id = rec.id;

  INSERT INTO app_subscriptions (user_id, name, email, code_id, code, activated_at, expires_at)
  VALUES (uid, coalesce(uname, 'طالب'), coalesce(uemail, ''), rec.id, rec.code, now_ts, new_exp)
  ON CONFLICT (user_id) DO UPDATE SET
    name = excluded.name,
    email = excluded.email,
    code_id = excluded.code_id,
    code = excluded.code,
    activated_at = excluded.activated_at,
    expires_at = excluded.expires_at;

  RETURN jsonb_build_object(
    'ok', true,
    'subscription', jsonb_build_object(
      'userId', uid::text,
      'name', coalesce(uname, 'طالب'),
      'email', coalesce(uemail, ''),
      'codeId', rec.id,
      'code', rec.code,
      'activatedAt', now_ts,
      'expiresAt', new_exp
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_list_activation_codes(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_upsert_activation_code(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_delete_activation_code(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION activate_labib_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_list_activation_codes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_upsert_activation_code(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_activation_code(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_labib_code(text) TO authenticated;
