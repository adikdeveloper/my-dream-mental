import { z } from "zod";

export const teacherLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const studentLoginSchema = z.object({
  code: z.string().min(3).max(20),
});

export const studentCreateSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  group_id: z.string().min(1).max(64).nullable().optional(),
  level: z.enum(["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"]).default("BEGINNER"),
});

export const studentUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(80).optional(),
  group_id: z.string().max(64).nullable().optional(),
  level: z.enum(["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const groupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().max(300).default(""),
});

const KNOWN_OPS = new Set(["+", "-", "−", "*", "x", "×", "/", ":", "÷"]);

export const testSchema = z.object({
  name: z.string().trim().min(3).max(100),
  section_id: z.string().min(1).max(64).nullable().optional(),
  difficulty: z.enum(["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"]).default("EASY"),
  question_count: z.number().int().min(1).max(100).default(10),
  time_limit_seconds: z.number().int().min(30).max(3600).default(180),
  min_number: z.number().int().min(1).max(1000).default(1),
  max_number: z.number().int().min(2).max(1000).default(50),
  allowed_operations: z.array(z.string().min(1).max(3)).min(1).max(4).default(["+"])
    .refine((arr) => arr.every((s) => KNOWN_OPS.has(s.trim())), { message: "Noma'lum amal." }),
  allow_back: z.number().int().min(0).max(1).default(0),
  randomize: z.number().int().min(0).max(1).default(1),
  daily_enabled: z.number().int().min(0).max(1).default(1),
  is_active: z.number().int().min(0).max(1).default(1),
  mode: z.enum(["standard", "flash"]).default("standard"),
  flash_numbers: z.number().int().min(2).max(30).default(5),
  flash_interval_ms: z.number().int().min(300).max(5000).default(1000),
});

export const submitSchema = z.object({
  attempt_id: z.string().min(1).max(64),
  answers: z.array(z.object({
    question_order: z.number().int().min(1).max(100),
    answer: z.number().int().nullable(),
    response_time_ms: z.number().int().min(0).max(3600000).default(0),
  })).min(1).max(100),
  duration_seconds: z.number().int().min(0).max(3600).default(0),
  client_request_id: z.string().max(64).optional(),
});

export const heartbeatSchema = z.object({
  active_seconds: z.number().int().min(1).max(120).default(20),
  session_id: z.string().max(64).optional(),
});

export const passwordChangeSchema = z.object({
  current: z.string().min(1).max(200),
  password: z.string().min(6).max(200),
});
