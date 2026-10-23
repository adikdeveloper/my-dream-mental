import type { Env } from "../db/client";
import { err, ok, safeJson, nowSec, tashkentDateKey, uid } from "../db/client";
import { getTeacher, getStudent } from "../middleware/auth";
import { heartbeatSchema } from "../db/validate";
import { checkRate } from "../middleware/rateLimit";
import { calcLeaderboardPoints } from "../services/testEngine";
import { calcStreak } from "./students";

export function exportKind(raw: string): string {
  return raw.replace(/\.csv$/i, "").toLowerCase();
}

// GET /api/leaderboard?period=all|today|week — platformadagi hamma faol o'quvchi.
// Ball: misollar + to'g'ri javoblar + testlar + aniqlik + faol vaqt + kunlik faollik.
export async function routeLeaderboard(req: Request, env: Env, url: URL): Promise<Response | null> {
  if (req.method !== "GET" || url.pathname !== "/api/leaderboard") return null;
  const teacher = await getTeacher(req, env);
  const student = teacher ? null : await getStudent(req, env);
  if (!teacher && !student) return err("UNAUTH", "Avval tizimga kiring.", 401);

  const period = url.searchParams.get("period") || "all";
  const today = tashkentDateKey();
  // Sana filtri (attempts.date_key va daily_stats.date_key ustida)
  let dateCond = "";
  const dateBinds: unknown[] = [];
  if (period === "today") {
    dateCond = "AND date_key = ?";
    dateBinds.push(today);
  } else if (period === "week") {
    const weekAgo = new Date(Date.now() - 6 * 86400000 + 5 * 3600000).toISOString().slice(0, 10);
    dateCond = "AND date_key >= ?";
    dateBinds.push(weekAgo);
  }

  const rows = await env.DB.prepare(
    `SELECT s.id, s.full_name, s.student_code, s.level, g.name as group_name,
      COALESCE(a.tests, 0) as tests,
      COALESCE(a.questions, 0) as questions,
      COALESCE(a.correct, 0) as correct,
      COALESCE(a.accuracy, 0) as accuracy,
      COALESCE(sec.active_seconds, 0) as active_seconds,
      COALESCE(sec.active_days, 0) as active_days
     FROM students s
     LEFT JOIN groups g ON g.id = s.group_id
     LEFT JOIN (
       SELECT student_id, COUNT(*) as tests, COALESCE(SUM(total_questions), 0) as questions,
         COALESCE(SUM(correct_count), 0) as correct, COALESCE(AVG(accuracy), 0) as accuracy
       FROM test_attempts WHERE status = 'completed' ${dateCond} GROUP BY student_id
     ) a ON a.student_id = s.id
     LEFT JOIN (
       SELECT student_id, COALESCE(SUM(active_seconds), 0) as active_seconds,
         COUNT(CASE WHEN total_questions > 0 THEN 1 END) as active_days
       FROM daily_stats WHERE 1 = 1 ${dateCond} GROUP BY student_id
     ) sec ON sec.student_id = s.id
     WHERE s.status = 'active'
     ORDER BY s.full_name ASC LIMIT 500`
  ).bind(...dateBinds, ...dateBinds).all<{
    id: string; full_name: string; student_code: string; level: string; group_name: string | null;
    tests: number; questions: number; correct: number; accuracy: number; active_seconds: number; active_days: number;
  }>();

  const meId = student?.id || null;
  const items = (rows.results || []).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    // O'quvchilar bir-birining kirish kodini ko'rmasin (kod = parol vazifasida!)
    student_code: teacher ? r.student_code : r.id === meId ? r.student_code : "MDM-****",
    level: r.level,
    group_name: r.group_name,
    tests: r.tests,
    questions: r.questions,
    correct: r.correct,
    accuracy: Math.round((r.accuracy || 0) * 10) / 10,
    active_seconds: r.active_seconds,
    active_days: r.active_days,
    points: calcLeaderboardPoints({
      tests: r.tests, questions: r.questions, correct: r.correct,
      accuracy: r.accuracy, active_seconds: r.active_seconds, active_days: r.active_days,
    }),
  }));
  // Ball bo'yicha saralash (tenglikda: aniqlik, keyin misollar)
  items.sort((x, y) => y.points - x.points || y.accuracy - x.accuracy || y.questions - x.questions);
  const ranked = items.slice(0, 100).map((r, i) => ({ rank: i + 1, ...r }));
  const meRank = meId ? (ranked.find((r) => r.id === meId)?.rank ?? null) : null;
  return ok({ items: ranked, total: items.length, period, me_id: meId, me_rank: meRank });
}

export async function routeDashboard(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // GET /api/dashboard/teacher
  if (req.method === "GET" && path === "/api/dashboard/teacher") {
    const teacher = await getTeacher(req, env);
    if (!teacher) return err("UNAUTH", "Avval tizimga kiring.", 401);
    const today = tashkentDateKey();
    const students = await env.DB.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").bind().first<{ c: number }>();
    const activeToday = await env.DB.prepare("SELECT COUNT(DISTINCT student_id) as c FROM daily_stats WHERE date_key = ? AND (total_questions > 0 OR active_seconds > 0)").bind(today).first<{ c: number }>();
    const todayAgg = await env.DB.prepare("SELECT COALESCE(SUM(total_questions),0) as q, COALESCE(SUM(total_tests),0) as t, COALESCE(AVG(accuracy),0) as acc FROM daily_stats WHERE date_key = ?").bind(today).first<{ q: number; t: number; acc: number }>();
    const todayActive = await env.DB.prepare("SELECT COALESCE(SUM(active_seconds),0) as s FROM daily_stats WHERE date_key = ?").bind(today).first<{ s: number }>();
    const totalActive = await env.DB.prepare("SELECT COALESCE(SUM(total_active_seconds),0) as s FROM students").bind().first<{ s: number }>();
    const week = await env.DB.prepare("SELECT date_key, SUM(total_questions) as q, SUM(total_tests) as t, AVG(accuracy) as acc FROM daily_stats WHERE date_key >= date(?, '-6 days') GROUP BY date_key ORDER BY date_key").bind(today).all();
    const top = await env.DB.prepare(
      `SELECT s.id, s.full_name, s.student_code, COALESCE(SUM(a.total_questions),0) as q, COALESCE(AVG(a.accuracy),0) as acc, COALESCE(SUM(a.score),0) as score
       FROM students s LEFT JOIN test_attempts a ON a.student_id = s.id AND a.date_key = ? WHERE s.status='active' GROUP BY s.id ORDER BY score DESC LIMIT 5`
    ).bind(today).all();
    return ok({
      total_students: students?.c || 0,
      active_today: activeToday?.c || 0,
      today_questions: todayAgg?.q || 0,
      today_tests: todayAgg?.t || 0,
      today_accuracy: Math.round((todayAgg?.acc || 0) * 10) / 10,
      today_active_seconds: todayActive?.s || 0,
      total_active_seconds: totalActive?.s || 0,
      week: week.results || [],
      top: top.results || [],
    });
  }

  // GET /api/dashboard/student
  if (req.method === "GET" && path === "/api/dashboard/student") {
    const student = await getStudent(req, env);
    if (!student) return err("UNAUTH", "Avval kod orqali kiring.", 401);
    const today = tashkentDateKey();
    const todayRow = await env.DB.prepare("SELECT * FROM daily_stats WHERE student_id = ? AND date_key = ?").bind(student.id, today).first();
    const totals = await env.DB.prepare("SELECT COUNT(*) as tests, COALESCE(SUM(total_questions),0) as questions, COALESCE(SUM(correct_count),0) as correct, COALESCE(AVG(accuracy),0) as acc FROM test_attempts WHERE student_id = ? AND status='completed'").bind(student.id).first<{ tests: number; questions: number; correct: number; acc: number }>();
    const me = await env.DB.prepare("SELECT total_active_seconds FROM students WHERE id = ?").bind(student.id).first<{ total_active_seconds: number }>();
    const recent = await env.DB.prepare("SELECT * FROM test_attempts WHERE student_id = ? AND status='completed' ORDER BY created_at DESC LIMIT 5").bind(student.id).all();
    const tests = await env.DB.prepare("SELECT t.*, s.title_uz as section_title, s.key as section_key FROM tests t LEFT JOIN sections s ON s.id = t.section_id WHERE t.is_active = 1 AND t.daily_enabled = 1 ORDER BY t.created_at DESC LIMIT 8").bind().all();
    const streak = await calcStreak(env, student.id);
    const week = await env.DB.prepare("SELECT * FROM daily_stats WHERE student_id = ? ORDER BY date_key DESC LIMIT 7").bind(student.id).all();
    return ok({
      today: todayRow || { total_tests: 0, total_questions: 0, correct_count: 0, accuracy: 0, active_seconds: 0 },
      totals: totals || { tests: 0, questions: 0, correct: 0, acc: 0 },
      total_active_seconds: me?.total_active_seconds || 0,
      recent: recent.results || [],
      tests: tests.results || [],
      streak,
      week: (week.results || []).reverse(),
    });
  }

  // GET /api/export/:kind(.csv) (teacher)
  let m = path.match(/^\/api\/export\/([^/]+)$/);
  if (m && req.method === "GET") {
    const teacher = await getTeacher(req, env);
    if (!teacher) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
    const kind = exportKind(m[1]);
    if (kind === "students") {
      const rows = await env.DB.prepare("SELECT s.full_name, s.student_code, g.name as group_name, s.level, s.status, s.total_active_seconds FROM students s LEFT JOIN groups g ON g.id = s.group_id ORDER BY s.full_name").bind().all<Record<string, unknown>>();
      return csv("students", ["Ism", "Kod", "Guruh", "Level", "Status", "Faol vaqt (sek)"], (rows.results || []).map((r) => [r["full_name"], r["student_code"], r["group_name"] ?? "", r["level"], r["status"], r["total_active_seconds"]]));
    }
    if (kind === "results") {
      const date = url.searchParams.get("date") || "";
      const q = date ? "WHERE a.date_key = ?" : "";
      const binds: unknown[] = date ? [date] : [];
      const rows = await env.DB.prepare(`SELECT a.date_key, s.full_name, s.student_code, a.test_name, a.difficulty, a.total_questions, a.correct_count, a.accuracy, a.score, a.duration_seconds FROM test_attempts a JOIN students s ON s.id = a.student_id ${q} ORDER BY a.created_at DESC LIMIT 2000`).bind(...binds).all<Record<string, unknown>>();
      return csv("results", ["Sana", "Ism", "Kod", "Test", "Daraja", "Savollar", "To'g'ri", "Aniqlik %", "Ball", "Vaqt (sek)"], (rows.results || []).map((r) => [r["date_key"], r["full_name"], r["student_code"], r["test_name"], r["difficulty"], r["total_questions"], r["correct_count"], r["accuracy"], r["score"], r["duration_seconds"]]));
    }
    if (kind === "daily") {
      const rows = await env.DB.prepare("SELECT d.date_key, s.full_name, s.student_code, d.total_tests, d.total_questions, d.correct_count, d.accuracy, d.active_seconds FROM daily_stats d JOIN students s ON s.id = d.student_id ORDER BY d.date_key DESC LIMIT 2000").bind().all<Record<string, unknown>>();
      return csv("daily", ["Sana", "Ism", "Kod", "Testlar", "Misollar", "To'g'ri", "Aniqlik %", "Faol vaqt (sek)"], (rows.results || []).map((r) => [r["date_key"], r["full_name"], r["student_code"], r["total_tests"], r["total_questions"], r["correct_count"], r["accuracy"], r["active_seconds"]]));
    }
    return err("NOT_FOUND", "Eksport turi topilmadi.", 404);
  }

  return null;
}

function csv(name: string, headers: string[], rows: unknown[][]): Response {
  const esc = (v: unknown) => {
    let s = String(v ?? "");
    // CSV formula injection himoyasi (= + - @ bilan boshlansa)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "\uFEFF" + [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=${name}.csv` } });
}

export async function routeActivity(req: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== "/api/activity/heartbeat" || req.method !== "POST") return null;
  const student = await getStudent(req, env);
  // Sessiya yo'q/yaroqsiz bo'lsa — bu telemetriya, 401 emas 200 qaytaramiz
  // (brauzer console'da "Failed to load resource 401" shovqin bo'lmasligi uchun).
  // Hech kimga ball yozilmaydi, so'rov shunchaki e'tiborsiz qoldiriladi.
  if (!student) return ok({ ignored: true });
  // Spam himoyasi: bitta student 25s interval bilan yuboradi — 10s da 3 tadan ko'p bo'lsa bloklash
  const rl = checkRate(`hb:${student.id}`, 12, 60);
  if (!rl.allowed) return err("RATE_LIMIT", "Juda tez so'rov.", 429);
  const body = await safeJson(req);
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "Ma'lumot noto'g'ri.", 400);
  const secs = parsed.data.active_seconds;
  const today = tashkentDateKey();
  const t = nowSec();
  let sessionId = parsed.data.session_id;
  if (sessionId) {
    const ex = await env.DB.prepare("SELECT id FROM activity_sessions WHERE id = ? AND student_id = ?").bind(sessionId, student.id).first();
    if (ex) {
      await env.DB.prepare("UPDATE activity_sessions SET active_seconds = active_seconds + ?, last_heartbeat_at = ?, ended_at = ? WHERE id = ?").bind(secs, t, t, sessionId).run();
    } else {
      sessionId = undefined;
    }
  }
  if (!sessionId) {
    sessionId = uid();
    await env.DB.prepare("INSERT INTO activity_sessions (id, student_id, started_at, ended_at, active_seconds, last_heartbeat_at, date_key, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(sessionId, student.id, t, t, secs, t, today, req.headers.get("user-agent") || "").run();
  }
  await env.DB.prepare("UPDATE students SET total_active_seconds = total_active_seconds + ?, last_active_at = ?, updated_at = ? WHERE id = ?").bind(secs, t, t, student.id).run();
  // daily rollup (lightweight: increment)
  await env.DB.prepare(
    `INSERT INTO daily_stats (id, student_id, date_key, total_tests, total_questions, correct_count, wrong_count, accuracy, active_seconds, updated_at)
     VALUES (?, ?, ?, 0, 0, 0, 0, 0, ?, ?)
     ON CONFLICT(student_id, date_key) DO UPDATE SET active_seconds = active_seconds + excluded.active_seconds, updated_at = excluded.updated_at`
  ).bind(uid(), student.id, today, secs, t).run();
  return ok({ session_id: sessionId });
}
