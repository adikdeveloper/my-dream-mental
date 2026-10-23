import { useEffect, useRef } from "react";
import { api } from "../lib/api";

// Real active-time tracking: counts only when tab visible; heartbeats every 25s.
export function useActiveTime(enabled: boolean) {
  const accRef = useRef(0);
  const lastRef = useRef<number>(Date.now());
  const sessionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    lastRef.current = Date.now();
    // Sessiya yaroqsiz bo'lsa (401) spam qilmaslik uchun to'xtatamiz
    let stopped = false;

    const tick = () => {
      if (document.visibilityState === "visible") {
        accRef.current += (Date.now() - lastRef.current) / 1000;
      }
      lastRef.current = Date.now();
    };
    const vis = () => { lastRef.current = Date.now(); };
    const iv = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", vis);

    const send = async (final = false) => {
      if (stopped) return;
      tick();
      const secs = Math.floor(accRef.current);
      if (secs < 5 && !final) return;
      if (secs <= 0) return;
      const toSend = Math.min(secs, 120);
      try {
        const r = await api.post<{ session_id?: string; ignored?: boolean }>("/api/activity/heartbeat", {
          active_seconds: toSend,
          session_id: sessionRef.current,
        }, final);
        // Muvaffaqiyatli yuborilgandan keyingina hisoblagichni nollaymiz (offline yo'qotish fix)
        accRef.current = Math.max(0, accRef.current - toSend);
        if (r.session_id) sessionRef.current = r.session_id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        // Auth xato (sessiya yo'q/yaroqsiz) → keyingi urinishlar ham 401 bo'ladi, spamni to'xtatamiz
        if (/kod orqali|tizimga|UNAUTH|401/i.test(msg)) stopped = true;
        /* offline → hisoblagich saqlanadi, keyingi heartbeat'da qayta uriniladi */
      }
    };
    const hb = setInterval(() => void send(false), 25000);
    const before = () => void send(true);
    window.addEventListener("beforeunload", before);

    return () => {
      clearInterval(iv);
      clearInterval(hb);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("beforeunload", before);
      void send(true);
    };
  }, [enabled]);
}

export function useCountdown(totalSeconds: number, onExpire: () => void) {
  const ref = useRef<{ left: number }>({ left: totalSeconds });
  const cbRef = useRef(onExpire);
  cbRef.current = onExpire;
  useEffect(() => {
    ref.current.left = totalSeconds;
    const iv = setInterval(() => {
      ref.current.left -= 1;
      if (ref.current.left <= 0) {
        clearInterval(iv);
        cbRef.current();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [totalSeconds]);
}
