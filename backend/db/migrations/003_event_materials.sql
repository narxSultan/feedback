CREATE TABLE IF NOT EXISTS event_materials (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploader_type VARCHAR(20) NOT NULL CHECK (uploader_type IN ('admin', 'user')),
  uploader_id INTEGER,
  original_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
