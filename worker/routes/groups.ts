import type { Env } from "../db/client";
import { err, ok, safeJson, nowSec, uid } from "../db/client";
import { getTeacher } from "../middleware/auth";
import { groupSchema } from "../db/validate";

export async function routeGroups(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith("/api/groups")) return null;
  const teacher = await getTeacher(req, env);
  if (!teacher) return err("UNAUTH", "Avval tizimga kiring.", 401);

  if (req.method === "GET" && path === "/api/groups") {
    const rows = await env.DB.prepare(
      `SELECT g.*, (SELECT COUNT(*) FROM students s WHERE s.group_id = g.id AND s.status='active') as student_count FROM groups g ORDER BY g.created_at ASC`
    ).all();
    return ok({ items: rows.results || [] });
  }
  if (req.method === "POST" && path === "/api/groups") {
    const body = await safeJson(req);
    const parsed = groupSchema.safeParse(body);
    if (!parsed.success) return err("VALIDATION", "Guruh nomi kamida 2 harf bo'lsin.", 400);
    const id = uid();
    await env.DB.prepare("INSERT INTO groups (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)")
      .bind(id, parsed.data.name.trim(), parsed.data.description || "", nowSec(), nowSec()).run();
    const row = await env.DB.prepare("SELECT * FROM groups WHERE id = ?").bind(id).first();
    return ok({ group: row }, 201);
  }
  const m = path.match(/^\/api\/groups\/([^/]+)$/);
  if (m) {
    if (req.method === "PUT") {
      const body = await safeJson(req);
      const parsed = groupSchema.safeParse(body);
      if (!parsed.success) return err("VALIDATION", "Ma'lumotlar noto'g'ri.", 400);
      const r = await env.DB.prepare("UPDATE groups SET name = ?, description = ?, updated_at = ? WHERE id = ?")
        .bind(parsed.data.name.trim(), parsed.data.description || "", nowSec(), m[1]).run();
      if ((r.meta.changes ?? 0) === 0) return err("NOT_FOUND", "Guruh topilmadi.", 404);
      const row = await env.DB.prepare("SELECT * FROM groups WHERE id = ?").bind(m[1]).first();
      return ok({ group: row });
    }
    if (req.method === "DELETE") {
      await env.DB.prepare("UPDATE students SET group_id = NULL WHERE group_id = ?").bind(m[1]).run();
      await env.DB.prepare("DELETE FROM groups WHERE id = ?").bind(m[1]).run();
      return ok({ message: "O'chirildi" });
    }
    if (req.method === "GET") {
      const g = await env.DB.prepare("SELECT * FROM groups WHERE id = ?").bind(m[1]).first();
      if (!g) return err("NOT_FOUND", "Guruh topilmadi.", 404);
      const students = await env.DB.prepare("SELECT id, full_name, student_code, level, status FROM students WHERE group_id = ? ORDER BY full_name").bind(m[1]).all();
      return ok({ group: g, students: students.results || [] });
    }
  }
  return null;
}

export async function routeMeta(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path === "/api/sections" && req.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM sections WHERE is_active = 1 ORDER BY sort_order").all();
    return ok({ items: rows.results || [] });
  }
  if (path === "/api/sections" && req.method === "POST") {
    const teacher = await getTeacher(req, env);
    if (!teacher) return err("FORBIDDEN", "Faqat o'qituvchi.", 403);
    const body = await safeJson(req);
    const key = String((body as Record<string, unknown>)["key"] || "").trim().toLowerCase().slice(0, 40);
    const title = String((body as Record<string, unknown>)["title_uz"] || "").trim().slice(0, 80);
    if (!key || !title) return err("VALIDATION", "Key va nom shart.", 400);
    const id = uid();
    try {
      await env.DB.prepare("INSERT INTO sections (id, key, title_uz, description_uz, icon, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
        .bind(id, key, title, String((body as Record<string, unknown>)["description_uz"] || ""), "brain", 99, nowSec()).run();
    } catch {
      return err("CONFLICT", "Bunday bo'lim allaqachon mavjud.", 409);
    }
    return ok({ message: "Saqlandi" }, 201);
  }
  if (path === "/api/levels" && req.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM levels WHERE is_active = 1 ORDER BY sort_order").all();
    return ok({ items: rows.results || [] });
  }
  return null;
}
