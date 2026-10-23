import { useState } from "react";
import { api } from "../lib/api";
import { Card, Button, GhostButton, useToast } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { t } from "../lib/i18n";

export default function Settings() {
  const { push } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) { push("Yangi parol kamida 6 belgidan iborat bo'lsin.", "err"); return; }
    setBusy(true);
    try {
      await api.post("/api/auth/teacher/password", { current, password: next });
      setCurrent(""); setNext("");
      push("Parol yangilandi. Boshqa qurilmalardagi sessiyalar yopildi.", "ok");
    } catch (err) {
      push(err instanceof Error ? err.message : "Xatolik", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-white">⚙️ Sozlamalar</h1>
      <Card>
        <h2 className="font-bold mb-1 text-white">🎨 {t.theme}</h2>
        <p className="text-sm text-slate-400 mb-3">Kunduzgi, tungi yoki qurilmaga mos avto rejimni tanlang.</p>
        <ThemeToggle variant="full" />
      </Card>
      <Card>
        <h2 className="font-bold mb-2 text-white">Platforma</h2>
        <div className="text-sm text-slate-300 space-y-1">
          <p><b>Nomi:</b> MY DREAM MENTAL</p>
          <p><b>Vaqt zonasi:</b> Asia/Tashkent (UTC+5)</p>
          <p><b>Til:</b> O'zbek tili (ru/en keyinchalik qo'shiladi — matnlar <code>src/lib/i18n.ts</code> da)</p>
        </div>
      </Card>
      <Card>
        <h2 className="font-bold mb-2 text-white">Parolni almashtirish</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="label" htmlFor="cur">Hozirgi parol</label>
            <input id="cur" type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="nxt">Yangi parol (min 6 belgi)</label>
            <input id="nxt" type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => { setCurrent(""); setNext(""); }}>Tozalash</GhostButton>
            <Button disabled={busy}>{busy ? "Saqlanmoqda..." : "Yangilash"}</Button>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="font-bold mb-2 text-white">Reyting</h2>
        <p className="text-sm text-slate-300">
          Umumiy reyting hamma uchun ochiq: o'quvchilar pastki bardagi 🏆 orqali o'z o'rnini ko'radi,
          o'z qatori oltin rangda belgilanadi. Boshqa o'quvchilarning kirish kodlari yashirin.
        </p>
      </Card>
    </div>
  );
}
