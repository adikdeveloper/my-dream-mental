import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAvatar } from "../hooks/useAvatar";
import { Logo } from "../components/Logo";
import { Modal } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { t } from "../lib/i18n";
import { cx } from "../lib/utils";

/* Chiqishdan oldingi ogohlantirish: 3 soniyali taymer + tasdiq */
function LogoutConfirm({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const [left, setLeft] = useState(3);
  useEffect(() => {
    if (!open) return;
    setLeft(3);
    const iv = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { clearInterval(iv); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [open ]);
  return (
    <Modal open={open} onClose={onClose} title="⚠️ OGOHLANTIRISH">
      <p className="text-sm text-slate-300 leading-relaxed">
        Bu tugma sizni akkauntingizdan <b className="text-white">chiqaradi</b>. Qayta kirish uchun
        loginingiz va parolingiz (yoki o'quvchi kodingiz) kerak bo'ladi — ularni bilmasangiz
        akkauntingizga kira olmaysiz.
      </p>
      <p className="mt-2 font-bold text-white">Rostdan ham tizimdan chiqmoqchimisiz?</p>
      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="grid place-items-center min-w-11 h-11 px-3 rounded-xl border border-gold-500/40 bg-gold-500/10 text-lg font-extrabold text-gold-300" aria-live="polite">
          {left > 0 ? `${left}` : "✓"}
        </span>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost-dark !py-2.5 text-sm">Bekor qilish</button>
          <button onClick={onConfirm} disabled={left > 0}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none">
            {left > 0 ? `Kuting (${left})` : "Ha, tizimdan chiqish"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight text-white min-w-0 shrink-0">
            <Logo size={32} />
            <span className="hidden min-[480px]:inline truncate">{t.appName}</span>
            <span className="min-[480px]:hidden text-[11px] leading-tight">MY DREAM<br /><span className="text-gold-400">MENTAL</span></span>
          </Link>
          <nav className="flex gap-1 sm:gap-2 text-sm items-center shrink-0">
            <ThemeToggle />
            <Link to="/student/login" className="rounded-lg px-2 sm:px-3 py-2 font-semibold text-gold-300 hover:bg-white/5 whitespace-nowrap text-[13px] sm:text-sm">O'quvchi</Link>
            <Link to="/teacher/login" className="rounded-lg px-2 sm:px-3 py-2 font-semibold text-slate-300 hover:bg-white/5 whitespace-nowrap text-[13px] sm:text-sm">O'qituvchi</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="text-center text-xs text-slate-500 py-6">© 2026 {t.appName} · Mental arifmetika platformasi</footer>
    </div>
  );
}

interface NavItem { to: string; label: string; icon: string; }

/* Pastki icon-bar uchun chiziqli SVG ikonkalar (2-rasm uslubi) */
function TabIcon({ to }: { to: string }) {
  const cls = "w-6 h-6";
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (to.includes("dashboard"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>);
  if (to.includes("students"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.7c2.6.3 4.6 2 5.5 4.8" /></svg>);
  if (to.includes("groups"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>);
  if (to.includes("tests"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 13h7M9 17h7" /></svg>);
  if (to.includes("statistics"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>);
  if (to.includes("leaderboard"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><path d="M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 5H4a3 3 0 003 5M17 5h3a3 3 0 01-3 5" /><path d="M12 14v4M8 21h8M9 18h6" /></svg>);
  if (to.includes("history"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>);
  if (to.includes("profile"))
    return (<svg viewBox="0 0 24 24" className={cls} {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7" /></svg>);
  return (<svg viewBox="0 0 24 24" className={cls} {...common}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></svg>);
}

function Shell({ links, home, children }: { links: NavItem[]; home: string; children: React.ReactNode }) {
  const { logout, teacher, student } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const name = teacher?.full_name || student?.full_name || "";
  const code = student?.student_code || teacher?.username || "";
  const isHome = loc.pathname === home;
  const activeLink = [...links].reverse().find((l) => loc.pathname === l.to || loc.pathname.startsWith(l.to + "/")) || links.find((l) => l.to === home);
  const back = () => {
    if (window.history.length > 1) nav(-1);
    else nav(home);
  };
  const [askLogout, setAskLogout] = useState(false);
  const doLogout = () => { setAskLogout(false); void logout().then(() => nav("/")); };
  // Sidebar'dagi avatar ham yuklangan fotosuratni ko'rsatsin
  const sidePhoto = useAvatar(student?.id);

  return (
    <div className="min-h-screen lg:flex" style={{ minHeight: "100dvh" }}>
      {/* Mobile top bar: orqaga strelka + sarlavha (matnli menyu olib tashlandi) */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-white/10 bg-navy-950/90 backdrop-blur-md">
        <div className="px-3 py-2.5 flex items-center gap-2">
          {!isHome ? (
            <button onClick={back} aria-label="Orqaga" className="grid place-items-center w-9 h-9 rounded-xl text-slate-200 hover:bg-white/10 active:scale-95 transition">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          ) : (
            <Logo size={30} />
          )}
          <span className="flex-1 font-bold text-[15px] text-white truncate">{activeLink?.label || t.appName}</span>
          <ThemeToggle />
          <button onClick={() => setAskLogout(true)} aria-label={t.logout}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 pl-2.5 pr-3 py-2 text-[13px] font-semibold text-slate-200 transition hover:border-red-500/50 hover:bg-red-500/15 hover:text-red-300 hover:scale-105 active:scale-95">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M14 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8" /><path d="M11 8l4 4-4 4" /><path d="M15 12H3" /></svg>
            Chiqish
          </button>
        </div>
      </div>

      {/* Mobile bottom icon-bar (2-rasm uslubi) — safe-area bilan har doim ko'rinadi */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-navy-950" style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }} aria-label="Asosiy menyu">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}
              aria-label={l.label}
              className={({ isActive }) => cx("relative flex items-center justify-center py-3 transition active:scale-95",
                isActive ? "text-gold-300" : "text-slate-400 hover:text-slate-200")}>
              {({ isActive }) => (<>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full" style={{ background: "linear-gradient(135deg,#ffd97a,#f59e0b)" }} />}
                <TabIcon to={l.to} />
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="side-shell hidden lg:flex w-64 shrink-0 flex-col min-h-screen sticky top-0 h-screen border-r border-white/10">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <Logo size={44} className="animate-float" />
          <div>
            <div className="font-extrabold leading-tight text-white">MY DREAM<br /><span className="text-gold-400">MENTAL</span></div>
          </div>
        </div>
        <div className="px-5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Menyu</div>
        <nav className="flex flex-col gap-1.5 px-3" aria-label="Asosiy menyu">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => cx("group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                isActive
                  ? "text-navy-950"
                  : "text-slate-300 hover:bg-white/5 hover:text-white hover:translate-x-1")}
              style={({ isActive }) => isActive
                ? { background: "linear-gradient(135deg,#ffd97a,#f59e0b)", boxShadow: "0 4px 18px rgba(245,158,11,.4)" }
                : undefined}>
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 text-base">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300">{t.theme}</span>
            <ThemeToggle />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              {sidePhoto && student ? (
                <img src={sidePhoto} alt={name} className="w-9 h-9 rounded-full object-cover border border-gold-500/50" />
              ) : (
                <span className="grid place-items-center w-9 h-9 rounded-full font-bold text-navy-950" style={{ background: "linear-gradient(135deg,#ffd97a,#f59e0b)" }}>
                  {name.charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{name}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate">{code}</div>
              </div>
            </div>
            <button
              onClick={() => setAskLogout(true)}
              className="mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition"
            >
              🚪 {t.logout}
            </button>
          </div>
        </div>
      </aside>

      <LogoutConfirm open={askLogout} onClose={() => setAskLogout(false)} onConfirm={doLogout} />

      {/* Mobile pastki bar uchun joy (topdagi alohida logout olib tashlandi — top-barda) */}
      <main className="flex-1 p-3 sm:p-6 pb-24 lg:pb-6 max-w-6xl w-full mx-auto">
        <div key={loc.pathname} className="page-anim max-w-[480px] sm:max-w-none mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}

export function TeacherLayout() {
  return (
    <Shell home="/teacher/dashboard" links={[
      { to: "/teacher/dashboard", label: t.dashboard, icon: "📊" },
      { to: "/teacher/students", label: t.students, icon: "👥" },
      { to: "/teacher/groups", label: t.groups, icon: "📁" },
      { to: "/teacher/tests", label: t.tests, icon: "📝" },
      { to: "/teacher/statistics", label: t.statistics, icon: "📈" },
      { to: "/teacher/leaderboard", label: t.leaderboard, icon: "🏆" },
      { to: "/settings", label: t.settings, icon: "⚙️" },
    ]}>
      <Outlet />
    </Shell>
  );
}

export function StudentLayout() {
  return (
    <Shell home="/student/dashboard" links={[
      { to: "/student/dashboard", label: t.dashboard, icon: "🏠" },
      { to: "/student/history", label: t.history, icon: "📜" },
      { to: "/student/leaderboard", label: t.leaderboard, icon: "🏆" },
      { to: "/student/profile", label: t.profile, icon: "👤" },
    ]}>
      <Outlet />
    </Shell>
  );
}
