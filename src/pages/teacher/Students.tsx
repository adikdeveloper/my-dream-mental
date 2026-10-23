import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Badge, Modal, Button, GhostButton, Loading, EmptyState, Pagination, ConfirmDialog, useToast } from "../../components/ui";
import { formatShort, formatDateTime } from "../../lib/utils";
import type { Student, Group } from "../../types";
import { t, levelNames } from "../../lib/i18n";

export default function Students() {
  const [items, setItems] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ full_name: "", group_id: "", level: "BEGINNER", status: "active" });
  const [newCode, setNewCode] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Student | null>(null);
  const { push } = useToast();

  const load = async (pageArg?: number) => {
    setLoading(true);
    try {
      const p = pageArg ?? page;
      const r = await api.get<{ items: Student[]; total: number; page: number }>(
        `/api/students?q=${encodeURIComponent(q)}&group_id=${groupId}&page=${p}&limit=15&sort=name`
      );
      setItems(r.items); setTotal(r.total);
      const g = await api.get<{ items: Group[] }>("/api/groups");
      setGroups(g.items);
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (e: React.FormEvent) => { e.preventDefault(); setPage(1); void load(1); };

  const openAdd = () => {
    setEditing(null);
    setForm({ full_name: "", group_id: groups[0]?.id || "", level: "BEGINNER", status: "active" });
    setNewCode(null);
    setModal(true);
  };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({ full_name: s.full_name, group_id: s.group_id || "", level: s.level, status: s.status || "active" });
    setNewCode(null);
    setModal(true);
  };

  const save = async () => {
    if (form.full_name.trim().length < 2) { push("Ism kamida 2 harf bo'lsin.", "err"); return; }
    try {
      if (editing) {
        await api.put(`/api/students/${editing.id}`, { full_name: form.full_name.trim(), group_id: form.group_id || null, level: form.level, status: form.status });
        push("Saqlandi.", "ok");
      } else {
        const r = await api.post<{ student: Student }>(`/api/students`, { full_name: form.full_name.trim(), group_id: form.group_id || null, level: form.level });
        setNewCode(r.student.student_code);
        push(`Kod: ${r.student.student_code}`, "ok");
      }
      void load();
      if (editing) setModal(false);
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  const regen = async (id: string) => {
    try {
      const r = await api.post<{ student_code: string }>(`/api/students/${id}/regenerate-code`);
      setNewCode(r.student_code);
      push(`Yangi kod: ${r.student_code}`, "ok");
      void load();
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  const reactivate = async (id: string) => {
    try {
      const cur = items.find((x) => x.id === id);
      await api.put(`/api/students/${id}`, {
        full_name: cur?.full_name,
        group_id: cur?.group_id || null,
        level: cur?.level,
        status: "active",
      });
      push("Faollashtirildi.", "ok");
      void load();
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  const deactivate = async () => {
    if (!confirmDel) return;
    try {
      await api.del(`/api/students/${confirmDel.id}`);
      push("Deaktiv qilindi.", "ok");
      setConfirmDel(null);
      void load();
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold text-white">👥 O'quvchilar</h1>
        <div className="flex gap-2 no-print">
          <a href="/api/export/students.csv" className="rounded-xl px-4 py-2.5 font-semibold border border-white/15 bg-white/5 text-sm text-slate-200 hover:bg-white/10 transition">📥 {t.export}</a>
          <Button onClick={openAdd}>{t.addStudent}</Button>
        </div>
      </div>

      <Card>
        <form onSubmit={search} className="flex flex-col sm:flex-row gap-2">
          <input className="input" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Qidirish" />
          <select className="input sm:w-52" value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Guruh">
            <option value="">Barcha guruhlar</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <GhostButton type="submit">Qidirish</GhostButton>
        </form>
      </Card>

      {loading ? <Loading lines={6} /> : items.length === 0 ? (
        <EmptyState text={t.noStudents} action={<Button onClick={openAdd}>{t.addStudent}</Button>} />
      ) : (
        <Card className="overflow-x-auto p-2">
          <table className="tbl min-w-[820px]">
            <thead>
              <tr>
                <th>Ism</th><th>Kod</th><th>Guruh</th>
                <th>Level</th><th>Bugun</th><th>Aniqlik</th>
                <th>Faol vaqt</th><th>Oxirgi</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold"><Link to={`/teacher/students/${s.id}`} className="text-gold-300 hover:underline">{s.full_name}</Link></td>
                  <td className="font-mono text-xs text-slate-300">{s.student_code}</td>
                  <td className="text-slate-300">{s.group_name || "—"}</td>
                  <td><Badge tone="blue">{levelNames[s.level] || s.level}</Badge></td>
                  <td className="text-slate-200">{s.today_questions ?? 0} ta</td>
                  <td className="text-slate-200">{Math.round(s.today_accuracy || 0)}%</td>
                  <td className="text-slate-300">{formatShort(s.today_active || 0)}</td>
                  <td className="text-slate-400 text-xs">{formatDateTime(s.last_active_at)}</td>
                  <td>{s.status === "active" ? <Badge tone="green">Faol</Badge> : <Badge tone="red">Nofaol</Badge>}</td>
                  <td className="whitespace-nowrap">
                    <button onClick={() => openEdit(s)} className="mr-2 hover:scale-125 transition inline-block" title="Tahrirlash">✏️</button>
                    <button onClick={() => void regen(s.id)} className="mr-2 hover:scale-125 transition inline-block" title="Kodni qayta yaratish">🔄</button>
                    {s.status === "active" ? (
                      <button onClick={() => setConfirmDel(s)} className="hover:scale-125 transition inline-block" title="Deaktiv">🗑</button>
                    ) : (
                      <button onClick={() => void reactivate(s.id)} className="hover:scale-125 transition inline-block" title="Faollashtirish">✅</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={page} total={total} limit={15} onPage={setPage} />

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "O'quvchini tahrirlash" : t.addStudent}>
        <div className="space-y-3">
          <div><label className="label">Ism</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Guruh</label>
              <select className="input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
                <option value="">—</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Level</label>
              <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {Object.keys(levelNames).map((k) => <option key={k} value={k}>{levelNames[k]}</option>)}
              </select>
            </div>
          </div>
          {editing && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
            </div>
          )}
          {newCode && (
            <div className="rounded-xl border-2 border-dashed border-gold-500/60 bg-gold-500/10 p-4 text-center print-card">
              <div className="text-xs text-slate-400">Student kodi:</div>
              <div className="text-2xl font-mono font-bold tracking-widest text-gold-300">{newCode}</div>
              <div className="mt-2 flex gap-2 justify-center no-print">
                <GhostButton onClick={() => { void navigator.clipboard.writeText(newCode).then(() => push("Nusxalandi.", "ok")).catch(() => push("Nusxalashda xatolik.", "err")); }}>{t.copy}</GhostButton>
                <GhostButton onClick={() => window.print()}>{t.print}</GhostButton>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setModal(false)}>{t.cancel}</GhostButton>
            <Button onClick={save}>{t.save}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => void deactivate()}
        text={confirmDel ? `"${confirmDel.full_name}" deaktiv qilinsinmi? (qayta faollashtirish mumkin)` : ""}
      />
    </div>
  );
}
