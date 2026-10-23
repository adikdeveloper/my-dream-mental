// Markaziy API client: cookie sessiya + 20s timeout + bir xil xato formati.
async function parse<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/csv")) return (await res.blob()) as unknown as T;
  const body = (await res.json().catch(() => ({ ok: false, error: { message: "Xatolik" } }))) as { ok: boolean; data?: T; error?: { message?: string; code?: string } };
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message || `Xatolik (${res.status})`);
  }
  return body.data as T;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { credentials: "include", signal: ctrl.signal, ...init });
    return await parse<T>(res);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("So'rov vaqti tugadi. Internetni tekshirib qayta urinib ko'ring.");
    }
    throw e instanceof Error ? e : new Error("Internet aloqasi uzildi. Qayta urinib ko'ring.");
  } finally {
    clearTimeout(to);
  }
}

const json = (body?: unknown) => ({
  headers: { "content-type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
});

export const api = {
  get<T>(url: string): Promise<T> {
    return req<T>(url);
  },
  post<T>(url: string, body?: unknown, keepalive = false): Promise<T> {
    return req<T>(url, { method: "POST", keepalive: keepalive ? true : undefined, ...json(body) });
  },
  put<T>(url: string, body?: unknown): Promise<T> {
    return req<T>(url, { method: "PUT", ...json(body) });
  },
  del<T>(url: string): Promise<T> {
    return req<T>(url, { method: "DELETE" });
  },
};

// Javob inputlari uchun: faqat boshidagi bitta minus + raqamlar (masalan "-12", "45")
export function sanitizeAnswerInput(s: string): string {
  const neg = s.startsWith("-");
  const digits = s.replace(/[^0-9]/g, "").slice(0, 6);
  if (!digits) return neg ? "-" : "";
  return (neg ? "-" : "") + digits;
}

export function parseAnswer(s: string | undefined): number | null {
  if (s === undefined || s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
