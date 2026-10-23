import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, StatCard, Loading, Badge, EmptyState } from "../../components/ui";
import { Heatmap } from "../../components/Charts";
import { formatShort } from "../../lib/utils";
import { t, levelNames } from "../../lib/i18n";
import { useAuth } from "../../hooks/useAuth";
import { useActiveTime } from "../../hooks/useActiveTime";
import { StarSticker, FlameSticker } from "../../components/Stickers";
import type { TestItem, Attempt } from "../../types";

interface Dash {
  today: { total_tests: number; total_questions: number; correct_count: number; accuracy: number; active_seconds: number };
  totals: { tests: number; questions: number; correct: number; acc: number };
  total_active_seconds: number;
  recent: Attempt[];
  tests: TestItem[];
  streak: number;
  week: { date_key: string; total_questions: number }[];
}

const sectionMeta: Record<string, { icon: string; title: string; desc: string }> = {
  addition: { icon: "➕", title: "Qo'shish", desc: "Sonlarni tez qo'shishni mashq qil" },
  subtraction: { icon: "➖", title: "Ayirish", desc: "Ayirishni xatosiz bajar" },
  multiplication: { icon: "✖️", title: "Ko'paytirish", desc: "Ko'paytirish jadvalini mustahkamla" },
  division: { icon: "➗", title: "Bo'lish", desc: "Qoldiqsiz bo'lishni o'rgan" },
  mixed: { icon: "🔀", title: "Aralash", desc: "Hamma amallar bir testda" },
  speed: { icon: "⚡", title: "Tez hisoblash", desc: "Vaqtga qarshi chaqnash rejimi" },
  advanced: { icon: "🌟", title: "Murakkab", desc: "Katta sonlar bilan sinov" },
  custom: { icon: "🧩", title: "Maxsus", desc: "O'qituvchi topshirig'i" },
};

export default function StudentDashboard() {
  const { student } = useAuth();
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  // Faqat login qilingan student uchun (auth'siz 401 spam bo'lmasligi uchun)
  useActiveTime(!!student);

  useEffect(() => {
    let alive = true;
    api.get<Dash>("/api/dashboard/student").then((r) => { if (alive) setD(r); }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Yuklashda xatolik."); });
    return () => { alive = false; };
  }, []);

  const grouped = useMemo(() => {
    if (!d) return [];
    const map = new Map<string, { key: string; tests: TestItem[] }>();
    for (const test of d.tests) {
      const key = test.section_key || "custom";
      if (!map.has(key)) map.set(key, { key, tests: [] });
      map.get(key)!.tests.push(test);
    }
    return [...map.values()];
  }, [d]);

  if (error) return (
    <Card className="text-center py-8">
      <p className="text-red-300 font-semibold">{error}</p>
      <button onClick={() => window.location.reload()} className="btn-ghost-dark mt-3">Qayta urinish</button>
    </Card>
  );
  if (!d) return <Loading lines={5} />;
  const acc = d.today.total_questions ? Math.round((d.today.correct_count / d.today.total_questions) * 100) : 0;
  const firstName = student?.full_name?.split(" ")[0] || "O'quvchi";

  return (
    <div className="m-page space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* HERO — Figma mobile */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StarSticker size={44} className="sm:hidden" />
          <StarSticker size={56} className="hidden sm:block" />
          <div>
            <h1 className="text-[18px] sm:text-3xl font-extrabold text-white">Salom, {firstName}! 👋</h1>
            <p className="text-[11px] sm:text-sm text-slate-400">Aqliy mashg'ulotlarga tayyormisiz?</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-gold-500/40 bg-navy-950/60 px-2.5 py-1.5">
          <FlameSticker size={24} />
          <span className="text-[13px] font-extrabold text-gold-300">{d.streak} kun</span>
        </div>
      </div>

      <div className="m-stat-grid sm:grid sm:grid-cols-3 sm:gap-3 sm:text-center">
        <div className="m-stat-box sm:rounded-xl sm:bg-navy-950/50 sm:border sm:border-white/10 sm:py-3">
          <div className="text-[18px] sm:text-xl font-extrabold text-white">{d.today.total_questions}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">mashq yakunlandi</div>
        </div>
        <div className="m-stat-box sm:rounded-xl sm:bg-navy-950/50 sm:border sm:border-white/10 sm:py-3">
          <div className="text-[18px] sm:text-xl font-extrabold text-emerald-300">{acc}%</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">o'rtacha daraja</div>
        </div>
        <div className="m-stat-box sm:rounded-xl sm:bg-navy-950/50 sm:border sm:border-white/10 sm:py-3">
          <div className="text-[18px] sm:text-xl font-extrabold text-gold-300">{formatShort(d.today.active_seconds)}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">faol vaqt</div>
        </div>
      </div>

      {/* Faollik taqvimi — ixcham */}
      <Card className="m-card !p-3 sm:p-6">
        <div className="m-section-title text-slate-400 font-bold">FAOLLIK TAQVIMI</div>
        <div className="mt-2 flex justify-between text-center">
          {(d.week || []).slice(-7).map((w, i) => {
            const days = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
            const active = (w.total_questions || 0) > 0;
            return (
              <div key={w.date_key + i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500">{days[i % 7]}</span>
                <span className={`w-7 h-7 grid place-items-center rounded-full text-[11px] font-bold ${active ? "text-navy-950" : "bg-white/5 text-slate-500"}`}
                  style={active ? { background: "linear-gradient(135deg,#ffd97a,#f59e0b)" } : undefined}>
                  {active ? "✓" : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* MASHQLAR — Figma ro'yxat */}
      <div>
        <h2 className="font-extrabold mb-2 text-[15px] sm:text-xl text-white">⚡ Mashq Bo'limlari</h2>
        {grouped.length === 0 ? (
          <EmptyState icon="📭" text="Hozircha vazifa yo'q. O'qituvchingizdan so'rang." />
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {grouped.flatMap((g) => g.tests).slice(0, 8).map((test) => {
              const meta = sectionMeta[test.section_key || "custom"] || sectionMeta.custom;
              return (
                <Link key={test.id} to={`/student/test/${test.id}/setup`} className="m-row sm:card sm:card-hover sm:p-4 sm:flex sm:items-center sm:gap-3 no-underline">
                  <span className="grid place-items-center w-9 h-9 rounded-xl text-lg shrink-0" style={{ background: "linear-gradient(135deg,rgba(255,217,122,.25),rgba(245,158,11,.25))" }}>
                    {meta.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-bold text-white text-[13px] sm:text-base block truncate">{meta.title}</span>
                    <span className="text-[11px] sm:text-xs text-slate-400 block truncate">
                      {test.question_count} misol · {test.flash_numbers} sonli sonlar · {levelNames[test.difficulty] || test.difficulty}
                    </span>
                  </span>
                  <span className="m-play sm:btn-primary sm:!px-4 sm:!py-2.5 sm:text-sm sm:shrink-0 sm:w-auto sm:h-auto sm:rounded-xl">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* STATS — desktopda to'liq, telefonda yashirin (yuqorida ixcham bor) */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📝" label={t.todayTests} value={String(d.today.total_tests)} />
        <StatCard icon="✅" label={t.correctAnswers} value={String(d.today.correct_count)} accent="text-emerald-300" />
        <StatCard icon="⏳" label={t.totalActive} value={formatShort(d.total_active_seconds)} accent="text-gold-300" />
        <StatCard icon="🏆" label="Jami misollar" value={String(d.totals.questions)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="m-card">
          <h2 className="font-bold mb-2 text-[14px] sm:text-base text-white">So'nggi natijalar 🏆</h2>
          {d.recent.length === 0 ? (
            <p className="text-sm text-slate-500">{t.noResults}</p>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {d.recent.slice(0, 3).map((r) => (
                <Link key={r.id} to={`/student/result/${r.id}`} className="flex items-center gap-2 rounded-xl border border-white/10 px-2.5 sm:px-3 py-2 hover:bg-white/5 hover:border-gold-500/40 transition">
                  <span className="font-semibold flex-1 truncate text-slate-100 text-[13px] sm:text-sm">{r.test_name}</span>
                  <span className="text-[12px] sm:text-sm text-slate-300">{r.correct_count}/{r.total_questions}</span>
                  <Badge tone={r.accuracy >= 70 ? "green" : "yellow"}>{Math.round(r.accuracy)}%</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card className="hidden sm:block">
          <h2 className="font-bold mb-3 text-white">{t.progress} (7 kun)</h2>
          <Heatmap days={d.week.map((w) => ({ date: w.date_key, value: w.total_questions }))} />
          <p className="text-xs text-slate-500 mt-3">Har kuni mashq qil — 🔥 seriya o'sadi!</p>
        </Card>
      </div>
    </div>
  );
}
