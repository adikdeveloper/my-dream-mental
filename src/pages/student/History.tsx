import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Badge, Loading, EmptyState, Pagination, GhostButton } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { t } from "../../lib/i18n";
import type { Attempt } from "../../types";

export default function History() {
  const { student } = useAuth();
  const [items, setItems] = useState<Attempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!student?.id) return;
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const r = await api.get<{ items: Attempt[]; total: number }>(`/api/students/${student.id}/history?page=${page}&limit=10`);
        if (!alive) return;
        setItems(r.items);
        setTotal(r.total);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Tarixni yuklashda xatolik.");
      }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [page, student?.id]);

  if (loading) return <Loading lines={4} />;

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-white">{t.history}</h1>
        <Card className="text-center py-8">
          <p className="text-red-300 font-semibold">{error}</p>
          <div className="mt-3"><GhostButton onClick={() => window.location.reload()}>Qayta urinish</GhostButton></div>
        </Card>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-white">{t.history}</h1>
        <EmptyState icon="📜" text={t.noResults} action={<Link to="/student/dashboard" className="btn-primary inline-block">🏠 Dashboard</Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-white">📜 {t.history}</h1>
      <Card className="divide-y divide-white/10 !p-2">
        {items.map((a) => (
          <Link key={a.id} to={`/student/result/${a.id}`} className="flex items-center gap-3 py-3 px-3 hover:bg-white/5 rounded-xl transition hover:translate-x-1 hover:border-gold-500/30 border border-transparent">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-white/5 text-lg shrink-0">⚡</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-100 truncate">{a.test_name}</div>
              <div className="text-xs text-slate-400">{a.date_key} · {a.correct_count}/{a.total_questions} to'g'ri</div>
            </div>
            <Badge tone={a.accuracy >= 70 ? "green" : "yellow"}>{Math.round(a.accuracy)}%</Badge>
            <span className="font-extrabold text-gold-300">{a.score}</span>
          </Link>
        ))}
      </Card>
      <Pagination page={page} total={total} limit={10} onPage={setPage} />
    </div>
  );
}
