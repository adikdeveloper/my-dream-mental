-- Performance indekslar: tez-tez ishlatiladigan filter/sort ustunlari
CREATE INDEX IF NOT EXISTS idx_attempts_student_status_started ON test_attempts(student_id, status, started_at);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON test_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_student_started ON activity_sessions(student_id, started_at);
CREATE INDEX IF NOT EXISTS idx_daily_student_date ON daily_stats(student_id, date_key);
CREATE INDEX IF NOT EXISTS idx_tests_created ON tests(created_at);
CREATE INDEX IF NOT EXISTS idx_students_created ON students(created_at);
