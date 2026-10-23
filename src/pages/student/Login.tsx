import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../../components/Logo";
import { AbacusSticker, BoltSticker, StarSticker } from "../../components/Stickers";
import { useToast, Button } from "../../components/ui";
import { t } from "../../lib/i18n";

export default function StudentLogin() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { refresh } = useAuth();
  const { push } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { push(t.codeNotFound, "err"); return; }
    setBusy(true);
    try {
      await api.post("/api/student/login", { code: code.trim() });
      await refresh();
      nav("/student/dashboard");
    } catch {
      push(t.codeNotFound, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="m-page max-w-md mx-auto px-4 py-6 sm:py-12 page-anim">
      <div className="text-center mb-4 sm:mb-6">
        <div className="flex justify-center items-end gap-2">
          <BoltSticker size={44} className="mb-1" />
          <span className="animate-float"><Logo size={64} /></span>
          <StarSticker size={44} className="mb-1" />
        </div>
        <div className="mt-2 text-[12px] sm:text-base font-extrabold tracking-widest text-white">MY DREAM MENTAL</div>
        <div className="text-[11px] sm:text-sm text-slate-400 mt-0.5">O'quvchi shaxsiy kabinetiga kirish</div>
        <div className="flex justify-center mt-2"><AbacusSticker size={72} /></div>
      </div>
      <div className="card m-card p-5 sm:p-8 text-left sm:text-center">
        <label className="text-[12px] sm:text-sm font-semibold text-slate-200">Maxsus login kodini kiriting:</label>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <input
            aria-label="O'quvchi kodi"
            className="input text-center text-xl sm:text-2xl font-mono tracking-[0.15em] uppercase !py-3.5"
            placeholder="MDM-429815"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={14}
            autoComplete="off"
          />
          <div className="text-[11px] text-slate-500">Format: MDM-XXXXXX (6 ta belgi)</div>
          <Button disabled={busy} className="w-full text-[15px] !py-3.5 tracking-wide">{busy ? t.loading : "TIZIMGA KIRISH"}</Button>
        </form>
        <div className="mt-3 text-[13px] text-slate-400 text-center">
          <Link to="/teacher/login" className="text-gold-300 font-semibold">O'qituvchi sifatida kirish →</Link>
        </div>
      </div>
    </div>
  );
}
