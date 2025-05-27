CREATE TABLE IF NOT EXISTS compiled_uploads (
  id TEXT PRIMARY KEY DEFAULT get_random_string(10),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compiled_uploads_event_id ON compiled_uploads(event_id);