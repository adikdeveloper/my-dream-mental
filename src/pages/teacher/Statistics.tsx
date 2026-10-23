import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Loading, GhostButton, Pagination, useToast } from "../../components/ui";
import { formatShort } from "../../lib/utils";
import type { Attempt, Group } from "../../types";

export default function Statistics() {
  const [items, setItems] = useState<Attempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = async (pageArg?: number) => {
    setLoading(true);
    try {
      const p = pageArg ?? page;
      const r = await api.get<{ items: Attempt[]; total: number }>(
        `/api/teacher/attempts?page=${p}&limit=15&date=${date}&group_id=${groupId}`
      );
      setItems(r.items); setTotal(r.total);
      if (!groups.length) {
        const g = await api.get<{ items: Group[] }>("/api/groups");
        setGroups(g.items);
      }
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold text-white">📈 Testlar tarixi</h1>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/export/results.csv${date ? `?date=${date}` : ""}`} className="rounded-xl px-4 py-2.5 font-semibold border border-white/15 bg-white/5 text-sm text-slate-200 hover:bg-white/10 transition">📥 Natijalar (CSV)</a>
          <a href="/api/export/daily.csv" className="rounded-xl px-4 py-2.5 font-semibold border border-white/15 bg-white/5 text-sm text-slate-200 hover:bg-white/10 transition">📥 Kunlik (CSV)</a>
        </div>
      </div>
      <Card>
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="date" className="input sm:w-52" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Sana" />
          <select className="input sm:w-52" value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Guruh">
            <option value="">Barcha guruhlar</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <GhostButton onClick={() => { setPage(1); void load(1); }}>Filter</GhostButton>
        </div>
      </Card>
      {loading ? <Loading lines={6} /> : (
        <Card className="overflow-x-auto p-2">
          <table className="tbl min-w-[760px]">
            <thead><tr>
              <th>O'quvchi</th><th>Test</th><th>Sana</th>
              <th>Natija</th><th>Aniqlik</th><th>Ball</th><th>Vaqt</th>
            </tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold text-slate-100">{a.student_name}</td>
                  <td className="text-slate-300">{a.test_name}</td>
                  <td className="text-slate-400 text-xs">{a.date_key}</td>
                  <td className="text-slate-200">{a.correct_count} / {a.total_questions}</td>
                  <td className="text-slate-200">{Math.round(a.accuracy)}%</td>
                  <td className="font-bold text-gold-300">{a.score}</td>
                  <td className="text-slate-300">{formatShort(a.duration_seconds)}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td className="text-slate-500" colSpan={7}>Hali natija yo'q.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={page} total={total} limit={15} onPage={setPage} />
    </div>
  );
}
