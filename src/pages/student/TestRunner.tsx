import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, parseAnswer, sanitizeAnswerInput } from "../../lib/api";
import { Card, Button, ProgressBar, Loading, useToast } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { t } from "../../lib/i18n";
import { useActiveTime } from "../../hooks/useActiveTime";

interface Q { order: number; text: string; }
interface StartRes {
  attempt_id: string;
  resumed?: boolean;
  test: { id: string; name: string; difficulty: string; time_limit_seconds: number; allow_back: boolean; mode?: string };
  questions: Q[];
  flash?: { examples: string[][]; interval_ms: number };
}

// Module-level start dedupe: React StrictMode (dev) va ikki marta bosishda
// ikkinchi POST yuborilmaydi — bir xil kalit uchun promise qayta ishlatiladi.
const startPromises = new Map<string, Promise<StartRes>>();
// Bir xil attempt uchun "davom ettirilmoqda" toast bir marta chiqsin
const shownResumeToasts = new Set<string>();

export default function TestRunner() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const { push } = useToast();
  const [data, setData] = useState<StartRes | null>(null);
  const [exIdx, setExIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const finishRef = useRef(false);
  const dataRef = useRef<StartRes | null>(null);
  const answersRef = useRef<string[]>([]);
  const timesRef = useRef<number[]>([]);
  const { student } = useAuth();
  // Faqat login qilingan student uchun (auth'siz 401 spam bo'lmasligi uchun)
  useActiveTime(!!student);

  const finish = useCallback(async (auto = false) => {
    const d = dataRef.current;
    if (!d || finishRef.current) return;
    finishRef.current = true;
    setSubmitting(true);
    const payload = {
      attempt_id: d.attempt_id,
      answers: d.questions.map((qq, i) => ({
        question_order: qq.order,
        answer: parseAnswer(answersRef.current[i]),
        response_time_ms: Math.min(3600000, Math.round(timesRef.current[i] || 0)),
      })),
      duration_seconds: Math.round((Date.now() - startRef.current) / 1000),
      client_request_id: d.attempt_id,
    };
    try {
      await api.post(`/api/tests/${d.test.id}/submit`, payload);
      try { localStorage.removeItem(`mdm_draft_${d.attempt_id}`); } catch { /* ignore */ }
      nav(`/student/result/${d.attempt_id}`);
    } catch (e) {
      push(auto ? "Vaqt tugadi, lekin " + t.submitError : (e instanceof Error ? e.message : t.submitError), "err");
      finishRef.current = false;
      setSubmitting(false);
    }
  }, [nav, push]);

  const finishStable = useRef(finish);
  finishStable.current = finish;

  useEffect(() => {
    if (!id) return;
    const queryStr = search.toString();
    // Boshqa testga o'tganda eski holatni darhol tozalash —
    // aks holda eski test ekranda qolib "oldingi testga o'tkazvordi"dek ko'rinadi,
    // finishRef true qolib yangi test yakunlanmay qoladi.
    dataRef.current = null;
    answersRef.current = [];
    timesRef.current = [];
    finishRef.current = false;
    startRef.current = Date.now();
    setData(null);
    setExIdx(0);
    setLeft(0);
    setSubmitting(false);
    const myKey = `${id}?${queryStr}`;
    let cancelled = false;
    const num = (k: string) => {
      const v = Number(search.get(k));
      return Number.isFinite(v) ? v : undefined;
    };
    const overrides: Record<string, number> = {};
    for (const k of ["examples", "flash_numbers", "flash_interval_ms", "min_number", "max_number"]) {
      const v = num(k);
      if (v !== undefined) overrides[k] = v;
    }
    if (search.get("minus") === "0") overrides.minus = 0;
    const cacheKey = myKey;
    if (startPromises.size > 50) startPromises.clear(); // xotira himoyasi
    let p = startPromises.get(cacheKey);
    if (!p) {
      p = api.post<StartRes>(`/api/tests/${id}/start`, Object.keys(overrides).length ? overrides : undefined);
      startPromises.set(cacheKey, p);
      // Settle bo'lganda cache tozalanadi: StrictMode double-call bir tick ichida
      // bir xil promise'ni oladi (hali resolve bo'lmagan), keyingi kirishlarda esa
      // eski attempt_id qayta ishlatilmaydi (stale fix).
      const cleanup = () => { startPromises.delete(cacheKey); };
      p.then(cleanup, cleanup);
    }
    p
      .then((r) => {
        if (cancelled) return;
        // Kechikkan eski javob yangi testni ezmasin
        if (`${id}?${search.toString()}` !== myKey) return;
        if (!r.flash || !Array.isArray(r.flash.examples) || r.flash.examples.length === 0) {
          push("Bu test eski formatda (standard). O'qituvchidan testni flash rejimda qayta yaratishni so'rang.", "err");
          nav("/student/dashboard");
          return;
        }
        dataRef.current = r;
        // Resume bo'lsa — local draft'dan javoblarni tiklash
        let restored: string[] | null = null;
        let restoredTimes: number[] | null = null;
        try {
          const raw = localStorage.getItem(`mdm_draft_${r.attempt_id}`);
          if (raw) {
            const parsed = JSON.parse(raw) as { answers?: string[]; times?: number[] };
            if (Array.isArray(parsed.answers) && Array.isArray(parsed.times)) {
              restored = parsed.answers;
              restoredTimes = parsed.times;
            }
          }
        } catch { /* ignore */ }
        const n = r.flash.examples.length;
        const answers = new Array(n).fill("");
        const times = new Array(n).fill(0);
        if (restored && r.resumed) {
          for (let i = 0; i < Math.min(n, restored.length); i++) {
            if (typeof restored[i] === "string") answers[i] = restored[i];
            if (typeof restoredTimes?.[i] === "number") times[i] = restoredTimes[i];
          }
        }
        answersRef.current = answers;
        timesRef.current = times;
        // Qolgan misoldan davom ettirish (resume)
        let startIdx = 0;
        if (r.resumed) {
          const firstEmpty = answers.findIndex((a) => !a);
          startIdx = firstEmpty === -1 ? 0 : firstEmpty;
        }
        setExIdx(startIdx);
        setData(r);
        setLeft(r.test.time_limit_seconds);
        startRef.current = Date.now();
        if (r.resumed && !shownResumeToasts.has(r.attempt_id)) {
          shownResumeToasts.add(r.attempt_id);
          if (shownResumeToasts.size > 50) {
            const first = shownResumeToasts.values().next().value;
            if (first) shownResumeToasts.delete(first);
          }
          push("Avvalgi urinish davom ettirilmoqda.", "info");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        push(e instanceof Error ? e.message : "Xatolik", "err"); nav("/student/dashboard");
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, search]);

  // Umumiy timer
  useEffect(() => {
    if (!data) return;
    const iv = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(iv);
          void finishStable.current(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [data]);

  if (!data || !data.flash) return <div className="min-h-screen p-4"><div className="max-w-xl mx-auto"><Loading lines={4} /></div></div>;

  const totalEx = data.flash.examples.length;
  const donePct = Math.round(((exIdx) / Math.max(1, totalEx)) * 100);
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  const handleExampleDone = (answer: string, ms: number) => {
    const idx = exIdx;
    answersRef.current[idx] = answer;
    timesRef.current[idx] = ms;
    // Draft'ni saqlash — yangilash/yopilishda resume to'liq ishlaydi
    try {
      const d = dataRef.current;
      if (d) localStorage.setItem(`mdm_draft_${d.attempt_id}`, JSON.stringify({ answers: answersRef.current, times: timesRef.current }));
    } catch { /* ignore */ }
    if (idx + 1 >= totalEx) {
      void finish(false);
    } else {
      setExIdx((p) => p + 1);
    }
  };

  return (
    <div className="m-page min-h-screen p-3 sm:p-4">
      <div className="max-w-xl mx-auto space-y-3 sm:space-y-4 page-anim">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-white text-[15px] sm:text-base">{data.test.name}</div>
              <div className="text-[11px] text-slate-400">Son miltillashi mashqi</div>
            </div>
            <span className="font-mono font-bold text-[13px] text-red-400" aria-label="Qolgan vaqt">
              ⏱ {mm}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">{exIdx + 1}-misol / {totalEx} dan</span>
            <span>{donePct}% bajarildi</span>
          </div>
          <ProgressBar value={exIdx + 1} max={totalEx} className="mt-1.5" />
        </div>

        <ExamplePlayer
          key={`${data.attempt_id}-${exIdx}`}
          numbers={data.flash.examples[Math.min(exIdx, totalEx - 1)] || []}
          intervalMs={data.flash.interval_ms}
          exNum={Math.min(exIdx + 1, totalEx)}
          totalEx={totalEx}
          submitting={submitting}
          onDone={handleExampleDone}
        />

        <button type="button" onClick={() => void finish(false)} disabled={submitting} className="w-full text-[12px] text-slate-500 hover:text-red-400 py-1.5 transition">
          Testni muddatidan oldin yakunlash
        </button>
      </div>
    </div>
  );
}

// ---------------- Bitta misol playeri: countdown → ketma-ket chaqnash → javob ----------------
function ExamplePlayer({ numbers, intervalMs, exNum, totalEx, submitting, onDone }: {
  numbers: string[];
  intervalMs: number;
  exNum: number;
  totalEx: number;
  submitting: boolean;
  onDone: (answer: string, responseMs: number) => void;
}) {
  const [phase, setPhase] = useState<"count" | "flash" | "answer">("count");
  const [count, setCount] = useState(3);
  const [flashIdx, setFlashIdx] = useState(-1);
  const [answer, setAnswer] = useState("");
  const answerStart = useRef(0);

  // 3-2-1 (faqat birinchi misolda uzoq, keyingilarida qisqa)
  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) { setPhase("flash"); return; }
    const to = setTimeout(() => setCount((c) => c - 1), exNum === 1 ? 650 : 400);
    return () => clearTimeout(to);
  }, [phase, count, exNum]);

  // Ketma-ket chaqnash: ko'rinadi → o'chadi → keyingi
  useEffect(() => {
    if (phase !== "flash") return;
    let dead = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      await sleep(350);
      for (let i = 0; i < numbers.length; i++) {
        if (dead) return;
        setFlashIdx(i);
        await sleep(Math.max(250, intervalMs - 150));
        if (dead) return;
        setFlashIdx(-1);
        await sleep(150);
      }
      if (dead) return;
      answerStart.current = Date.now();
      setPhase("answer");
    })();
    return () => { dead = true; };
  }, [phase, numbers, intervalMs]);

  const shown = flashIdx >= 0 ? numbers[flashIdx] : null;

  const pressKey = (k: string) => {
    if (k === "back") setAnswer((a) => sanitizeAnswerInput(a.slice(0, -1)));
    else if (k === "clear") setAnswer("");
    else setAnswer((a) => sanitizeAnswerInput((a + k).slice(0, 6)));
    if (answerStart.current === 0) answerStart.current = Date.now();
  };

  return (
    <Card className="m-card text-center py-5 sm:py-8">
      <div className="hidden sm:block text-sm text-slate-400 mb-1">{exNum}-misol / {totalEx} · {numbers.length} ta son</div>

      {phase === "count" && (
        <div className="py-8 sm:py-10">
          <div key={count} className="text-7xl sm:text-8xl font-extrabold text-gold-300 animate-pop" aria-live="polite">{count}</div>
          <p className="text-slate-400 mt-3 text-[13px] sm:text-base">Tayyorlaning... sonlar chiqadi</p>
        </div>
      )}

      {phase === "flash" && (
        <div className="py-8 sm:py-10" aria-live="polite">
          <div key={flashIdx} className="text-7xl sm:text-9xl font-extrabold tracking-tight min-h-[1.2em] text-white animate-pop">
            {shown ?? <span className="opacity-0">0</span>}
          </div>
          <div className="mt-2 inline-block rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold px-3 py-1">Yozilayotgan son ▼</div>
          <p className="text-slate-500 mt-2 text-[12px] sm:text-sm">Eslab qoling... ({flashIdx + 1}/{numbers.length})</p>
        </div>
      )}

      {phase === "answer" && (
        <div className="animate-fadeUp">
          <h2 className="text-[15px] sm:text-xl font-bold text-white">Javobni kiriting:</h2>
          <form className="mt-3 sm:mt-5" onSubmit={(e) => { e.preventDefault(); onDone(answer, Date.now() - answerStart.current); }}>
            <input
              autoFocus
              inputMode="numeric"
              aria-label="Misol javobi"
              className="input text-center text-3xl sm:text-4xl font-bold !py-3"
              placeholder="|"
              value={answer}
              onChange={(e) => setAnswer(sanitizeAnswerInput(e.target.value))}
            />
            <Button disabled={submitting || answer.trim() === ""} className="w-full mt-3 text-[14px] sm:text-lg !py-3">
              {submitting ? t.loading : "JAVOBNI TASDIQLASH ✓"}
            </Button>
          </form>
          {/* Telefon uchun kustom klaviatura (Figma) — desktopda yashirin */}
          <div className="m-keys sm:hidden" aria-hidden={false}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clear"].map((k) => (
              <button
                key={k}
                type="button"
                className="m-key"
                onClick={() => pressKey(k)}
                aria-label={k === "back" ? "O'chirish" : k === "clear" ? "Tozalash" : `Raqam ${k}`}
              >
                {k === "back" ? "⌫" : k === "clear" ? "C" : k}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
