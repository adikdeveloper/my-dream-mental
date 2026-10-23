import { Link } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Logo } from "../components/Logo";
import { useTheme } from "../hooks/useTheme";
import { BrainSticker, BoltSticker, TrophySticker, MedalSticker, FlameSticker, SunSticker, RocketSticker, StarSticker, SparkleDoodle } from "../components/Stickers";
import { t } from "../lib/i18n";

export default function Landing() {
  const { effective } = useTheme();
  // Rejim almashganda fon miltillamasligi uchun muqobil rasmni oldindan yuklash
  useEffect(() => {
    const img = new Image();
    img.src = effective === "light" ? "/bg-night.png" : "/bg-day.png";
  }, [effective]);

  return (
    <div className="page-anim">
      {/* HERO — telefonda Figma kabi ixcham, desktopda keng */}
      <section className="landing-hero">
        <div className="landing-hero-inner m-page max-w-6xl mx-auto px-4 pt-6 sm:pt-20 pb-6 sm:pb-10 grid lg:grid-cols-2 gap-6 sm:gap-10 items-center">
        <div className="text-center sm:text-left relative">
          <SparkleDoodle size={20} className="absolute -top-1 left-2 sm:left-0" />
          <SparkleDoodle size={15} className="absolute top-8 right-4 sm:right-10" style={{ animationDelay: "1s" }} />
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
            ✨ O'zbekistonning #1 Mental Arifmetika Platformasi
          </div>
          <div className="sm:hidden flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-widest text-gold-300">
            <Logo size={24} />
            MY DREAM MENTAL
          </div>
          <h1 className="m-hero-title mt-3 sm:mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-white">
            Aqliy salohiyatni<br className="sm:hidden" />
            <span className="sm:hidden"> yangi darajaga ko'taring</span>
            <span className="hidden sm:block">Kelajagingizni<br />
              <span className="hero-grade text-transparent bg-clip-text">
                {t.appName}
              </span><br />
              bilan quring
            </span>
          </h1>
          <p className="mt-3 sm:mt-5 text-[13px] sm:text-lg text-slate-300 max-w-lg mx-auto sm:mx-0">Mental arifmetika har kuni mashq qil, natijangni kuzat! O'zbekistondagi eng premium platforma.</p>
          <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link to="/student/login" className="btn-primary text-center text-[15px] sm:text-lg w-full sm:w-auto">O'quvchi kirish</Link>
            <Link to="/teacher/login" className="btn-ghost-dark text-center text-[15px] sm:text-lg w-full sm:w-auto">
              O'qituvchi kirish ›
            </Link>
          </div>
          <div className="mt-4 sm:mt-6 flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-slate-400">
            <span className="text-gold-400 font-bold">500+ o'quvchi</span> allaqachon mashq qilmoqda
          </div>
        </div>

        {/* Stats glass panel — telefonda Figma kabi ixcham */}
        <div className="relative">
          <div className="card m-card p-6 sm:p-8">
            <div className="hidden sm:flex items-center gap-2 font-extrabold text-lg text-white"><Logo size={28} /> {t.appName}</div>
            <div className="m-section-title sm:hidden text-slate-400 font-bold mb-2">BIZNING KO'RSATKICHLAR</div>
            <div className="mt-1 sm:mt-4 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  { v: "8+", l: "O'quv bo'limlari" },
                  { v: "5", l: "Mustaqil daraja" },
                  { v: "", l: "Kuchli streak tizimi", s: <FlameSticker size={30} /> },
                ] as { v: string; l: string; s?: ReactNode }[]
              ).map((s) => (
                <div key={s.l} className="rounded-xl bg-white/5 border border-white/10 py-3 sm:py-4 px-1">
                  <div className="text-lg sm:text-2xl font-extrabold text-gold-400 flex justify-center">{s.s || s.v}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="m-section-title sm:hidden text-slate-400 font-bold mt-4 mb-2">Platforma imkoniyatlari 🚀</div>
            <div className="mt-2 sm:mt-4 space-y-2">
              {(
                [
                  { s: <BoltSticker size={38} />, h: "Flash Anzan rejimi", p: "Tezkor miltillovchi sonlar bilan miyani charxlash" },
                  { s: <MedalSticker size={38} />, h: "Real vaqtda statistika", p: "Har bir mashq yakuni tahlili va aniqlikni kuzatish" },
                  { s: <StarSticker size={38} />, h: "Moslashuvchan murakkablik", p: "Tilni o'z bilimingizga qarab sozlash qulayligini oshirish" },
                ] as { s: ReactNode; h: string; p: string }[]
              ).map((f) => (
                <div key={f.h} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 sm:px-4 py-3 card-hover">
                  <span className="shrink-0">{f.s}</span>
                  <div>
                    <div className="font-bold text-white text-[13px] sm:text-sm">{f.h}</div>
                    <div className="text-[11px] sm:text-xs text-slate-400">{f.p}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Ota-onalar fikri — faqat telefonda (Figma) */}
            <div className="sm:hidden mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Ota-onalar fikri 💬</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">"My Dream Mental tufayli o'g'limning matematika va diqqatini jamlash qobiliyati keskin oshdi. Tavsiya qilaman!"</p>
              <div className="text-[11px] font-bold text-white mt-1">Malika Sobirova <span className="font-normal text-slate-500">Toshkent sh.</span></div>
            </div>
          </div>
          {/* floating badges — faqat desktop */}
          <div className="hidden sm:flex absolute -top-4 -right-2 sm:-right-4 card px-4 py-2.5 items-center gap-2 animate-float bg-navy-850">
            <TrophySticker size={34} />
            <div><div className="text-xs font-bold text-white">Xalqaro metodika</div><div className="text-[11px] text-slate-400">Mental arifmetika</div></div>
          </div>
          <div className="hidden sm:flex absolute -bottom-4 -left-2 sm:-left-4 card px-4 py-2.5 items-center gap-2 animate-float-slow bg-navy-850">
            <BoltSticker size={34} />
            <div><div className="text-xs font-bold text-white">Tez hisoblash</div><div className="text-[11px] text-slate-400">Real vaqtda mashq</div></div>
          </div>
        </div>
        </div>
      </section>

      {/* FEATURES — telefonda qisqa */}
      <section className="m-page max-w-6xl mx-auto px-4 py-4 sm:py-10">
        <h2 className="text-lg sm:text-4xl font-extrabold text-center text-white">
          <span className="text-gold-400">{t.appName}</span> <span className="sm:hidden text-sm">© 2026</span><span className="hidden sm:inline">afzalliklari</span>
        </h2>
        <p className="hidden sm:block text-center text-slate-400 mt-2 max-w-xl mx-auto">Zamonaviy metodika va real statistika orqali eng yaxshi natija.</p>
        <p className="sm:hidden text-center text-[11px] text-slate-500 mt-1">Mental arifmetika o'rganishning eng zamonaviy usulidir. Biz bilan yanada osonlashing.</p>
        <div className="mt-4 sm:mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {(
            [
              { s: <BoltSticker size={52} />, h: "Har kuni mashq", p: "Qo'shish, ayirish, ko'paytirish, bo'lish va flash-anzan." },
              { s: <MedalSticker size={52} />, h: "Real statistika", p: "Aniqlik, vaqt, streak va bo'limlar kesimida natija." },
              { s: <BrainSticker size={52} />, h: "O'qituvchi nazorati", p: "Guruhlar, kodlar, testlar va CSV eksport." },
              { s: <FlameSticker size={52} />, h: "Streak tizimi", p: "Ketma-ket kunlar uchun motivatsiya va kalendar." },
              { s: <SunSticker size={52} />, h: "Faol vaqt", p: "Haqiqiy mashq vaqti avtomatik hisoblanadi." },
              { s: <RocketSticker size={52} />, h: "Telefonda qulay", p: "Katta tugmalar, katta sonlar, tez ishlaydi." },
            ] as { s: ReactNode; h: string; p: string }[]
          ).map((f) => (
            <div key={f.h} className="card card-hover p-6">
              <div className="mb-3">{f.s}</div>
              <div className="font-bold text-lg text-white">{f.h}</div>
              <div className="text-sm text-slate-400 mt-1">{f.p}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="card cta-glow p-8 sm:p-12 text-center relative overflow-hidden">
          <StarSticker size={56} className="absolute top-4 left-4 sm:left-8 opacity-90" />
          <RocketSticker size={60} className="absolute bottom-4 right-4 sm:right-8 opacity-90" />
          <SparkleDoodle size={22} className="absolute top-8 right-8 sm:right-24" />
          <SparkleDoodle size={16} className="absolute bottom-10 left-8 sm:left-24" style={{ animationDelay: "1.2s" }} />
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Bugun mashqni boshlang!</h2>
          <p className="text-slate-300 mt-2">Kodingizni kiriting va birinchi testni topshiring.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/student/login" className="btn-primary text-lg">🎒 {t.studentLogin}</Link>
            <Link to="/teacher/login" className="btn-ghost-dark text-lg">👩‍🏫 {t.teacherLogin}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
