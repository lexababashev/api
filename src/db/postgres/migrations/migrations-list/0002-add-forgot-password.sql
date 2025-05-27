CREATE TABLE IF NOT EXISTS forgot_password (
  id TEXT PRIMARY KEY DEFAULT get_random_string(10),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forgot_password_code ON forgot_password(code);