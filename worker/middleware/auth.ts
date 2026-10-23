// Web Crypto based password hashing (PBKDF2-SHA256, 100k iterations) + session helpers.
// Eslatma: Cloudflare Workers production runtime PBKDF2 uchun maksimal 100 000
// iteratsiyaga ruxsat beradi (yuqorisi "iteration counts above 100000 are not
// supported" xatosi bilan ishlamay qoladi), shuning uchun 100k ishlatamiz.

import type { D1Database } from "../db/client";

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function makeSalt(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return b64encode(b);
}

export async function hashPassword(password: string, saltB64: string): Promise<string> {
  const salt = b64decode(saltB64);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 100000 },
    key,
    256
  );
  return b64encode(bits);
}

export async function verifyPassword(password: string, saltB64: string, expectedB64: string): Promise<boolean> {
  try {
    const got = await hashPassword(password, saltB64);
    if (got.length !== expectedB64.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expectedB64.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const h = req.headers.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function sessionCookie(name: string, token: string, maxAgeSec: number, secure: boolean): string {
  const parts = [`${name}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSec}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(name: string, secure = false): string {
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function isSecureRequest(req: Request): boolean {
  const url = new URL(req.url);
  if (url.protocol === "https:") return true;
  const proto = req.headers.get("x-forwarded-proto");
  return proto === "https";
}

export interface TeacherRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  password_salt: string;
  full_name: string;
}

export interface StudentRow {
  id: string;
  full_name: string;
  student_code: string;
  group_id: string | null;
  level: string;
  status: string;
}

export async function getTeacher(req: Request, env: { DB: D1Database }): Promise<TeacherRow | null> {
  const cookies = parseCookies(req);
  const token = cookies["mdm_teacher"];
  if (!token) return null;
  const th = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT t.id, t.username, t.email, t.password_hash, t.password_salt, t.full_name FROM teacher_sessions s JOIN teachers t ON t.id = s.teacher_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(th, Math.floor(Date.now() / 1000)).first<TeacherRow>();
  return row ?? null;
}

export async function getStudent(req: Request, env: { DB: D1Database }): Promise<StudentRow | null> {
  const cookies = parseCookies(req);
  const token = cookies["mdm_student"];
  if (!token) return null;
  const th = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT s2.id, s2.full_name, s2.student_code, s2.group_id, s2.level, s2.status FROM student_sessions s JOIN students s2 ON s2.id = s.student_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(th, Math.floor(Date.now() / 1000)).first<StudentRow>();
  if (!row || row.status !== "active") return null;
  return row;
}
