import type { Env } from "../db/client";
import { err, ok, safeJson, nowSec, tashkentDateKey, uid } from "../db/client";
import { getTeacher, getStudent } from "../middleware/auth";
import { testSchema, submitSchema } from "../db/validate";
import { generateQuestions, normalizeOps, calcScore, generateFlashSequence, clampFlashOverrides, parseFlashExpression, type Op } from "../services/testEngine";

export async function routeTests(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  // Pastdagi GET /api/teacher/attempts handleri ham shu funksiyada —
  // guard uni to'sib qo'ymasligi shart.
  if (!path.startsWith("/api/tests") && !path.startsWith("/api/attempts") && path !== "/api/teacher/attempts") return null;

  // GET /api/tests — teacher: all; student: active + daily only
  if (req.method === "GET" && path === "/api/tests") {
    const teacher = await getTeacher(req, env);
    const student = teacher ? null : await getStudent(req, env);
    if (!teacher && !student) return err("UNAUTH", "Avval tizimga kiring.", 401);
    if (teacher) {
      const rows = await env.DB.prepare(
        "SELECT t.*, s.title_uz as section_title, s.key as section_key FROM tests t LEFT JOIN sections s ON s.id = t.section_id ORDER BY t.created_at DESC"
      ).all();
      return ok({ items: rows.results || [] });
    }
    const rows = await env.DB.prepare(
      "SELECT t.*, s.title_uz as section_title, s.key as section_key FROM tests t LEFT JOIN sections s ON s.id = t.section_id WHERE t.is_active = 1 AND t.daily_enabled = 1 ORDER BY t.created_at DESC"
    ).all();
    return ok({ items: rows.results || [] });
  }

  // POST /api/tests (teacher)
  if (req.method === "POST" && path === "/api/tests") {
    const teacher = await getTeacher(req, env);
    if (!teacher) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
    const body = await safeJson(req);
    const parsed = testSchema.safeParse({ ...body, allowed_operations: Array.isArray(body["allowed_operations"]) ? body["allowed_operations"] : ["+"] });
    if (!parsed.success) return err("VALIDATION", "Test ma'lumotlari noto'g'ri.", 400);
    if (parsed.data.min_number > parsed.data.max_number) return err("VALIDATION", "Min max dan katta bo'lmasin.", 400);
    if (parsed.data.section_id) {
      const sec = await env.DB.prepare("SELECT id FROM sections WHERE id = ?").bind(parsed.data.section_id).first();
      if (!sec) return err("VALIDATION", "Bo'lim topilmadi.", 400);
    }
    const id = uid();
    await env.DB.prepare(
      "INSERT INTO tests (id, name, section_id, difficulty, question_count, time_limit_seconds, min_number, max_number, allowed_operations, allow_back, randomize, daily_enabled, is_active, mode, flash_numbers, flash_interval_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, parsed.data.name.trim(), parsed.data.section_id || null, parsed.data.difficulty, parsed.data.question_count, parsed.data.time_limit_seconds, parsed.data.min_number, parsed.data.max_number, JSON.stringify(normalizeOps(parsed.data.allowed_operations)), parsed.data.allow_back, parsed.data.randomize, parsed.data.daily_enabled, parsed.data.is_active, parsed.data.mode, parsed.data.flash_numbers, parsed.data.flash_interval_ms, nowSec(), nowSec()).run();
    const row = await env.DB.prepare("SELECT * FROM tests WHERE id = ?").bind(id).first();
    return ok({ test: row }, 201);
  }

  // GET /api/tests/:id — teacher: any; student: active only
  {
    const gm = path.match(/^\/api\/tests\/([^/]+)$/);
    if (gm && req.method === "GET" && !path.endsWith("/start") && !path.endsWith("/submit")) {
      const teacher = await getTeacher(req, env);
      const student = teacher ? null : await getStudent(req, env);
      if (!teacher && !student) return err("UNAUTH", "Avval tizimga kiring.", 401);
      const row = await env.DB.prepare(
        "SELECT t.*, s.title_uz as section_title, s.key as section_key FROM tests t LEFT JOIN sections s ON s.id = t.section_id WHERE t.id = ?"
      ).bind(gm[1]).first<Record<string, unknown>>();
      if (!row) return err("NOT_FOUND", "Test topilmadi.", 404);
      if (student && !row["is_active"]) return err("NOT_FOUND", "Test topilmadi.", 404);
      return ok({ test: row });
    }
  }

  // PUT/DELETE /api/tests/:id (teacher)
  let m = path.match(/^\/api\/tests\/([^/]+)$/);  if (m && (req.method === "PUT" || req.method === "DELETE")) {
    const teacher = await getTeacher(req, env);
    if (!teacher) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
    if (req.method === "DELETE") {
      // D1 da FK enforce kafolatlanmaydi — dangling test_id qolmasin.
      await env.DB.prepare("UPDATE test_attempts SET test_id = NULL WHERE test_id = ?").bind(m[1]).run().catch(() => {});
      await env.DB.prepare("DELETE FROM tests WHERE id = ?").bind(m[1]).run();
      return ok({ message: "O'chirildi" });
    }
    const body = await safeJson(req);
    const parsed = testSchema.safeParse({ ...body, allowed_operations: Array.isArray(body["allowed_operations"]) ? body["allowed_operations"] : ["+"] });
    if (!parsed.success) return err("VALIDATION", "Test ma'lumotlari noto'g'ri.", 400);
    if (parsed.data.min_number > parsed.data.max_number) return err("VALIDATION", "Min max dan katta bo'lmasin.", 400);
    if (parsed.data.section_id) {
      const sec = await env.DB.prepare("SELECT id FROM sections WHERE id = ?").bind(parsed.data.section_id).first();
      if (!sec) return err("VALIDATION", "Bo'lim topilmadi.", 400);
    }
    await env.DB.prepare(
      "UPDATE tests SET name=?, section_id=?, difficulty=?, question_count=?, time_limit_seconds=?, min_number=?, max_number=?, allowed_operations=?, allow_back=?, randomize=?, daily_enabled=?, is_active=?, mode=?, flash_numbers=?, flash_interval_ms=?, updated_at=? WHERE id=?"
    ).bind(parsed.data.name.trim(), parsed.data.section_id || null, parsed.data.difficulty, parsed.data.question_count, parsed.data.time_limit_seconds, parsed.data.min_number, parsed.data.max_number, JSON.stringify(normalizeOps(parsed.data.allowed_operations)), parsed.data.allow_back, parsed.data.randomize, parsed.data.daily_enabled, parsed.data.is_active, parsed.data.mode, parsed.data.flash_numbers, parsed.data.flash_interval_ms, nowSec(), m[1]).run();
    const row = await env.DB.prepare("SELECT * FROM tests WHERE id = ?").bind(m[1]).first();
    return ok({ test: row });
  }

  // POST /api/tests/:id/start (student) — server generates questions, answers hidden
  m = path.match(/^\/api\/tests\/([^/]+)\/start$/);
  if (m && req.method === "POST") {
    const student = await getStudent(req, env);
    if (!student) return err("UNAUTH", "Avval kod orqali kiring.", 401);
    const test = await env.DB.prepare("SELECT t.*, s.key as section_key FROM tests t LEFT JOIN sections s ON s.id = t.section_id WHERE t.id = ?").bind(m[1]).first<{
      id: string; name: string; section_id: string | null; difficulty: string; question_count: number; time_limit_seconds: number; min_number: number; max_number: number; allowed_operations: string; allow_back: number; is_active: number; mode: string; flash_numbers: number; flash_interval_ms: number;
    }>();
    if (!test || !test.is_active) return err("NOT_FOUND", "Test topilmadi.", 404);
    // Eskirgan (30 daqiqadan eski) tugallanmagan urinishlarni yopish.
    // Resume oynasi ham 30 daqiqa — undan eski pauza yangi urinishdan boshlanadi.
    await env.DB.prepare("UPDATE test_attempts SET status = 'expired' WHERE student_id = ? AND status = 'in_progress' AND started_at < ?")
      .bind(student.id, nowSec() - 1800).run().catch(() => {});

    const attemptId = uid();
    const dateKey = tashkentDateKey();
    const started = nowSec();

    // ---- FLASH rejimi: har bir misolda sonlar ketma-ket chaqadi ----
    if ((test.mode || "standard") === "flash") {
      const startBody = (await safeJson(req)) as Record<string, unknown>;
      let ops: Op[];
      try { ops = normalizeOps(JSON.parse(test.allowed_operations)); } catch { ops = ["+"]; }
      let allowMinus = ops.includes("-");
      if (startBody["minus"] === 0) allowMinus = false;
      else if (startBody["minus"] === 1) allowMinus = true;
      // Student sozlash ekranidan yuborgan override'lar (clamp bilan xavfsiz)
      const ov = clampFlashOverrides(startBody, test);

      // RESUME: shu test bo'yicha yaqinda ochilgan urinish bo'lsa — yangisini yaratmaymiz.
      // (React StrictMode / ikki marta bosish / sahifani yangilash holatlari)
      // MUHIM: sozlamalar o'zgargan bo'lsa (masalan 25 → 5 misol yoki xona oralig'i) resume qilmaymiz —
      // eski ochiq urinishni yopib, yangi sozlama bilan yangisini yaratamiz.
      const recent = await env.DB.prepare(
        "SELECT id, total_questions FROM test_attempts WHERE student_id = ? AND test_id = ? AND status = 'in_progress' AND started_at > ? ORDER BY started_at DESC LIMIT 1"
      ).bind(student.id, test.id, nowSec() - 1800).first<{ id: string; total_questions: number }>();
      if (recent) {
        let sameSettings = recent.total_questions === ov.examples;
        if (sameSettings) {
          const q1 = await env.DB.prepare(
            "SELECT flash_numbers_json FROM test_questions WHERE attempt_id = ? ORDER BY question_order LIMIT 1"
          ).bind(recent.id).first<{ flash_numbers_json: string | null }>().catch(() => null);
          if (q1?.flash_numbers_json) {
            try {
              const arr = JSON.parse(q1.flash_numbers_json) as unknown;
              if (Array.isArray(arr)) {
                if (arr.length !== ov.count) sameSettings = false;
                for (const item of arr) {
                  const s = String(item);
                  if (!allowMinus && s.startsWith("-")) sameSettings = false;
                  const abs = Math.abs(Number(s));
                  if (Number.isFinite(abs) && (abs < ov.minNumber || abs > ov.maxNumber)) sameSettings = false;
                }
              }
            } catch { /* ignore */ }
          }
        }
        if (sameSettings) {
          return flashPayload(env, recent.id, test, ov.interval);
        }
        await env.DB.prepare("UPDATE test_attempts SET status = 'expired' WHERE id = ? AND status = 'in_progress'")
          .bind(recent.id).run().catch(() => {});
      }
      // Spam cap: faqat so'nggi 30 daqiqadagi ochiq urinishlar sanaladi
      const open = await env.DB.prepare("SELECT COUNT(*) as c FROM test_attempts WHERE student_id = ? AND status = 'in_progress' AND started_at > ?")
        .bind(student.id, nowSec() - 1800).first<{ c: number }>();
      if ((open?.c || 0) >= 10) return err("RATE_LIMIT", "Tugallanmagan urinishlar ko'p. Avval ularni yakunlang.", 429);

      const seqs = [];
      for (let i = 0; i < ov.examples; i++) {
        seqs.push(generateFlashSequence(ov.count, ov.minNumber, ov.maxNumber, allowMinus));
      }
      await env.DB.prepare(
        "INSERT INTO test_attempts (id, student_id, test_id, section_id, test_name, difficulty, total_questions, correct_count, wrong_count, accuracy, score, duration_seconds, avg_response_ms, status, started_at, finished_at, date_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 'in_progress', ?, NULL, ?, ?)"
      ).bind(attemptId, student.id, test.id, test.section_id, test.name, test.difficulty, seqs.length, started, dateKey, started).run();
      const inserts = seqs.map((seq, i) =>
        env.DB.prepare("INSERT INTO test_questions (id, attempt_id, question_order, question_text, operand_a, operand_b, operation, expected_answer, student_answer, is_correct, response_time_ms, flash_numbers_json) VALUES (?, ?, ?, ?, 0, 0, '+', ?, NULL, NULL, 0, ?)")
          .bind(uid(), attemptId, i + 1, seq.expression, seq.expected, JSON.stringify(seq.numbers.map((x) => x.display)))
      );
      for (let i = 0; i < inserts.length; i += 50) {
        await env.DB.batch(inserts.slice(i, i + 50));
      }
      // Clientga faqat ko'rsatiladigan sonlar + interval; JAVOB yuborilmaydi
      return ok({
        attempt_id: attemptId,
        test: { id: test.id, name: test.name, difficulty: test.difficulty, time_limit_seconds: test.time_limit_seconds, allow_back: false, mode: "flash" as const },
        flash: { examples: seqs.map((s) => s.numbers.map((x) => x.display)), interval_ms: ov.interval },
        questions: seqs.map((s, i) => ({ order: i + 1, text: `${i + 1}-misol: ${s.numbers.length} ta son chaqadi` })),
      }, 201);
    }

    let ops: Op[];
    try { ops = normalizeOps(JSON.parse(test.allowed_operations)); } catch { ops = ["+"]; }
    const qs = generateQuestions({ allowedOperations: ops, minNumber: test.min_number, maxNumber: test.max_number, questionCount: test.question_count });
    await env.DB.prepare(
      "INSERT INTO test_attempts (id, student_id, test_id, section_id, test_name, difficulty, total_questions, correct_count, wrong_count, accuracy, score, duration_seconds, avg_response_ms, status, started_at, finished_at, date_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 'in_progress', ?, NULL, ?, ?)"
    ).bind(attemptId, student.id, test.id, test.section_id, test.name, test.difficulty, qs.length, started, dateKey, started).run();
    const batch = qs.map((q) =>
      env.DB.prepare("INSERT INTO test_questions (id, attempt_id, question_order, question_text, operand_a, operand_b, operation, expected_answer, student_answer, is_correct, response_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0)")
        .bind(uid(), attemptId, q.order, q.text, q.a, q.b, q.op, q.expected)
    );
    for (let i = 0; i < batch.length; i += 50) {
      await env.DB.batch(batch.slice(i, i + 50));
    }
    return ok({
      attempt_id: attemptId,
      test: { id: test.id, name: test.name, difficulty: test.difficulty, time_limit_seconds: test.time_limit_seconds, allow_back: !!test.allow_back, mode: "standard" as const },
      questions: qs.map((q) => ({ order: q.order, text: q.text })),
    }, 201);
  }

  // POST /api/tests/:id/submit (student) — authoritative scoring, idempotent via client_request_id
  if (req.method === "POST" && path.match(/^\/api\/tests\/[^/]+\/submit$/)) {
    const student = await getStudent(req, env);
    if (!student) return err("UNAUTH", "Avval kod orqali kiring.", 401);
    const body = await safeJson(req);
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Javoblar noto'g'ri formatda.", 400);
    const { attempt_id, duration_seconds, client_request_id } = parsed.data;

    if (client_request_id) {
      const dup = await env.DB.prepare("SELECT id, student_id FROM test_attempts WHERE client_request_id = ?").bind(client_request_id).first<{ id: string; student_id: string }>();
      if (dup && dup.student_id === student.id) {
        const full = await attemptResult(env, dup.id, true);
        return ok({ ...full, duplicate: true });
      }
    }
    const attempt = await env.DB.prepare("SELECT * FROM test_attempts WHERE id = ?").bind(attempt_id).first<{
      id: string; student_id: string; test_id: string | null; section_id: string | null; test_name: string; difficulty: string; total_questions: number; status: string; started_at: number; client_request_id: string | null;
    }>();
    if (!attempt) return err("NOT_FOUND", "Urinish topilmadi.", 404);
    if (attempt.student_id !== student.id) return err("FORBIDDEN", "Ruxsat yo'q.", 403);
    if (attempt.status === "completed") {
      const full = await attemptResult(env, attempt.id, true);
      return ok({ ...full, duplicate: true });
    }
    const stored = await env.DB.prepare("SELECT * FROM test_questions WHERE attempt_id = ? ORDER BY question_order").bind(attempt_id).all<{
      question_order: number; expected_answer: number;
    }>();
    const byOrder = new Map((stored.results || []).map((r) => [r.question_order, r.expected_answer]));
    // Bir xil order ikki marta kelsa — birinchisi hisoblanadi (accuracy >100% himoyasi)
    const seen = new Set<number>();
    const answers = parsed.data.answers.filter((a) => {
      if (seen.has(a.question_order)) return false;
      seen.add(a.question_order);
      return true;
    });
    let correct = 0;
    let totalMs = 0;
    const qUpdates: ReturnType<Env["DB"]["prepare"]>[] = [];
    for (const a of answers) {
      const exp = byOrder.get(a.question_order);
      if (exp === undefined) continue;
      const isC = a.answer !== null && a.answer === exp ? 1 : 0;
      if (isC) correct++;
      totalMs += a.response_time_ms || 0;
      qUpdates.push(
        env.DB.prepare("UPDATE test_questions SET student_answer = ?, is_correct = ?, response_time_ms = ? WHERE attempt_id = ? AND question_order = ?")
          .bind(a.answer, isC, a.response_time_ms || 0, attempt_id, a.question_order)
      );
    }
    // Unanswered → wrong
    const answeredOrders = new Set(answers.map((a) => a.question_order));
    for (const r of stored.results || []) {
      if (!answeredOrders.has(r.question_order)) {
        qUpdates.push(
          env.DB.prepare("UPDATE test_questions SET student_answer = NULL, is_correct = 0 WHERE attempt_id = ? AND question_order = ?").bind(attempt_id, r.question_order)
        );
      }
    }
    const total = attempt.total_questions;
    const wrong = total - correct;
    const { accuracy, score } = calcScore(correct, total);
    const avgMs = answers.length ? Math.round(totalMs / answers.length) : 0;
    const finished = nowSec();
    // Faqat in_progress → completed o'tadi (parallel submit race himoyasi).
    // Avval status'ni atomik o'tkazamiz — yutqazgan parallel so'rov savollarni ezmaydi.
    let upd;
    try {
      upd = await env.DB.prepare("UPDATE test_attempts SET correct_count=?, wrong_count=?, accuracy=?, score=?, duration_seconds=?, avg_response_ms=?, status='completed', finished_at=?, client_request_id=? WHERE id=? AND status='in_progress'")
        .bind(correct, wrong, accuracy, score, duration_seconds || finished - attempt.started_at, avgMs, finished, client_request_id || null, attempt_id).run();
    } catch (e) {
      // client_request_id UNIQUE buzilsa — idempotent duplicate sifatida qaytaramiz (500 emas)
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNIQUE|unique|client_request_id/i.test(msg) && client_request_id) {
        const dup = await env.DB.prepare("SELECT id, student_id FROM test_attempts WHERE client_request_id = ?").bind(client_request_id).first<{ id: string; student_id: string }>();
        if (dup && dup.student_id === student.id) {
          const full = await attemptResult(env, dup.id, true);
          return ok({ ...full, duplicate: true });
        }
      }
      throw e;
    }
    if ((upd.meta.changes ?? 0) === 0) {
      const full = await attemptResult(env, attempt_id, true);
      return ok({ ...full, duplicate: true });
    }
    // Endi savollarni batch bilan saqlaymiz (N+1 sequential emas)
    for (let i = 0; i < qUpdates.length; i += 50) {
      await env.DB.batch(qUpdates.slice(i, i + 50));
    }
    // Daily: attempt'ning date_key'i bilan (start sanasi) + finished sanasi farq qilsa ikkalasini ham yangilash
    const startKey = (attempt as unknown as { date_key?: string }).date_key || tashkentDateKey(attempt.started_at * 1000);
    const finishKey = tashkentDateKey(finished * 1000);
    await upsertDaily(env, student.id, startKey);
    if (finishKey !== startKey) await upsertDaily(env, student.id, finishKey);
    const full = await attemptResult(env, attempt_id, true);
    return ok(full);
  }

  // GET /api/attempts/:id
  m = path.match(/^\/api\/attempts\/([^/]+)$/);
  if (m && req.method === "GET") {
    const teacher = await getTeacher(req, env);
    const student = teacher ? null : await getStudent(req, env);
    if (!teacher && !student) return err("UNAUTH", "Avval tizimga kiring.", 401);
    const attempt = await env.DB.prepare("SELECT student_id, status FROM test_attempts WHERE id = ?").bind(m[1]).first<{ student_id: string; status: string }>();
    if (!attempt) return err("NOT_FOUND", "Natija topilmadi.", 404);
    if (student && attempt.student_id !== student.id) return err("FORBIDDEN", "Ruxsat yo'q.", 403);
    // Cheat himoyasi: tugallanmagan test javoblari studentga ko'rinmaydi
    const showAnswers = !!teacher || attempt.status === "completed";
    const full = await attemptResult(env, m[1], showAnswers);
    return ok(full);
  }

  // GET /api/teacher/attempts (history + filters)
  if (req.method === "GET" && path === "/api/teacher/attempts") {
    const teacher = await getTeacher(req, env);
    if (!teacher) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
    const studentId = url.searchParams.get("student_id") || "";
    const groupId = url.searchParams.get("group_id") || "";
    const sectionId = url.searchParams.get("section_id") || "";
    const level = url.searchParams.get("level") || "";
    const date = url.searchParams.get("date") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "15", 10) || 15));
    const where: string[] = ["a.status = 'completed'"];
    const binds: unknown[] = [];
    if (studentId) { where.push("a.student_id = ?"); binds.push(studentId); }
    if (sectionId) { where.push("a.section_id = ?"); binds.push(sectionId); }
    if (level) { where.push("a.difficulty = ?"); binds.push(level); }
    if (date) { where.push("a.date_key = ?"); binds.push(date); }
    if (groupId) { where.push("s.group_id = ?"); binds.push(groupId); }
    const w = `WHERE ${where.join(" AND ")}`;
    const total = await env.DB.prepare(`SELECT COUNT(*) as c FROM test_attempts a JOIN students s ON s.id = a.student_id ${w}`).bind(...binds).first<{ c: number }>();
    const rows = await env.DB.prepare(
      `SELECT a.*, s.full_name as student_name, s.student_code FROM test_attempts a JOIN students s ON s.id = a.student_id ${w} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, (page - 1) * limit).all();
    return ok({ items: rows.results || [], total: total?.c || 0, page, limit });
  }

  return null;
}

// Resume: ochiq urinishni DB dan qayta tiklab qaytarish (javobsiz)
async function flashPayload(
  env: Env,
  attemptId: string,
  test: { id: string; name: string; difficulty: string; time_limit_seconds: number },
  intervalMs: number
): Promise<Response> {
  const qs = await env.DB.prepare(
    "SELECT question_order, question_text, flash_numbers_json FROM test_questions WHERE attempt_id = ? ORDER BY question_order"
  ).bind(attemptId).all<{ question_order: number; question_text: string; flash_numbers_json: string | null }>();
  const rows = qs.results || [];
  const examples = rows.map((r) => {
    try {
      const arr = r.flash_numbers_json ? (JSON.parse(r.flash_numbers_json) as string[]) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch { /* fallback below */ }
    return parseFlashExpression(r.question_text);
  });
  return ok({
    attempt_id: attemptId,
    resumed: true,
    test: { id: test.id, name: test.name, difficulty: test.difficulty, time_limit_seconds: test.time_limit_seconds, allow_back: false, mode: "flash" as const },
    flash: { examples, interval_ms: intervalMs },
    questions: rows.map((r, i) => ({ order: r.question_order, text: `${i + 1}-misol: ${examples[i]?.length || 0} ta son chaqadi` })),
  });
}

async function attemptResult(env: Env, attemptId: string, includeAnswers = true) {
  const a = await env.DB.prepare("SELECT * FROM test_attempts WHERE id = ?").bind(attemptId).first();
  const cols = includeAnswers
    ? "question_order, question_text, expected_answer, student_answer, is_correct, response_time_ms"
    : "question_order, question_text, student_answer, is_correct, response_time_ms";
  const qs = await env.DB.prepare(`SELECT ${cols} FROM test_questions WHERE attempt_id = ? ORDER BY question_order`).bind(attemptId).all();
  const avgSec = a && (a as Record<string, unknown>)["total_questions"] ? Number((a as Record<string, unknown>)["avg_response_ms"]) / 1000 : 0;
  return { attempt: a, questions: qs.results || [], avg_response_sec: Math.round(avgSec * 10) / 10 };
}

async function upsertDaily(env: Env, studentId: string, dateKey: string): Promise<void> {
  const agg = await env.DB.prepare(
    "SELECT COUNT(*) as tests, COALESCE(SUM(total_questions),0) as questions, COALESCE(SUM(correct_count),0) as correct, COALESCE(SUM(wrong_count),0) as wrong FROM test_attempts WHERE student_id = ? AND date_key = ? AND status='completed'"
  ).bind(studentId, dateKey).first<{ tests: number; questions: number; correct: number; wrong: number }>();
  const act = await env.DB.prepare("SELECT COALESCE(SUM(active_seconds),0) as s FROM activity_sessions WHERE student_id = ? AND date_key = ?").bind(studentId, dateKey).first<{ s: number }>();
  const questions = agg?.questions || 0;
  const accuracy = questions ? Math.round(((agg?.correct || 0) / questions) * 1000) / 10 : 0;
  await env.DB.prepare(
    `INSERT INTO daily_stats (id, student_id, date_key, total_tests, total_questions, correct_count, wrong_count, accuracy, active_seconds, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id, date_key) DO UPDATE SET total_tests=excluded.total_tests, total_questions=excluded.total_questions, correct_count=excluded.correct_count, wrong_count=excluded.wrong_count, accuracy=excluded.accuracy, active_seconds=excluded.active_seconds, updated_at=excluded.updated_at`
  ).bind(uid(), studentId, dateKey, agg?.tests || 0, questions, agg?.correct || 0, agg?.wrong || 0, accuracy, act?.s || 0, nowSec()).run();
}
