CREATE OR REPLACE FUNCTION get_random_string(
  IN string_length INTEGER,
  IN possible_chars TEXT DEFAULT '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
output TEXT = '';
i INT4;
pos INT4;
BEGIN
FOR i IN 1..string_length LOOP
    pos := 1 + CAST( random() * ( LENGTH(possible_chars) - 1) AS INT4 );
    output := output || substr(possible_chars, pos, 1);
END LOOP;
RETURN output;
END;
$$;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY DEFAULT get_random_string(10),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT get_random_string(10),
  owner_id TEXT REFERENCES users(id),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS invitees (
  id text DEFAULT get_random_string(10) PRIMARY KEY,
  event_id text REFERENCES events(id),
  name text NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitee_uploads (
  id TEXT PRIMARY KEY DEFAULT get_random_string(10),
  event_id TEXT REFERENCES events(id),
  invitee_id TEXT REFERENCES invitees(id),
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);