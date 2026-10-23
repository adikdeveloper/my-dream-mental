import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, StatCard, Loading, Badge } from "../../components/ui";
import { BarChart } from "../../components/Charts";
import { formatShort } from "../../lib/utils";
import { Logo } from "../../components/Logo";

interface Dash {
  total_students: number; active_today: number; today_questions: number;
  today_tests: number; today_accuracy: number; today_active_seconds: number;
  total_active_seconds: number;
  week: { date_key: string; q: number; t: number; acc: number }[];
  top: { id: string; full_name: string; student_code: string; q: number; acc: number; score: number }[];
}

export default function TeacherDashboard() {
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Dash>("/api/dashboard/teacher").then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <Card><p className="text-red-400">{error}</p></Card>;
  if (!d) return <Loading lines={5} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Logo size={48} />
        <h1 className="text-2xl font-extrabold text-white">O'qituvchi paneli</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon="👥" label="Jami o'quvchilar" value={String(d.total_students)} />
        <StatCard icon="🟢" label="Bugun faol" value={String(d.active_today)} accent="text-emerald-300" />
        <StatCard icon="🧮" label="Bugungi misollar" value={String(d.today_questions)} accent="text-gold-300" />
        <StatCard icon="📝" label="Bugungi testlar" value={String(d.today_tests)} />
        <StatCard icon="🎯" label="O'rtacha aniqlik" value={`${d.today_accuracy}%`} />
        <StatCard icon="⏳" label="Bugungi faol vaqt" value={formatShort(d.today_active_seconds)} sub={`Jami: ${formatShort(d.total_active_seconds)}`} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-bold mb-3 text-white">So'nggi 7 kun (misollar)</h2>
          <BarChart items={d.week.map((w) => ({ label: w.date_key.slice(5), value: w.q || 0 }))} />
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white">Bugungi reyting (Top-5)</h2>
            <Link to="/teacher/students" className="text-sm text-gold-300 font-semibold">Barchasi →</Link>
          </div>
          <div className="space-y-2">
            {d.top.length === 0 && <p className="text-sm text-slate-500">Bugun hali natija yo'q.</p>}
            {d.top.map((s, i) => (
              <Link key={s.id} to={`/teacher/students/${s.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5 hover:border-gold-500/40 transition hover:translate-x-1">
                <span className="font-extrabold text-gold-400 w-6">{i + 1}</span>
                <span className="font-semibold flex-1 truncate text-slate-100">{s.full_name}</span>
                <Badge tone="blue">{Math.round(s.acc || 0)}%</Badge>
                <span className="text-sm text-slate-400">{s.q} ta</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
