import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button, Badge, Loading, GhostButton, ConfirmDialog, useToast } from "../../components/ui";
import type { TestItem } from "../../types";
import { levelNames } from "../../lib/i18n";

export default function Tests() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get<{ items: TestItem[] }>("/api/tests"); setItems(r.items); }
    catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (t: TestItem) => {
    try {
      let ops: string[] = ["+"];
      try { ops = JSON.parse(t.allowed_operations || '["+"]'); } catch { /* keep default */ }
      await api.put(`/api/tests/${t.id}`, {
        name: t.name, section_id: t.section_id, difficulty: t.difficulty,
        question_count: t.question_count, time_limit_seconds: t.time_limit_seconds,
        min_number: t.min_number, max_number: t.max_number,
        allowed_operations: ops,
        allow_back: 0,
        randomize: t.randomize ?? 1,
        daily_enabled: t.daily_enabled ?? 1,
        mode: "flash",
        flash_numbers: t.flash_numbers ?? 5,
        flash_interval_ms: t.flash_interval_ms ?? 1000,
        is_active: t.is_active ? 0 : 1,
      });
      void load();
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  const del = async () => {
    if (!confirmDel) return;
    try { await api.del(`/api/tests/${confirmDel}`); setConfirmDel(null); void load(); } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  if (loading) return <Loading lines={5} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">📝 Testlar</h1>
        <Link to="/teacher/tests/create"><Button>+ Test yaratish</Button></Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((t) => (
          <Card key={t.id} hover>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-white">{t.name}</div>
                <div className="text-sm text-slate-400">{t.section_title || "—"} · {t.question_count} ta · {t.time_limit_seconds}s · {t.min_number}-{t.max_number}</div>
              </div>
              {t.is_active ? <Badge tone="green">Faol</Badge> : <Badge>Nofaol</Badge>}
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Badge tone="blue">{levelNames[t.difficulty] || t.difficulty}</Badge>
              {t.mode === "flash" && <Badge tone="yellow">⚡ Flash ({t.flash_numbers} son)</Badge>}
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Link to={`/teacher/tests/${t.id}/edit`}><GhostButton>✏️ Tahrirlash</GhostButton></Link>
              <GhostButton onClick={() => void toggle(t)}>{t.is_active ? "O'chirish" : "Yoqish"}</GhostButton>
              <GhostButton onClick={() => setConfirmDel(t.id)}>🗑</GhostButton>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card><p className="text-slate-500">Testlar yo'q. Birinchi testni yarating.</p></Card>}
      </div>
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => void del()}
        text="Test o'chirilsinmi? Eski natijalar saqlanib qoladi."
      />
    </div>
  );
}
