import type { Env } from "../db/client";
import { err, ok, safeJson, clientIp, nowSec } from "../db/client";
import { sha256Hex, randomToken, verifyPassword, getTeacher, getStudent, sessionCookie, clearCookie, isSecureRequest, parseCookies, hashPassword, makeSalt } from "../middleware/auth";
import { teacherLoginSchema, studentLoginSchema, passwordChangeSchema } from "../db/validate";
import { normalizeCode } from "../db/client";
import { checkRate } from "../middleware/rateLimit";
import { uid } from "../db/client";

// Housekeeping: drop expired sessions + old audit rows (fire-and-forget).
function cleanup(env: Env): void {
  const week = nowSec() - 7 * 24 * 3600;
  env.DB.prepare("DELETE FROM teacher_sessions WHERE expires_at < ?").bind(nowSec()).run().catch(() => {});
  env.DB.prepare("DELETE FROM student_sessions WHERE expires_at < ?").bind(nowSec()).run().catch(() => {});
  env.DB.prepare("DELETE FROM login_attempts WHERE created_at < ?").bind(week).run().catch(() => {});
}

// Separated to allow cookie headers cleanly
export async function routeAuth(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const secure = isSecureRequest(req);

  if (req.method === "POST" && path === "/api/auth/teacher/login") {
    const ip = clientIp(req);
    const rl = checkRate(`tlogin:${ip}`, 10, 60);
    if (!rl.allowed) return err("RATE_LIMIT", "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.", 429);
    const body = await safeJson(req);
    const parsed = teacherLoginSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Login yoki parol noto'g'ri.", 400);
    const row = await env.DB.prepare(
      "SELECT id, username, email, password_hash, password_salt, full_name FROM teachers WHERE username = ? OR email = ?"
    ).bind(parsed.data.username, parsed.data.username).first<{ id: string; username: string; email: string; password_hash: string; password_salt: string; full_name: string }>();
    if (!row) {
      // Timing oracle himoyasi: foydalanuvchi topilmasa ham dummy hash hisoblab vaqtni tekislaymiz
      await verifyPassword(parsed.data.password, "AAAAAAAAAAAAAAAAAAAAAA==", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=").catch(() => {});
      await env.DB.prepare("INSERT INTO login_attempts (kind, identifier, ip, success, created_at) VALUES ('teacher', ?, ?, 0, ?)").bind(parsed.data.username.slice(0, 100), ip, nowSec()).run().catch(() => {});
      return err("AUTH", "Login yoki parol noto'g'ri.", 401);
    }
    const good = await verifyPassword(parsed.data.password, row.password_salt, row.password_hash);
    await env.DB.prepare("INSERT INTO login_attempts (kind, identifier, ip, success, created_at) VALUES ('teacher', ?, ?, ?, ?)").bind(row.username, ip, good ? 1 : 0, nowSec()).run().catch(() => {});
    if (!good) return err("AUTH", "Login yoki parol noto'g'ri.", 401);
    const token = randomToken();
    const th = await sha256Hex(token);
    await env.DB.prepare("INSERT INTO teacher_sessions (id, teacher_id, token_hash, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uid(), row.id, th, nowSec(), nowSec() + 7 * 24 * 3600, ip, req.headers.get("user-agent") || "").run();
    cleanup(env);
    const res = ok({ teacher: { id: row.id, username: row.username, email: row.email, full_name: row.full_name } });
    res.headers.set("Set-Cookie", sessionCookie("mdm_teacher", token, 7 * 24 * 3600, secure));
    return res;
  }

  if (req.method === "POST" && path === "/api/auth/teacher/logout") {
    const c = parseCookies(req);
    if (c["mdm_teacher"]) {
      const th = await sha256Hex(c["mdm_teacher"]);
      await env.DB.prepare("DELETE FROM teacher_sessions WHERE token_hash = ?").bind(th).run().catch(() => {});
    }
    const res = ok({ message: "Chiqildi" });
    res.headers.set("Set-Cookie", clearCookie("mdm_teacher", secure));
    return res;
  }

  if (req.method === "GET" && path === "/api/auth/me") {
    const t = await getTeacher(req, env);
    // Login qilinmagan holat — kutilgan holat, 401 emas 200 qaytaramiz
    // (brauzer console'da "Failed to load resource 401" shovqin bo'lmasligi uchun).
    if (!t) return ok({ role: null, teacher: null });
    return ok({ role: "teacher", teacher: { id: t.id, username: t.username, email: t.email, full_name: t.full_name } });
  }

  if (req.method === "POST" && path === "/api/student/login") {
    const ip = clientIp(req);
    const body = await safeJson(req);
    const parsed = studentLoginSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Kod noto'g'ri formatda.", 400);
    const code = normalizeCode(String(parsed.data.code));
    if (!/^MDM-[A-Z0-9]{4,10}$/.test(code)) return err("AUTH", "Ushbu kod topilmadi.", 404);
    const rlIp = checkRate(`slogin-ip:${ip}`, 60, 60);
    if (!rlIp.allowed) return err("RATE_LIMIT", "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.", 429);
    const rl = checkRate(`slogin:${ip}:${code}`, 10, 60);
    if (!rl.allowed) return err("RATE_LIMIT", "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.", 429);
    const row = await env.DB.prepare("SELECT id, full_name, student_code, group_id, level, status FROM students WHERE student_code = ?")
      .bind(code).first<{ id: string; full_name: string; student_code: string; group_id: string | null; level: string; status: string }>();
    if (!row || row.status !== "active") {
      await env.DB.prepare("INSERT INTO login_attempts (kind, identifier, ip, success, created_at) VALUES ('student', ?, ?, 0, ?)").bind(code, ip, nowSec()).run().catch(() => {});
      return err("AUTH", "Ushbu kod topilmadi.", 404);
    }
    const token = randomToken();
    const th = await sha256Hex(token);
    await env.DB.prepare("INSERT INTO student_sessions (id, student_id, token_hash, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uid(), row.id, th, nowSec(), nowSec() + 30 * 24 * 3600, ip, req.headers.get("user-agent") || "").run();
    await env.DB.prepare("UPDATE students SET last_active_at = ?, updated_at = ? WHERE id = ?").bind(nowSec(), nowSec(), row.id).run().catch(() => {});
    cleanup(env);
    const res = ok({ student: row });
    res.headers.set("Set-Cookie", sessionCookie("mdm_student", token, 30 * 24 * 3600, secure));
    return res;
  }

  if (req.method === "POST" && path === "/api/student/logout") {
    const c = parseCookies(req);
    if (c["mdm_student"]) {
      const th = await sha256Hex(c["mdm_student"]);
      await env.DB.prepare("DELETE FROM student_sessions WHERE token_hash = ?").bind(th).run().catch(() => {});
    }
    const res = ok({ message: "Chiqildi" });
    res.headers.set("Set-Cookie", clearCookie("mdm_student", secure));
    return res;
  }

  if (req.method === "GET" && path === "/api/student/me") {
    const s = await getStudent(req, env);
    // Login qilinmagan holat — kutilgan holat, 200 + role:null (401 shovqin yo'q).
    if (!s) return ok({ role: null, student: null });
    const full = await env.DB.prepare("SELECT s.*, g.name as group_name FROM students s LEFT JOIN groups g ON g.id = s.group_id WHERE s.id = ?")
      .bind(s.id).first();
    return ok({ role: "student", student: full });
  }

  // POST /api/auth/teacher/password — parolni almashtirish
  if (req.method === "POST" && path === "/api/auth/teacher/password") {
    const t = await getTeacher(req, env);
    if (!t) return err("UNAUTH", "Avval tizimga kiring.", 401);
    const body = await safeJson(req);
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Yangi parol kamida 6 belgidan iborat bo'lsin.", 400);
    const good = await verifyPassword(parsed.data.current, t.password_salt, t.password_hash);
    if (!good) return err("AUTH", "Hozirgi parol noto'g'ri.", 401);
    const salt = makeSalt();
    const hash = await hashPassword(parsed.data.password, salt);
    await env.DB.prepare("UPDATE teachers SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
      .bind(hash, salt, nowSec(), t.id).run();
    // Barcha eski sessiyalarni yopish (joriy sessiyadan tashqari xavfsizlik uchun)
    await env.DB.prepare("DELETE FROM teacher_sessions WHERE teacher_id = ?").bind(t.id).run().catch(() => {});
    const token = randomToken();
    const th = await sha256Hex(token);
    await env.DB.prepare("INSERT INTO teacher_sessions (id, teacher_id, token_hash, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uid(), t.id, th, nowSec(), nowSec() + 7 * 24 * 3600, clientIp(req), req.headers.get("user-agent") || "").run();
    const res = ok({ message: "Parol yangilandi." });
    res.headers.set("Set-Cookie", sessionCookie("mdm_teacher", token, 7 * 24 * 3600, isSecureRequest(req)));
    return res;
  }

  return null;
}
