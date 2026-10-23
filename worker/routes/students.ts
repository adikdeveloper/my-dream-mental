import type { Env } from "../db/client";
import { err, ok, safeJson, nowSec, generateStudentCode, tashkentDateKey, uid } from "../db/client";
import { getTeacher, getStudent } from "../middleware/auth";
import { studentCreateSchema, studentUpdateSchema } from "../db/validate";

async function uniqueCode(env: Env): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const c = generateStudentCode();
    const ex = await env.DB.prepare("SELECT id FROM students WHERE student_code = ?").bind(c).first();
    if (!ex) return c;
  }
  return `MDM-${uid().slice(0, 6).toUpperCase().replace(/-/g, "X")}`;
}

export async function routeStudents(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith("/api/students")) return null;
  const teacher = await getTeacher(req, env);

  // ---- student self statistics/history (student role) ----
  const student = await getStudent(req, env);

  // GET /api/students/:id/statistics
  let m = path.match(/^\/api\/students\/([^/]+)\/statistics$/);
  if (req.method === "GET" && m) {
    const sid = m[1];
    if (teacher) return statsFor(env, sid, url);
    if (student && student.id === sid) return statsFor(env, sid, url);
    return err("FORBIDDEN", "Ruxsat yo'q.", 403);
  }
  // GET /api/students/:id/history
  m = path.match(/^\/api\/students\/([^/]+)\/history$/);
  if (req.method === "GET" && m) {
    const sid = m[1];
    if (teacher) return historyFor(env, sid, url);
    if (student && student.id === sid) return historyFor(env, sid, url);
    return err("FORBIDDEN", "Ruxsat yo'q.", 403);
  }
  // POST /api/students/:id/regenerate-code
  m = path.match(/^\/api\/students\/([^/]+)\/regenerate-code$/);
  if (req.method === "POST" && m) {
    if (!teacher) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
    const code = await uniqueCode(env);
    const r = await env.DB.prepare("UPDATE students SET student_code = ?, updated_at = ? WHERE id = ?").bind(code, nowSec(), m[1]).run();
    if ((r.meta.changes ?? 0) === 0) return err("NOT_FOUND", "O'quvchi topilmadi.", 404);
    return ok({ student_code: code });
  }

  // All below require teacher
  if (!teacher) {
    if (path === "/api/students" && req.method === "GET") return err("UNAUTH", "Avval tizimga kiring.", 401);
    if (path.startsWith("/api/students")) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
  }

  // GET /api/students (list with search/filter/sort/pagination + today stats)
  if (req.method === "GET" && path === "/api/students") {
    const q = (url.searchParams.get("q") || "").trim();
    const groupId = url.searchParams.get("group_id") || "";
    const status = url.searchParams.get("status") || "";
    const sort = url.searchParams.get("sort") || "name";
    const order = (url.searchParams.get("order") || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
    const off = (page - 1) * limit;
    const today = tashkentDateKey();

    const where: string[] = [];
    const binds: unknown[] = [];
    if (q) { where.push("(s.full_name LIKE ? OR s.student_code LIKE ?)"); binds.push(`%${q}%`, `%${q.toUpperCase()}%`); }
    if (groupId) { where.push("s.group_id = ?"); binds.push(groupId); }
    if (status) { where.push("s.status = ?"); binds.push(status); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sortMap: Record<string, string> = { name: "s.full_name", code: "s.student_code", level: "s.level", active: "s.last_active_at", created: "s.created_at" };
    const sortCol = sortMap[sort] || "s.full_name";

    const total = await env.DB.prepare(`SELECT COUNT(*) as c FROM students s ${whereSql}`).bind(...binds).first<{ c: number }>();
    const rows = await env.DB.prepare(
      `SELECT s.*, g.name as group_name,
        (SELECT COUNT(*) FROM test_attempts a WHERE a.student_id = s.id AND a.date_key = ? AND a.status = 'completed') as today_tests,
        (SELECT COALESCE(SUM(a.total_questions),0) FROM test_attempts a WHERE a.student_id = s.id AND a.date_key = ? AND a.status = 'completed') as today_questions,
        (SELECT COALESCE(AVG(a.accuracy),0) FROM test_attempts a WHERE a.student_id = s.id AND a.date_key = ? AND a.status = 'completed') as today_accuracy,
        (SELECT COALESCE(SUM(d.active_seconds),0) FROM daily_stats d WHERE d.student_id = s.id AND d.date_key = ?) as today_active,
        (SELECT COUNT(*) FROM daily_stats d WHERE d.student_id = s.id AND d.total_questions > 0) as active_days
       FROM students s LEFT JOIN groups g ON g.id = s.group_id ${whereSql} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`
    ).bind(today, today, today, today, ...binds, limit, off).all();
    return ok({ items: rows.results || [], total: total?.c || 0, page, limit });
  }

  // POST /api/students
  if (req.method === "POST" && path === "/api/students") {
    const body = await safeJson(req);
    const parsed = studentCreateSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Ism kamida 2 harf bo'lsin.", 400);
    if (parsed.data.group_id) {
      const g = await env.DB.prepare("SELECT id FROM groups WHERE id = ?").bind(parsed.data.group_id).first();
      if (!g) return err("VALIDATION", "Guruh topilmadi.", 400);
    }
    const code = await uniqueCode(env);
    const id = uid();
    await env.DB.prepare("INSERT INTO students (id, full_name, student_code, group_id, level, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)")
      .bind(id, parsed.data.full_name.trim(), code, parsed.data.group_id || null, parsed.data.level, nowSec(), nowSec()).run();
    const row = await env.DB.prepare("SELECT s.*, g.name as group_name FROM students s LEFT JOIN groups g ON g.id = s.group_id WHERE s.id = ?").bind(id).first();
    return ok({ student: row }, 201);
  }

  // GET /api/students/:id
  m = path.match(/^\/api\/students\/([^/]+)$/);
  if (m && req.method === "GET") {
    const row = await env.DB.prepare("SELECT s.*, g.name as group_name FROM students s LEFT JOIN groups g ON g.id = s.group_id WHERE s.id = ?").bind(m[1]).first();
    if (!row) return err("NOT_FOUND", "O'quvchi topilmadi.", 404);
    return ok({ student: row });
  }
  // PUT /api/students/:id
  if (m && req.method === "PUT") {
    const body = await safeJson(req);
    const parsed = studentUpdateSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Ma'lumotlar noto'g'ri.", 400);
    const sets: string[] = ["updated_at = ?"];
    const binds: unknown[] = [nowSec()];
    if (parsed.data.full_name !== undefined) { sets.push("full_name = ?"); binds.push(parsed.data.full_name.trim()); }
    if (parsed.data.group_id !== undefined) {
      if (parsed.data.group_id) {
        const g = await env.DB.prepare("SELECT id FROM groups WHERE id = ?").bind(parsed.data.group_id).first();
        if (!g) return err("VALIDATION", "Guruh topilmadi.", 400);
      }
      sets.push("group_id = ?"); binds.push(parsed.data.group_id || null);
    }
    if (parsed.data.level !== undefined) { sets.push("level = ?"); binds.push(parsed.data.level); }
    if (parsed.data.status !== undefined) { sets.push("status = ?"); binds.push(parsed.data.status); }
    binds.push(m[1]);
    const r = await env.DB.prepare(`UPDATE students SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
    if ((r.meta.changes ?? 0) === 0) return err("NOT_FOUND", "O'quvchi topilmadi.", 404);
    const row = await env.DB.prepare("SELECT s.*, g.name as group_name FROM students s LEFT JOIN groups g ON g.id = s.group_id WHERE s.id = ?").bind(m[1]).first();
    return ok({ student: row });
  }
  // DELETE /api/students/:id (?hard=1 → hard delete, else deactivate)
  // Eslatma: D1 da FK cascade kafolatlanmaydi, shuning uchun hard delete'da bolalarni o'zimiz tozalaymiz.
  if (m && req.method === "DELETE") {
    if (url.searchParams.get("hard") === "1") {
      const qa = await env.DB.prepare("SELECT id FROM test_attempts WHERE student_id = ?").bind(m[1]).all<{ id: string }>();
      const aids = (qa.results || []).map((r) => r.id);
      for (let i = 0; i < aids.length; i += 50) {
        const chunk = aids.slice(i, i + 50);
        const ph = chunk.map(() => "?").join(",");
        await env.DB.prepare(`DELETE FROM test_questions WHERE attempt_id IN (${ph})`).bind(...chunk).run().catch(() => {});
      }
      await env.DB.prepare("DELETE FROM test_attempts WHERE student_id = ?").bind(m[1]).run().catch(() => {});
      await env.DB.prepare("DELETE FROM activity_sessions WHERE student_id = ?").bind(m[1]).run().catch(() => {});
      await env.DB.prepare("DELETE FROM daily_stats WHERE student_id = ?").bind(m[1]).run().catch(() => {});
      await env.DB.prepare("DELETE FROM student_sessions WHERE student_id = ?").bind(m[1]).run().catch(() => {});
      await env.DB.prepare("DELETE FROM students WHERE id = ?").bind(m[1]).run();
    } else {
      await env.DB.prepare("UPDATE students SET status = 'inactive', updated_at = ? WHERE id = ?").bind(nowSec(), m[1]).run();
    }
    return ok({ message: "Bajarildi" });
  }
  return null;
}

async function statsFor(env: Env, sid: string, url: URL): Promise<Response> {
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") || "30", 10) || 30));
  const st = await env.DB.prepare("SELECT s.*, g.name as group_name FROM students s LEFT JOIN groups g ON g.id = s.group_id WHERE s.id = ?").bind(sid).first();
  if (!st) return err("NOT_FOUND", "O'quvchi topilmadi.", 404);
  const totals = await env.DB.prepare(
    "SELECT COUNT(*) as tests, COALESCE(SUM(total_questions),0) as questions, COALESCE(SUM(correct_count),0) as correct, COALESCE(SUM(wrong_count),0) as wrong, COALESCE(AVG(accuracy),0) as accuracy FROM test_attempts WHERE student_id = ? AND status = 'completed'"
  ).bind(sid).first<{ tests: number; questions: number; correct: number; wrong: number; accuracy: number }>();
  const today = tashkentDateKey();
  const todayRow = await env.DB.prepare("SELECT * FROM daily_stats WHERE student_id = ? AND date_key = ?").bind(sid, today).first();
  const daily = await env.DB.prepare("SELECT * FROM daily_stats WHERE student_id = ? ORDER BY date_key DESC LIMIT ?").bind(sid, days).all();
  const bySection = await env.DB.prepare(
    `SELECT sec.key, sec.title_uz, COUNT(a.id) as tests, COALESCE(SUM(a.total_questions),0) as total,
      COALESCE(SUM(a.correct_count),0) as correct, COALESCE(SUM(a.wrong_count),0) as wrong,
      COALESCE(AVG(a.accuracy),0) as accuracy, COALESCE(AVG(a.avg_response_ms),0) as avg_ms
     FROM test_attempts a LEFT JOIN sections sec ON sec.id = a.section_id WHERE a.student_id = ? AND a.status = 'completed' GROUP BY sec.key, sec.title_uz`
  ).bind(sid).all();
  const streak = await calcStreak(env, sid);
  return ok({ student: st, totals, today: todayRow || null, daily: (daily.results || []).reverse(), bySection: bySection.results || [], streak });
}

async function historyFor(env: Env, sid: string, url: URL): Promise<Response> {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const total = await env.DB.prepare("SELECT COUNT(*) as c FROM test_attempts WHERE student_id = ? AND status = 'completed'").bind(sid).first<{ c: number }>();
  const rows = await env.DB.prepare("SELECT * FROM test_attempts WHERE student_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(sid, limit, (page - 1) * limit).all();
  return ok({ items: rows.results || [], total: total?.c || 0, page, limit });
}

export async function calcStreak(env: Env, sid: string): Promise<number> {
  const rows = await env.DB.prepare("SELECT date_key FROM daily_stats WHERE student_id = ? AND total_questions > 0 ORDER BY date_key DESC LIMIT 60").bind(sid).all<{ date_key: string }>();
  const dates = new Set((rows.results || []).map((r) => r.date_key));
  if (!dates.size) return 0;
  let streak = 0;
  const dayMs = 86400000;
  // Tashkent midnight today
  const nowTash = Date.now() + 5 * 3600000;
  const midnightTash = Math.floor(nowTash / dayMs) * dayMs;
  for (let i = 0; i < 60; i++) {
    const key = new Date(midnightTash - i * dayMs).toISOString().slice(0, 10);
    if (i === 0 && !dates.has(key)) continue; // today not yet → streak counts from yesterday
    if (dates.has(key)) streak++;
    else break;
  }
  return streak;
}
