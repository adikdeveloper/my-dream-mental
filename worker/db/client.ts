// Minimal structural D1 types (avoid hard dependency on a specific workers-types version).
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
}
export interface D1RunMeta {
  changes?: number;
}
export interface D1Prepared {
  bind(...values: unknown[]): D1Prepared;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ meta: D1RunMeta }>;
}
export interface D1Database {
  prepare(query: string): D1Prepared;
  batch(statements: D1Prepared[]): Promise<unknown[]>;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fetcher = { fetch: (req: RequestInfo | URL, init?: RequestInit) => Promise<Response> };

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_TIMEZONE?: string;
  SESSION_SECRET?: string;
  APP_NAME?: string;
}

export function tashkentDateKey(nowMs: number = Date.now()): string {
  // Asia/Tashkent = UTC+5, no DST. Fixed offset is safe.
  const d = new Date(nowMs + 5 * 3600_000);
  return d.toISOString().slice(0, 10);
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try { return crypto.randomUUID(); } catch { /* fallthrough */ }
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function err(code: string, message: string, status = 400): Response {
  return json({ ok: false, error: { code, message } }, status);
}

export function ok<T>(data: T, status = 200): Response {
  return json({ ok: true, data }, status);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateStudentCode(): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return `MDM-${s}`;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function safeJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const j = (await req.json()) as Record<string, unknown>;
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Pragmatic CSRF guard for cookie-authenticated mutations.
// Browsers always send Origin on fetch POST/PUT/DELETE; curl/API clients send none (allowed).
// Returns true if the request is safe to process.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (!origin && !referer) return true;
  try {
    const reqHost = new URL(req.url).host;
    if (origin && new URL(origin).host === reqHost) return true;
    if (referer && new URL(referer).host === reqHost) return true;
    return false;
  } catch {
    return false;
  }
}
