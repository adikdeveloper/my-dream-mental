// Tiny in-memory rate limiter (per Worker isolate). Backed also by login_attempts table for abuse audit.
const buckets = new Map<string, { count: number; resetAt: number }>();

function evictExpired(now: number): void {
  // Xotira oqishini oldini olish: muddati o'tganlarni tozalash, limitdan oshsa eng eskilarni o'chirish
  if (buckets.size < 2000) {
    if (buckets.size % 100 === 0) {
      for (const [k, v] of buckets) {
        if (now > v.resetAt) buckets.delete(k);
        if (buckets.size < 1500) break;
      }
    }
    return;
  }
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
    if (buckets.size < 1000) break;
  }
}

export function checkRate(key: string, limit: number, windowSec: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  evictExpired(now);
  const cur = buckets.get(key);
  if (!cur || now > cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, retryAfter: 0 };
  }
  if (cur.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((cur.resetAt - now) / 1000) };
  }
  cur.count++;
  return { allowed: true, retryAfter: 0 };
}
