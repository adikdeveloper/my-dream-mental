// Pure mental-arithmetic engine. Shared logic shape mirrors src/lib/testMath.ts (frontend).
// Server is authoritative: answers are never sent to client before submit.

export type Op = "+" | "-" | "×" | "÷";

export interface GenConfig {
  allowedOperations: Op[];
  minNumber: number;
  maxNumber: number;
  questionCount: number;
}

export interface GenQuestion {
  order: number;
  text: string;
  a: number;
  b: number;
  op: Op;
  expected: number;
}

const FALLBACK_OPS: Op[] = ["+", "-"];

export function normalizeOps(input: unknown): Op[] {
  if (!Array.isArray(input)) return FALLBACK_OPS;
  const map: Record<string, Op> = { "+": "+", "-": "-", "−": "-", "*": "×", x: "×", "×": "×", "/": "÷", ":": "÷", "÷": "÷" };
  const out: Op[] = [];
  for (const raw of input) {
    const k = String(raw).trim();
    const op = map[k];
    if (op && !out.includes(op)) out.push(op);
  }
  return out.length ? out : FALLBACK_OPS;
}

function randInt(rng: () => number, min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function generateQuestions(cfg: GenConfig, rng: () => number = Math.random): GenQuestion[] {
  const ops = cfg.allowedOperations.length ? cfg.allowedOperations : FALLBACK_OPS;
  const count = Math.min(Math.max(1, cfg.questionCount), 100);
  const seen = new Set<string>();
  const out: GenQuestion[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 60) {
    guard++;
    const op = ops[randInt(rng, 0, ops.length - 1)];
    let a = 0, b = 0, expected = 0;
    if (op === "+") {
      a = randInt(rng, cfg.minNumber, cfg.maxNumber);
      b = randInt(rng, cfg.minNumber, cfg.maxNumber);
      expected = a + b;
    } else if (op === "-") {
      a = randInt(rng, cfg.minNumber, cfg.maxNumber);
      b = randInt(rng, cfg.minNumber, cfg.maxNumber);
      if (b > a) [a, b] = [b, a]; // default: no negatives
      expected = a - b;
    } else if (op === "×") {
      const hi = Math.min(cfg.maxNumber, 12);
      const lo = Math.max(cfg.minNumber <= 2 ? 2 : cfg.minNumber, 2);
      a = randInt(rng, Math.min(lo, hi), hi);
      b = randInt(rng, 2, Math.min(12, Math.max(12, cfg.maxNumber > 20 ? 12 : cfg.maxNumber)));
      if (cfg.maxNumber <= 20) { a = randInt(rng, 2, 9); b = randInt(rng, 2, 9); }
      expected = a * b;
    } else {
      // ÷ — always exact division
      const maxAns = Math.max(2, Math.min(12, cfg.maxNumber));
      b = randInt(rng, 2, maxAns);
      expected = randInt(rng, 2, maxAns);
      a = b * expected;
      if (a > Math.max(cfg.maxNumber, 20) * 2) {
        expected = randInt(rng, 2, 9);
        b = randInt(rng, 2, 9);
        a = b * expected;
      }
    }
    const key = `${a}${op}${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = op === "×" ? `${a} × ${b} = ?` : op === "÷" ? `${a} ÷ ${b} = ?` : `${a} ${op} ${b} = ?`;
    out.push({ order: out.length + 1, text, a, b, op, expected });
  }
  return out;
}

export function calcScore(correct: number, total: number): { accuracy: number; score: number } {
  if (total <= 0) return { accuracy: 0, score: 0 };
  const accuracy = Math.round((correct / total) * 1000) / 10;
  const bonus = accuracy >= 90 ? 50 : accuracy >= 70 ? 20 : 0;
  return { accuracy, score: correct * 10 + bonus };
}

// ---------- Umumiy reyting bali ----------
// Hamma ko'rsatkich hisobga olinadi: misollar, to'g'ri javoblar,
// yakunlangan testlar, aniqlik, faol vaqt, kunlik faollik.
export interface RatingInput {
  tests: number;
  questions: number;
  correct: number;
  accuracy: number;
  active_seconds: number;
  active_days: number;
}

export function calcLeaderboardPoints(r: RatingInput): number {
  const tests = Math.max(0, r.tests || 0);
  const questions = Math.max(0, r.questions || 0);
  const correct = Math.max(0, r.correct || 0);
  const accuracy = Math.min(100, Math.max(0, Math.round(r.accuracy || 0)));
  const activeMin = Math.floor(Math.max(0, r.active_seconds || 0) / 60);
  const days = Math.max(0, r.active_days || 0);
  return (
    questions * 1 +
    correct * 2 +
    tests * 5 +
    accuracy * 2 +
    activeMin * 1 +
    days * 10
  );
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} soniya`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} daqiqa ${r} soniya` : `${m} daqiqa`;
}

// ---------- Flash-anzan (chaqnash) rejimi ----------
// Sonlar birma-bir ko'rinib o'chadi; o'quvchi yig'indini miyada saqlaydi,
// oxirida bitta javob kiritadi. Oraliq yig'indi manfiy bo'lmaydi (bolalar uchun).

export interface FlashNumber {
  display: string; // ekranda ko'rinadigan: "12", "+7", "−5"
  value: number;   // yig'indiga qo'shiladigan (+7) yoki ayiriladigan (−5)
}

export interface FlashSequence {
  numbers: FlashNumber[];
  expected: number; // yakuniy yig'indi (serverda saqlanadi, clientga yuborilmaydi)
  expression: string; // DB uchun: "12 + 7 − 5 = ?"
}

export function generateFlashSequence(
  count: number,
  minNumber: number,
  maxNumber: number,
  allowMinus: boolean,
  rng: () => number = Math.random
): FlashSequence {
  const n = Math.min(Math.max(2, count), 30);
  const lo = Math.max(1, Math.min(minNumber, maxNumber));
  const hi = Math.max(lo, maxNumber);
  const numbers: FlashNumber[] = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = lo + Math.floor(rng() * (hi - lo + 1));
    if (i === 0) {
      total = v;
      numbers.push({ display: String(v), value: v });
      continue;
    }
    // Ayirish yig'indini manfiy qilmasin
    const canMinus = allowMinus && total - v >= 0 && rng() < 0.4;
    if (canMinus) {
      total -= v;
      numbers.push({ display: `-${v}`, value: -v });
    } else {
      total += v;
      numbers.push({ display: i === 0 ? String(v) : `+${v}`, value: v });
    }
  }
  const expression = numbers.map((x, i) => (i === 0 ? x.display : x.display)).join(" ") + " = ?";
  return { numbers, expected: total, expression };
}

export interface FlashOverrides {
  count: number;
  interval: number;
  minNumber: number;
  maxNumber: number;
  examples: number;
}

// Sozlash ekranidan kelgan qiymatlarni xavfsiz clamp'lash (server authoritative).
export function clampFlashOverrides(
  body: unknown,
  test: { flash_numbers: number; flash_interval_ms: number; min_number: number; max_number: number; question_count: number }
): FlashOverrides {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const clampInt = (v: unknown, dflt: number, lo: number, hi: number): number => {
    const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : dflt;
    return Math.min(hi, Math.max(lo, n));
  };
  const count = clampInt(b["flash_numbers"], test.flash_numbers || 5, 2, 30);
  const interval = clampInt(b["flash_interval_ms"], test.flash_interval_ms || 1000, 300, 5000);
  let minNumber = clampInt(b["min_number"], test.min_number, 1, 1000);
  let maxNumber = clampInt(b["max_number"], test.max_number, 1, 1000);
  if (minNumber > maxNumber) [minNumber, maxNumber] = [maxNumber, minNumber];
  const examples = clampInt(b["examples"], test.question_count || 10, 1, 100);
  return { count, interval, minNumber, maxNumber, examples };
}

// Resume uchun: eski expression matnidan ketma-ketlikni tiklash
// "12 +7 -5 = ?" ham, "12 + 7 - 5 = ?" ham → ["12", "+7", "-5"]
export function parseFlashExpression(expr: string): string[] {
  const toks = expr.replace("= ?", "").trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    if ((tk === "+" || tk === "-") && i + 1 < toks.length) {
      out.push(tk + toks[i + 1]);
      i++;
    } else {
      out.push(tk);
    }
  }
  return out;
}
