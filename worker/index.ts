import type { Env } from "./db/client";
import { err, isSameOrigin } from "./db/client";
import { routeAuth } from "./routes/auth";
import { routeStudents } from "./routes/students";
import { routeGroups, routeMeta } from "./routes/groups";
import { routeTests } from "./routes/tests";
import { routeDashboard, routeActivity, routeLeaderboard } from "./routes/dashboard";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Health
    if (url.pathname === "/api/health" && req.method === "GET") {
      return Response.json({ ok: true, app: env.APP_NAME || "MY DREAM MENTAL", time: new Date().toISOString() });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        // CSRF: cookie-based mutations must come from same origin
        if ((req.method === "POST" || req.method === "PUT" || req.method === "DELETE") && !isSameOrigin(req)) {
          return err("FORBIDDEN", "So'rov manbasi noto'g'ri.", 403);
        }
        const handlers = [routeAuth, routeMeta, routeGroups, routeStudents, routeTests, routeDashboard, routeLeaderboard, routeActivity];
        for (const h of handlers) {
          const res = await h(req, env, url);
          if (res) return res;
        }
        return err("NOT_FOUND", "API topilmadi.", 404);
      } catch (e) {
        console.error("API error:", e);
        return err("SERVER", "Serverda xatolik. Qayta urinib ko'ring.", 500);
      }
    }

    // SPA static assets (via Cloudflare assets binding)
    // React Router client-side route'lar (/student/login, /teacher/dashboard...)
    // uchun refresh'da 404 bo'lmasligi shart → topilmasa index.html qaytaramiz.
    try {
      const assetRes = await env.ASSETS.fetch(req);
      if (assetRes.status !== 404) return assetRes;
      if (req.method === "GET") {
        const accept = req.headers.get("accept") || "";
        // Faqat brauzer sahifa so'raganda fallback (css/js/png uchun emas)
        if (accept.includes("text/html")) {
          const indexReq = new Request(new URL("/index.html", url).toString(), {
            method: "GET",
            headers: { accept: "text/html" },
          });
          const indexRes = await env.ASSETS.fetch(indexReq);
          if (indexRes.ok) {
            return new Response(indexRes.body, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }
        }
      }
      return assetRes;
    } catch {
      // Fallback for local vite dev (no ASSETS binding): let vite handle it
      return err("NOT_FOUND", "Topilmadi.", 404);
    }
  },
};
