import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, StatCard, Badge, Loading } from "../../components/ui";
import { LineChart, BarChart, Donut, Heatmap } from "../../components/Charts";
import { formatShort, formatDateTime } from "../../lib/utils";
import { levelNames } from "../../lib/i18n";
import type { Student } from "../../types";

interface Stats {
  student: Student & { group_name?: string; created_at: number };
  totals: { tests: number; questions: number; correct: number; wrong: number; accuracy: number };
  today: { total_tests: number; total_questions: number; accuracy: number; active_seconds: number } | null;
  daily: { date_key: string; total_questions: number; accuracy: number; active_seconds: number }[];
  bySection: { key: string; title_uz: string; total: number; correct: number; wrong: number; accuracy: number; avg_ms: number }[];
  streak: number;
}

export default function StudentDetail() {
  const { id } = useParams();
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) api.get<Stats>(`/api/students/${id}/statistics?days=30`).then(setS).catch((e) => setError(e instanceof Error ? e.message : "Yuklashda xatolik."));
  }, [id]);

  if (error) return <Card><p className="text-red-400">{error}</p></Card>;
  if (!s) return <Loading lines={6} />;
  const st = s.student;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="grid place-items-center w-12 h-12 rounded-2xl text-2xl font-extrabold text-navy-950" style={{ background: "linear-gradient(135deg,#ffd97a,#f59e0b)" }}>
          {st.full_name.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-2xl font-extrabold text-white">{st.full_name}</h1>
        <Badge tone="blue">{levelNames[st.level] || st.level}</Badge>
        <span className="font-mono text-sm bg-navy-950/70 border border-gold-500/40 text-gold-300 rounded-lg px-2 py-1">{st.student_code}</span>
        <span className="text-sm text-slate-400">🔥 {s.streak} kun</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📝" label="Jami testlar" value={String(s.totals.tests)} />
        <StatCard icon="🧮" label="Jami misollar" value={String(s.totals.questions)} />
        <StatCard icon="🎯" label="Aniqlik" value={`${Math.round(s.totals.accuracy || 0)}%`} accent="text-emerald-300" />
        <StatCard icon="⏳" label="Umumiy faol vaqt" value={formatShort(st.total_active_seconds || 0)} />
        <StatCard icon="📅" label="Bugungi misollar" value={String(s.today?.total_questions || 0)} />
        <StatCard icon="✅" label="Bugungi aniqlik" value={`${Math.round(s.today?.accuracy || 0)}%`} />
        <StatCard icon="⏱" label="Bugungi vaqt" value={formatShort(s.today?.active_seconds || 0)} />
        <StatCard icon="🕐" label="Oxirgi faol" value={formatDateTime(st.last_active_at)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-bold mb-2 text-white">So'nggi 30 kun (misollar)</h2>
          <BarChart items={s.daily.slice(-14).map((d) => ({ label: d.date_key.slice(5), value: d.total_questions }))} />
        </Card>
        <Card>
          <h2 className="font-bold mb-2 text-white">Aniqlik dinamikasi (%)</h2>
          <LineChart points={s.daily.slice(-14).map((d) => d.accuracy)} />
        </Card>
        <Card>
          <h2 className="font-bold mb-2 text-white">Umumiy nisbat</h2>
          <Donut correct={s.totals.correct} wrong={s.totals.wrong} />
        </Card>
        <Card>
          <h2 className="font-bold mb-2 text-white">Faollik (so'nggi kunlar)</h2>
          <Heatmap days={s.daily.slice(-28).map((d) => ({ date: d.date_key, value: d.total_questions }))} />
        </Card>
      </div>

      <Card>
        <h2 className="font-bold mb-3 text-white">Bo'limlar bo'yicha</h2>
        <div className="overflow-x-auto">
          <table className="tbl min-w-[560px]">
            <thead><tr>
              <th>Bo'lim</th><th>Jami</th><th>To'g'ri</th>
              <th>Aniqlik</th><th>O'rt. vaqt</th>
            </tr></thead>
            <tbody>
              {(s.bySection || []).map((b, i) => (
                <tr key={`${b.key || "none"}-${i}`}>
                  <td className="font-semibold text-slate-100">{b.title_uz || b.key || "—"}</td>
                  <td className="text-slate-200">{b.total}</td>
                  <td className="text-slate-200">{b.correct}</td>
                  <td className="text-slate-200">{Math.round(b.accuracy || 0)}%</td>
                  <td className="text-slate-300">{((b.avg_ms || 0) / 1000).toFixed(1)}s</td>
                </tr>
              ))}
              {(!s.bySection || s.bySection.length === 0) && <tr><td className="text-slate-500" colSpan={5}>Hali natija yo'q.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
