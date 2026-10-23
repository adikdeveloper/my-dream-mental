// Minimal SVG charts (no heavy deps → fast on mobile internet). Dark-navy + gold theme.
import { useId } from "react";

export function LineChart({ points, height = 120 }: { points: number[]; height?: number }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (!points.length) return <div className="text-sm text-slate-500">Ma'lumot yo'q</div>;
  const w = 300;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(1, max - min);
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(height - 8 - ((p - min) / span) * (height - 20)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Chiziqli grafik">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#ffd97a" />
        </linearGradient>
      </defs>
      <polyline points={coords.join(" ")} fill="none" stroke={`url(#${gid})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => {
        const [x, y] = c.split(",");
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#f59e0b" />;
      })}
    </svg>
  );
}

export function BarChart({ items, height = 130 }: { items: { label: string; value: number }[]; height?: number }) {
  if (!items.length) return <div className="text-sm text-slate-500">Ma'lumot yo'q</div>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label="Ustunli grafik">
      {items.map((it, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t-lg transition-all hover:brightness-125"
            style={{
              height: `${Math.max(6, (it.value / max) * (height - 30))}px`,
              background: "linear-gradient(180deg,#ffd97a,#f59e0b 60%,#b45309)",
              boxShadow: "0 0 12px rgba(245,158,11,.25)",
            }}
            title={`${it.label}: ${it.value}`}
          />
          <div className="text-[10px] text-slate-400 truncate w-full text-center">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ correct, wrong, size = 120 }: { correct: number; wrong: number; size?: number }) {
  const total = correct + wrong;
  const pct = total ? correct / total : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 110 110" role="img" aria-label={`Aniqlik ${Math.round(pct * 100)} foiz`}>
        <circle cx="55" cy="55" r={r} fill="none" strokeWidth="14" className="donut-track" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(pct * c).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 55 55)" />
        <text x="55" y="60" textAnchor="middle" fontSize="18" fontWeight="bold" className="donut-text">{total ? `${Math.round(pct * 100)}%` : "—"}</text>
      </svg>
      <div className="text-sm space-y-1 text-slate-300">
        <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" />To'g'ri: <b className="text-white">{correct}</b></div>
        <div><span className="inline-block w-2.5 h-2.5 rounded-full bg-white/20 mr-1" />Noto'g'ri: <b className="text-white">{wrong}</b></div>
      </div>
    </div>
  );
}

export function Heatmap({ days, max = 50 }: { days: { date: string; value: number }[]; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="img" aria-label="Faollik taqvimi">
      {days.map((d) => {
        const lvl = d.value <= 0 ? 0 : d.value < max * 0.33 ? 1 : d.value < max * 0.66 ? 2 : 3;
        const bg = ["bg-white/10", "bg-emerald-500/40", "bg-emerald-400", "bg-gold-400"][lvl];
        return <div key={d.date} title={`${d.date}: ${d.value} ta`} className={`w-6 h-6 rounded-md transition hover:scale-125 ${bg}`} />;
      })}
    </div>
  );
}
