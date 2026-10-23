export type Role = "teacher" | "student";

export interface Teacher {
  id: string;
  username: string;
  email: string;
  full_name: string;
}

export interface Student {
  id: string;
  full_name: string;
  student_code: string;
  group_id: string | null;
  group_name?: string | null;
  level: string;
  status: string;
  created_at?: number;
  last_active_at?: number | null;
  total_active_seconds?: number;
  today_tests?: number;
  today_questions?: number;
  today_accuracy?: number;
  today_active?: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  student_count?: number;
}

export interface Section {
  id: string;
  key: string;
  title_uz: string;
  description_uz: string;
  icon: string;
}

export interface Level {
  key: string;
  title_uz: string;
  min_number: number;
  max_number: number;
}

export interface TestItem {
  id: string;
  name: string;
  section_id: string | null;
  section_title?: string;
  section_key?: string;
  difficulty: string;
  question_count: number;
  time_limit_seconds: number;
  min_number: number;
  max_number: number;
  allowed_operations: string;
  allow_back: number;
  randomize?: number;
  daily_enabled?: number;
  mode?: string;
  flash_numbers?: number;
  flash_interval_ms?: number;
  is_active: number;
}

export interface Attempt {
  id: string;
  test_name: string;
  difficulty: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  accuracy: number;
  score: number;
  duration_seconds: number;
  date_key: string;
  created_at: number;
  student_name?: string;
  student_code?: string;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}
