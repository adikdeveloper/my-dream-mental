// Kunduzgi / Avto / Tungi — uch holatli tema almashtirgich.
// compact: header/top-bar uchun ixcham uch tugmali pill.
// full: Sozlamalar sahifasi uchun izohli katta variant.
import { useTheme, type ThemeMode } from "../hooks/useTheme";
import { SunSticker, MoonSticker } from "./Stickers";
import { cx } from "../lib/utils";
import { t } from "../lib/i18n";

const ORDER: ThemeMode[] = ["light", "auto", "dark"];

function ModeIcon({ mode, size = 20 }: { mode: ThemeMode; size?: number }) {
  if (mode === "light") return <SunSticker size={size} label="Kunduzgi rejim" />;
  if (mode === "dark") return <MoonSticker size={size} label="Tungi rejim" />;
  // Avto: yarim quyosh-yarim oy
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Avto rejim">
      <g className="st-bob">
        <circle cx="50" cy="50" r="26" fill="#FFD97A" stroke="#0B1026" strokeWidth="5" />
        <path d="M50 24 A26 26 0 0 0 50 76 Z" fill="#1E2763" />
        <circle cx="40" cy="46" r="3" fill="#0B1026" className="st-eye" />
        <circle cx="60" cy="46" r="3" fill="#fff" className="st-eye" style={{ animationDelay: ".6s" }} />
        <path d="M42 58 Q50 63 58 58" fill="none" stroke="#0B1026" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function ThemeToggle({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { mode, setMode } = useTheme();

  if (variant === "full") {
    const items: { mode: ThemeMode; title: string; desc: string }[] = [
      { mode: "light", title: t.themeLight, desc: t.themeLightDesc },
      { mode: "auto", title: t.themeAuto, desc: t.themeAutoDesc },
      { mode: "dark", title: t.themeDark, desc: t.themeDarkDesc },
    ];
    return (
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.theme}>
        {items.map((it) => {
          const active = mode === it.mode;
          return (
            <button
              key={it.mode}
              role="radio"
              aria-checked={active}
              onClick={() => setMode(it.mode)}
              className={cx(
                "rounded-2xl border p-3 flex flex-col items-center gap-1.5 transition active:scale-95",
                active
                  ? "border-gold-500/60 bg-gold-500/10 shadow-glow"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              )}
            >
              <ModeIcon mode={it.mode} size={44} />
              <span className={cx("text-[13px] font-extrabold", active ? "text-gold-300" : "text-white")}>{it.title}</span>
              <span className="text-[10px] leading-tight text-slate-400 text-center">{it.desc}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 gap-0.5"
      role="radiogroup"
      aria-label={t.theme}
      title={t.theme}
    >
      {ORDER.map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            aria-label={m === "light" ? t.themeLight : m === "dark" ? t.themeDark : t.themeAuto}
            title={m === "light" ? t.themeLight : m === "dark" ? t.themeDark : t.themeAuto}
            onClick={() => setMode(m)}
            className={cx(
              "rounded-full p-1 transition active:scale-90 grid place-items-center",
              active ? "bg-gold-500/25 shadow-glow scale-110" : "opacity-60 hover:opacity-100 hover:bg-white/10"
            )}
          >
            <ModeIcon mode={m} size={22} />
          </button>
        );
      })}
    </div>
  );
}
