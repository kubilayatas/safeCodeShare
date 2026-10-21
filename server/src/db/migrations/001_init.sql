-- Başlangıç şeması
-- Zaman damgaları milisaniye cinsinden INTEGER (Date.now())

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher')),
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  view_token TEXT NOT NULL UNIQUE,
  page_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_courses_owner ON courses(owner_id, sort_order);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_topics_course ON topics(course_id, sort_order);

CREATE TABLE pads (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'plaintext',
  sort_order INTEGER NOT NULL DEFAULT 0,
  edit_token TEXT NOT NULL UNIQUE,
  view_token TEXT NOT NULL UNIQUE,
  edit_enabled INTEGER NOT NULL DEFAULT 0,
  view_enabled INTEGER NOT NULL DEFAULT 1,
  visible_in_course INTEGER NOT NULL DEFAULT 1,
  visible_from INTEGER,
  expires_at INTEGER,
  password_hash TEXT,
  ydoc BLOB,
  content_text TEXT NOT NULL DEFAULT '',
  line_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_pads_owner ON pads(owner_id);
CREATE INDEX idx_pads_course ON pads(course_id, topic_id, sort_order);

CREATE TABLE pad_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pad_id TEXT NOT NULL REFERENCES pads(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  ydoc BLOB NOT NULL,
  language TEXT NOT NULL,
  label TEXT,
  is_auto INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_versions_pad ON pad_versions(pad_id, created_at DESC);