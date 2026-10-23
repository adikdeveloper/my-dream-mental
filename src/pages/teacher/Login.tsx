import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { useToast, Button } from "../../components/ui";

export default function TeacherLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { refresh } = useAuth();
  const { push } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { push("Login va parolni kiriting.", "err"); return; }
    setBusy(true);
    try {
      await api.post("/api/auth/teacher/login", { username: username.trim(), password });
      await refresh();
      nav("/teacher/dashboard");
    } catch (e) {
      push(e instanceof Error ? e.message : "Xatolik", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="m-page max-w-md mx-auto px-4 py-6 sm:py-12 page-anim">
      <div className="text-center mb-4">
        <span className="inline-grid place-items-center w-12 h-12 rounded-2xl text-3xl" style={{ background: "linear-gradient(135deg,#ffd97a,#f59e0b)", boxShadow: "0 0 30px rgba(245,158,11,.5)" }}>🎓</span>
        <h1 className="mt-2 text-[15px] sm:text-2xl font-extrabold tracking-wide text-white">O'QITUVCHILAR KABINETI</h1>
        <p className="text-[11px] sm:text-sm text-slate-400">Dars va o'quvchilarni boshqarish paneli</p>
      </div>
      <div className="card m-card p-5 sm:p-8">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-slate-200" htmlFor="tu">Foydalanuvchi nomi</label>
            <input id="tu" className="input mt-1.5 !py-3" placeholder="ustoz_malika" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-slate-200" htmlFor="tp">Parol</label>
            <div className="relative mt-1.5">
              <input id="tp" type={show ? "text" : "password"} className="input !py-3 pr-20" placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-gold-300">
                {show ? "Yashirish" : "Ko'rsatish"}
              </button>
            </div>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-slate-500">Eshitish qolsin</span>
            <span className="text-slate-500">Parolni unutdingizmi?</span>
          </div>
          <Button disabled={busy} className="w-full text-[15px] !py-3.5 tracking-wide">{busy ? "Kirilmoqda..." : "XAVFSIZ KIRISH 🔒"}</Button>
        </form>
        <div className="mt-3 text-[13px] text-slate-400 text-center">
          <Link to="/student/login" className="text-gold-300 font-semibold">O'quvchi sifatida kirish →</Link>
        </div>
      </div>
    </div>
  );
}
