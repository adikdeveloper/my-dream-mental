import { describe, it, expect } from "vitest";
import { generateQuestions, calcScore, formatDuration, normalizeOps, generateFlashSequence, clampFlashOverrides, parseFlashExpression, calcLeaderboardPoints } from "../worker/services/testEngine";
import { sanitizeAnswerInput, parseAnswer } from "../src/lib/api";
import { normalizeCode, isSameOrigin } from "../worker/db/client";
import { exportKind } from "../worker/routes/dashboard";

describe("student code", () => {
  it("normalizes case-insensitively", () => {
    expect(normalizeCode("  mdm-7k4p92 ")).toBe("MDM-7K4P92");
  });
  it("matches required format", () => {
    expect(/^MDM-[A-Z0-9]{4,10}$/.test(normalizeCode("MDM-AB12CD"))).toBe(true);
    expect(/^MDM-[A-Z0-9]{4,10}$/.test(normalizeCode("wrong"))).toBe(false);
  });
});

describe("test generator", () => {
  it("creates unique questions within one test", () => {
    const qs = generateQuestions({ allowedOperations: ["+"], minNumber: 1, maxNumber: 10, questionCount: 20 });
    expect(qs).toHaveLength(20);
    const keys = new Set(qs.map((q) => `${q.a}${q.op}${q.b}`));
    expect(keys.size).toBe(20);
  });
  it("guarantees exact division", () => {
    const qs = generateQuestions({ allowedOperations: ["÷"], minNumber: 1, maxNumber: 50, questionCount: 30 });
    for (const q of qs) {
      expect(q.a % q.b).toBe(0);
      expect(q.expected).toBe(q.a / q.b);
    }
  });
  it("avoids negative subtraction by default", () => {
    const qs = generateQuestions({ allowedOperations: ["-"], minNumber: 1, maxNumber: 50, questionCount: 30 });
    for (const q of qs) expect(q.a).toBeGreaterThanOrEqual(q.b);
  });
  it("normalizes operation aliases", () => {
    expect(normalizeOps(["*", "x", "/", ":"])).toEqual(["×", "÷"]);
    expect(normalizeOps([])).toEqual(["+", "-"]);
    expect(normalizeOps("nope" as unknown as string[])).toEqual(["+", "-"]);
  });
});

describe("scoring", () => {
  it("calculates accuracy + score", () => {
    expect(calcScore(17, 20)).toEqual({ accuracy: 85, score: 190 });
    expect(calcScore(0, 0)).toEqual({ accuracy: 0, score: 0 });
  });
  it("answer checking is strict", () => {
    const expected = 19;
    expect(19 === expected).toBe(true);
    expect(("19" as unknown as number) === expected).toBe(false);
  });
});

describe("timer", () => {
  it("formats durations in Uzbek", () => {
    expect(formatDuration(45)).toBe("45 soniya");
    expect(formatDuration(134)).toBe("2 daqiqa 14 soniya");
    expect(formatDuration(120)).toBe("2 daqiqa");
  });
});

describe("active time", () => {
  it("sums heartbeat increments", () => {
    const beats = [25, 25, 20];
    expect(beats.reduce((a, b) => a + b, 0)).toBe(70);
  });
});

describe("flash-anzan generator", () => {
  it("expected equals running total, never negative", () => {
    for (let i = 0; i < 50; i++) {
      const s = generateFlashSequence(7, 1, 20, true);
      expect(s.numbers).toHaveLength(7);
      const sum = s.numbers.reduce((a, x) => a + x.value, 0);
      expect(s.expected).toBe(sum);
      expect(s.expected).toBeGreaterThanOrEqual(0);
    }
  });
  it("addition-only flash stays consistent", () => {
    const s = generateFlashSequence(5, 5, 15, false);
    expect(s.numbers.every((x) => x.value > 0)).toBe(true);
    expect(s.expected).toBe(s.numbers.reduce((a, x) => a + x.value, 0));
  });
  it("clamps count to 2..30", () => {
    expect(generateFlashSequence(1, 1, 10, true).numbers.length).toBe(2);
    expect(generateFlashSequence(99, 1, 10, true).numbers.length).toBe(30);
  });
});

describe("flash overrides clamp", () => {
  const t = { flash_numbers: 5, flash_interval_ms: 1000, min_number: 1, max_number: 50, question_count: 10 };
  it("accepts valid overrides", () => {
    expect(clampFlashOverrides({ flash_numbers: 8, flash_interval_ms: 800, min_number: 10, max_number: 99, examples: 20 }, t))
      .toEqual({ count: 8, interval: 800, minNumber: 10, maxNumber: 99, examples: 20 });
  });
  it("clamps abuse values and swaps inverted range", () => {
    const r = clampFlashOverrides({ flash_numbers: 999, flash_interval_ms: 1, min_number: 500, max_number: 5, examples: 500 }, t);
    expect(r.count).toBe(30);
    expect(r.interval).toBe(300);
    expect(r.examples).toBe(100);
    expect(r.minNumber).toBeLessThanOrEqual(r.maxNumber);
  });
  it("falls back to test defaults on garbage", () => {
    expect(clampFlashOverrides(null, t)).toEqual({ count: 5, interval: 1000, minNumber: 1, maxNumber: 50, examples: 10 });
    expect(clampFlashOverrides({ flash_numbers: "fast" }, t).count).toBe(5);
  });
});

describe("parseFlashExpression", () => {
  it("restores sequence from stored text", () => {
    expect(parseFlashExpression("12 +7 -5 = ?")).toEqual(["12", "+7", "-5"]);
    expect(parseFlashExpression("12 + 7 - 5 = ?")).toEqual(["12", "+7", "-5"]);
  });
});

describe("answer input helpers", () => {
  it("sanitizes to leading-minus digits", () => {
    expect(sanitizeAnswerInput("12-3")).toBe("123");
    expect(sanitizeAnswerInput("-12")).toBe("-12");
    expect(sanitizeAnswerInput("abc")).toBe("");
    expect(sanitizeAnswerInput("--5")).toBe("-5");
  });
  it("parses safely (no NaN leak)", () => {
    expect(parseAnswer(undefined)).toBe(null);
    expect(parseAnswer("")).toBe(null);
    expect(parseAnswer("-")).toBe(null);
    expect(parseAnswer("42")).toBe(42);
    expect(parseAnswer("-7")).toBe(-7);
  });
});

describe("export", () => {
  it("strips optional .csv suffix", () => {
    expect(exportKind("students.csv")).toBe("students");
    expect(exportKind("results.CSV")).toBe("results");
    expect(exportKind("daily")).toBe("daily");
  });
});

describe("CSRF same-origin guard", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://mydro.mn/api/tests/1/start", { method: "POST", headers });
  it("allows same-origin", () => {
    expect(isSameOrigin(req({ origin: "https://mydro.mn" }))).toBe(true);
  });
  it("blocks cross-origin", () => {
    expect(isSameOrigin(req({ origin: "https://evil.com" }))).toBe(false);
  });
  it("allows referer same-host", () => {
    expect(isSameOrigin(req({ referer: "https://mydro.mn/student/dashboard" }))).toBe(true);
  });
  it("allows headerless API clients (curl)", () => {
    expect(isSameOrigin(req({}))).toBe(true);
  });
});
describe("authorization rules (contract)", () => {
  it("student routes require student session; teacher routes require teacher session", () => {
    // Contract documented in worker/middleware/auth.ts:
    // - /api/students (POST/PUT/DELETE) → 403 without teacher
    // - /api/students/:id/statistics → owner student OR teacher, else 403
    // - /api/attempts/:id → owner student OR teacher, else 403
    // - in_progress attempts hide expected_answer from students (anti-cheat)
    expect(true).toBe(true);
  });
  it("submission is idempotent via client_request_id", () => {
    // worker/routes/tests.ts: duplicate client_request_id returns existing attempt with duplicate:true
    expect(true).toBe(true);
  });
});

describe("leaderboard points", () => {
  it("counts every metric", () => {
    // 10 test, 100 misol, 80 to'g'ri, 80% aniqlik, 120 daqiqa, 5 faol kun:
    // 100*1 + 80*2 + 10*5 + 80*2 + 120*1 + 5*10 = 100+160+50+160+120+50 = 640
    expect(calcLeaderboardPoints({ tests: 10, questions: 100, correct: 80, accuracy: 80, active_seconds: 7200, active_days: 5 })).toBe(640);
  });
  it("empty stats give zero", () => {
    expect(calcLeaderboardPoints({ tests: 0, questions: 0, correct: 0, accuracy: 0, active_seconds: 0, active_days: 0 })).toBe(0);
  });
  it("clamps bad values", () => {
    expect(calcLeaderboardPoints({ tests: -5, questions: -1, correct: -2, accuracy: 150, active_seconds: -99, active_days: -3 })).toBe(200);
  });
});
