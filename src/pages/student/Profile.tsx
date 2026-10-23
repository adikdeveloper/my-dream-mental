import { useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAvatar, avatarKey, notifyAvatar } from "../../hooks/useAvatar";
import { Card, Badge, GhostButton, useToast } from "../../components/ui";
import { formatDateTime, formatShort } from "../../lib/utils";
import { levelNames } from "../../lib/i18n";

export default function Profile() {
  const { student } = useAuth();
  const { push } = useToast();
  const photo = useAvatar(student?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!student) return null;
  const initial = student.full_name.charAt(0).toUpperCase() || "?";

  const saveResized = (file: File) => {
    if (!file.type.startsWith("image/")) {
      push("Faqat rasm fayli yuklang.", "err");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        cv.getContext("2d")?.drawImage(img, 0, 0, w, h);
        try {
          const url = cv.toDataURL("image/jpeg", 0.82);
          localStorage.setItem(avatarKey(student.id), url);
          notifyAvatar();
          push("Profil rasmi saqlandi.", "ok");
        } catch {
          push("Rasm saqlanmadi (xotira to'lgan).", "err");
        }
      };
      img.onerror = () => push("Rasm o'qilmadi.", "err");
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    try {
      localStorage.removeItem(avatarKey(student.id));
    } catch { /* ignore */ }
    notifyAvatar();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-extrabold text-white">👤 Profil</h1>

      {/* Asosiy karta: chapda foto, o'ngda ma'lumot (2-rasm uslubida, ranglar bizniki) */}
      <Card className="m-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
          <div className="flex sm:block justify-center">
            <div className="relative shrink-0">
              {photo ? (
                <img src={photo} alt={student.full_name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border border-gold-500/40"
                  style={{ boxShadow: "0 0 24px rgba(245,158,11,.25)" }} />
              ) : (
                <span className="grid place-items-center w-32 h-32 sm:w-40 sm:h-40 rounded-2xl text-5xl sm:text-6xl font-extrabold text-navy-950"
                  style={{ background: "linear-gradient(135deg,#ffd97a,#f59e0b)", boxShadow: "0 0 24px rgba(245,158,11,.35)" }}>
                  {initial}
                </span>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Rasm yuklash" title="Rasm yuklash"
                className="absolute -bottom-2 -right-2 grid place-items-center w-10 h-10 rounded-full border-2 border-navy-950 transition hover:scale-110 hover:brightness-110 active:scale-95"
                style={{ background: "linear-gradient(135deg,#ffe9a8,#f59e0b)", boxShadow: "0 4px 14px rgba(245,158,11,.55)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0b1026" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                  <circle cx="12" cy="14" r="3.4" />
                  <circle cx="12" cy="14" r="1.1" fill="#0b1026" stroke="none" />
                </svg>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) saveResized(f);
                  e.target.value = "";
                }} />
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="text-xl sm:text-2xl font-extrabold text-white truncate">{student.full_name}</div>
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">
              {levelNames[student.level] || student.level} · {student.group_name || "Guruhsiz"}
            </div>
            <div className="mt-3 font-mono bg-navy-950/70 border border-gold-500/40 text-gold-300 inline-block rounded-xl px-4 py-1.5 tracking-widest text-sm">
              {student.student_code}
            </div>
            <div className="mt-3 flex gap-2 flex-wrap justify-center sm:justify-start">
              <Badge tone="blue">{levelNames[student.level] || student.level}</Badge>
              <Badge tone="green">{student.group_name || "Guruhsiz"}</Badge>
            </div>
            <div className="mt-3 flex gap-2 justify-center sm:justify-start">
              <GhostButton className="!py-2 text-[13px]" onClick={() => fileRef.current?.click()}>
                {photo ? "Rasmni almashtirish" : "O'z rasmingizni qo'yish"}
              </GhostButton>
              {photo && (
                <GhostButton className="!py-2 text-[13px]" onClick={removePhoto}>O'chirish</GhostButton>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="m-card text-center p-4">
          <div className="mx-auto w-10 h-10 rounded-xl grid place-items-center text-xl bg-gold-500/15 border border-gold-500/30">⏳</div>
          <div className="font-extrabold text-white mt-2">{formatShort(student.total_active_seconds || 0)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Umumiy faol vaqt</div>
        </Card>
        <Card className="m-card text-center p-4">
          <div className="mx-auto w-10 h-10 rounded-xl grid place-items-center text-xl bg-white/5 border border-white/10">🕐</div>
          <div className="font-extrabold text-white mt-2 text-sm">{formatDateTime(student.last_active_at)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Oxirgi faollik</div>
        </Card>
      </div>
    </div>
  );
}
