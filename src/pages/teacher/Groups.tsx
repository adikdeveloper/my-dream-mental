import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button, GhostButton, Modal, Loading, ConfirmDialog, useToast } from "../../components/ui";
import type { Group } from "../../types";

export default function Groups() {
  const [items, setItems] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get<{ items: Group[] }>("/api/groups"); setItems(r.items); }
    catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (name.trim().length < 2) { push("Nom kamida 2 harf.", "err"); return; }
    try {
      if (editId) await api.put(`/api/groups/${editId}`, { name: name.trim() });
      else await api.post("/api/groups", { name: name.trim() });
      setModal(false); setName(""); setEditId(null);
      void load();
      push("Saqlandi.", "ok");
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  const del = async () => {
    if (!confirmDel) return;
    try { await api.del(`/api/groups/${confirmDel}`); setConfirmDel(null); void load(); } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  if (loading) return <Loading lines={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">📁 Guruhlar</h1>
        <Button onClick={() => { setEditId(null); setName(""); setModal(true); }}>+ Guruh qo'shish</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((g) => (
          <Card key={g.id} hover className="!p-0 overflow-hidden">
            <Link to={`/teacher/groups/${g.id}`} className="flex items-center gap-3 p-4 no-underline">
              <span className="grid place-items-center w-11 h-11 rounded-2xl text-2xl shrink-0" style={{ background: "linear-gradient(135deg,rgba(255,217,122,.25),rgba(245,158,11,.25))" }}>📁</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-white truncate">{g.name}</div>
                <div className="text-sm text-gold-300">{g.student_count ?? 0} nafar o'quvchi ›</div>
              </div>
            </Link>
            <div className="px-4 pb-4 flex gap-2">
              <GhostButton onClick={() => { setEditId(g.id); setName(g.name); setModal(true); }}>✏️ Tahrirlash</GhostButton>
              <GhostButton onClick={() => void setConfirmDel(g.id)}>🗑</GhostButton>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card><p className="text-slate-500">Guruhlar yo'q.</p></Card>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Guruhni tahrirlash" : "Yangi guruh"}>
        <label className="label">Guruh nomi</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: 1-guruh" />
        <div className="mt-4 flex justify-end gap-2">
          <GhostButton onClick={() => setModal(false)}>Bekor qilish</GhostButton>
          <Button onClick={save}>Saqlash</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => void del()}
        text="Guruh o'chirilsinmi? (o'quvchilar guruhsiz qoladi)"
      />
    </div>
  );
}
