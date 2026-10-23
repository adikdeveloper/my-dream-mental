-- MY DREAM MENTAL — initial schema (D1 / SQLite)
-- Timezone: dates stored as TEXT 'YYYY-MM-DD' in Asia/Tashkent by app logic, timestamps as INTEGER (unix seconds, UTC).

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'O''qituvchi',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Teacher sessions (server-side, HttpOnly cookie holds token id)
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_token ON teacher_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher ON teacher_sessions(teacher_id);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  student_code TEXT NOT NULL UNIQUE,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'BEGINNER',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_active_at INTEGER,
  total_active_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- Student sessions
CREATE TABLE IF NOT EXISTS student_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_student_sessions_token ON student_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id);

-- Sections (mental arithmetic topics, DB-driven)
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title_uz TEXT NOT NULL,
  description_uz TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'brain',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Levels
CREATE TABLE IF NOT EXISTS levels (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title_uz TEXT NOT NULL,
  min_number INTEGER NOT NULL DEFAULT 1,
  max_number INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Tests (teacher-configured)
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'EASY',
  question_count INTEGER NOT NULL DEFAULT 20,
  time_limit_seconds INTEGER NOT NULL DEFAULT 180,
  min_number INTEGER NOT NULL DEFAULT 1,
  max_number INTEGER NOT NULL DEFAULT 50,
  allowed_operations TEXT NOT NULL DEFAULT '["+"]',
  allow_back INTEGER NOT NULL DEFAULT 0,
  randomize INTEGER NOT NULL DEFAULT 1,
  daily_enabled INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tests_section ON tests(section_id);
CREATE INDEX IF NOT EXISTS idx_tests_active ON tests(is_active);

-- Test attempts
CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_id TEXT REFERENCES tests(id) ON DELETE SET NULL,
  section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'EASY',
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  avg_response_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  client_request_id TEXT UNIQUE,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  date_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_date ON test_attempts(date_key);
CREATE INDEX IF NOT EXISTS idx_attempts_student_date ON test_attempts(student_id, date_key);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON test_attempts(test_id);

-- Per-question history
CREATE TABLE IF NOT EXISTS test_questions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  operand_a INTEGER NOT NULL,
  operand_b INTEGER NOT NULL,
  operation TEXT NOT NULL,
  expected_answer INTEGER NOT NULL,
  student_answer INTEGER,
  is_correct INTEGER,
  response_time_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_questions_attempt ON test_questions(attempt_id);

-- Activity sessions (active-time tracking)
CREATE TABLE IF NOT EXISTS activity_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at INTEGER NOT NULL,
  date_key TEXT NOT NULL,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_student ON activity_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_sessions(date_key);
CREATE INDEX IF NOT EXISTS idx_activity_student_date ON activity_sessions(student_id, date_key);

-- Daily aggregated stats (recomputed incrementally)
CREATE TABLE IF NOT EXISTS daily_stats (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  total_tests INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  best_streak_day INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  UNIQUE(student_id, date_key)
);
CREATE INDEX IF NOT EXISTS idx_daily_student ON daily_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_stats(date_key);

-- Login attempts (basic brute-force protection log)
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  identifier TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_kind_id ON login_attempts(kind, identifier);
CREATE INDEX IF NOT EXISTS idx_login_created ON login_attempts(created_at);
