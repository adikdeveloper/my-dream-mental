import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button, GhostButton, useToast } from "../../components/ui";
import type { Section } from "../../types";
import { levelNames } from "../../lib/i18n";

const OPS = ["+", "-", "×", "÷"];

export default function TestForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { push } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState({
    name: "", section_id: "", difficulty: "EASY", question_count: 20,
    time_limit_seconds: 180, min_number: 1, max_number: 50,
    allowed_operations: ["+"] as string[], is_active: 1,
    allow_back: 0, daily_enabled: 1,
    mode: "flash", flash_numbers: 5, flash_interval_ms: 1000,
  });

  useEffect(() => {
    api.get<{ items: Section[] }>("/api/sections").then((r) => setSections(r.items)).catch(() => {});
    if (id) {
      // Bitta testni olish — butun ro'yxatni yuklashdan tezroq va stale emas
      api.get<{ test: Record<string, unknown> }>(`/api/tests/${id}`).then((r) => {
        const t = r.test as Record<string, unknown>;
        if (t) {
          let ops: string[] = ["+"];
          try { ops = JSON.parse(String(t["allowed_operations"] || '["+"]')); } catch { /* keep */ }
          setForm({
            name: String(t["name"] || ""), section_id: String(t["section_id"] || ""),
            difficulty: String(t["difficulty"] || "EASY"),
            question_count: Number(t["question_count"] || 20),
            time_limit_seconds: Number(t["time_limit_seconds"] || 180),
            min_number: Number(t["min_number"] || 1), max_number: Number(t["max_number"] || 50),
            allowed_operations: ops, is_active: Number(t["is_active"] ?? 1),
            allow_back: 0, daily_enabled: Number(t["daily_enabled"] ?? 1),
            mode: "flash",
            flash_numbers: Number(t["flash_numbers"] ?? 5), flash_interval_ms: Number(t["flash_interval_ms"] ?? 1000),
          });
        }
      }).catch(() => {});
    }
  }, [id]);

  const toggleOp = (op: string) => {
    setForm((f) => ({
      ...f,
      allowed_operations: f.allowed_operations.includes(op)
        ? f.allowed_operations.filter((x) => x !== op)
        : [...f.allowed_operations, op],
    }));
  };

  const save = async () => {
    if (form.name.trim().length < 3) { push("Test nomi kamida 3 harf.", "err"); return; }
    if (!form.allowed_operations.length) { push("Kamida 1 amal tanlang.", "err"); return; }
    if (form.min_number > form.max_number) { push("Min max dan katta bo'lmasin.", "err"); return; }
    if (form.question_count < 1 || form.question_count > 100) { push("Misollar soni 1–100 oraliqda bo'lsin.", "err"); return; }
    if (form.flash_numbers < 2 || form.flash_numbers > 30) { push("Har misolda 2–30 ta son bo'lsin.", "err"); return; }
    if (form.flash_interval_ms < 300 || form.flash_interval_ms > 5000) { push("Interval 300–5000 ms oraliqda bo'lsin.", "err"); return; }
    if (form.time_limit_seconds < 30 || form.time_limit_seconds > 3600) { push("Vaqt 30–3600 soniya oraliqda bo'lsin.", "err"); return; }
    try {
      // Hamma testlar flash rejimda — allow_back flash'da qo'llanilmaydi
      const payload = { ...form, section_id: form.section_id || null, mode: "flash", allow_back: 0 };
      if (id) await api.put(`/api/tests/${id}`, payload);
      else await api.post("/api/tests", payload);
      push("Saqlandi.", "ok");
      nav("/teacher/tests");
    } catch (e) { push(e instanceof Error ? e.message : "Xatolik", "err"); }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold text-white">{id ? "✏️ Testni tahrirlash" : "➕ Yangi test"}</h1>
      <Card>
        <div className="space-y-3">
          <div><label className="label">Test nomi</label><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Masalan: Bugungi tez hisoblash" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bo'lim</label>
              <select className="input" value={form.section_id} onChange={(e) => set("section_id", e.target.value)}>
                <option value="">—</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.title_uz}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Daraja</label>
              <select className="input" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                {Object.keys(levelNames).map((k) => <option key={k} value={k}>{levelNames[k]}</option>)}
              </select>
            </div>
          <div>
            <label className="label">Misollar soni (har biri — ketma-ket chaqnaydigan sonlar)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[5, 10, 20, 30, 50, 100].map((n) => (
                <button key={n} type="button" onClick={() => set("question_count", n)}
                  className={`rounded-xl px-4 py-2 font-bold border transition hover:scale-105 ${form.question_count === n ? "border-gold-500 bg-gold-500/15 text-gold-300 shadow-glow" : "bg-white/5 border-white/10 text-slate-300"}`}>
                  {n}
                </button>
              ))}
            </div>
            <input type="number" className="input" value={form.question_count} min={1} max={100} onChange={(e) => set("question_count", Number(e.target.value))} aria-label="Misollar soni" />
          </div>
            <div><label className="label">Vaqt (sek)</label><input type="number" className="input" value={form.time_limit_seconds} min={30} max={3600} onChange={(e) => set("time_limit_seconds", Number(e.target.value))} /></div>
            <div><label className="label">Min son</label><input type="number" className="input" value={form.min_number} min={1} onChange={(e) => set("min_number", Number(e.target.value))} /></div>
            <div><label className="label">Max son</label><input type="number" className="input" value={form.max_number} min={2} onChange={(e) => set("max_number", Number(e.target.value))} /></div>
          </div>
          <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-3">
            <div className="text-sm font-bold text-gold-300 mb-1">⚡ Chaqnash (mental) rejim</div>
            <p className="text-xs text-slate-400">Sonlar birma-bir chaqnab o'chadi, o'quvchi har misol oxirida bitta javob kiritadi.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Har misolda nechta son</label><input type="number" className="input" value={form.flash_numbers} min={2} max={30} onChange={(e) => set("flash_numbers", Number(e.target.value))} /></div>
            <div><label className="label">Interval (ms)</label><input type="number" className="input" value={form.flash_interval_ms} min={300} max={5000} step={100} onChange={(e) => set("flash_interval_ms", Number(e.target.value))} /></div>
          </div>
          <div>
            <label className="label">Amallar</label>
            <div className="flex gap-2">
              {OPS.map((op) => (
                <button key={op} type="button" onClick={() => toggleOp(op)}
                  className={`rounded-xl px-4 py-2 font-bold text-lg border transition hover:scale-105 ${form.allowed_operations.includes(op) ? "bg-brand-600 text-white border-brand-600 shadow-glow" : "bg-white/5 border-white/10 text-slate-300"}`}>
                  {op}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked ? 1 : 0)} className="w-4 h-4 accent-amber-500" /> Faol
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={!!form.daily_enabled} onChange={(e) => set("daily_enabled", e.target.checked ? 1 : 0)} className="w-4 h-4 accent-amber-500" /> Kunlik vazifalarda ko'rinsin
          </label>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => nav(-1)}>Bekor qilish</GhostButton>
            <Button onClick={save}>Saqlash</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
