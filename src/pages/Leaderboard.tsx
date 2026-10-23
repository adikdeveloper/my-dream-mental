import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Card, Badge, Loading, EmptyState, GhostButton } from "../components/ui";
import { formatShort } from "../lib/utils";
import { levelNames } from "../lib/i18n";

interface Row {
  rank: number;
  id: string;
  full_name: string;
  student_code: string;
  level: string;
  group_name: string | null;
  tests: number;
  questions: number;
  correct: number;
  accuracy: number;
  active_seconds: number;
  active_days: number;
  points: number;
}

type Period = "today" | "week" | "all";
type Tab = Period | "groups";

const tabs: { k: Tab; l: string }[] = [
  { k: "today", l: "Bugun" },
  { k: "week", l: "Hafta" },
  { k: "all", l: "Umumiy" },
  { k: "groups", l: "Guruhlar" },
];

const groupPeriods: { k: Period; l: string }[] = [
  { k: "today", l: "Bugun" },
  { k: "week", l: "Hafta" },
  { k: "all", l: "Umumiy" },
];

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

const escHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Joriy ko'rinishni alohida PDF (print oynasi) sifatida yuklash.
// Yengil uslubda alohida hujjat ochiladi — qora fon chop etilmaydi.
function downloadPdf(
  title: string,
  sections: { heading: string; heads: string[]; rows: string[][] }[]
) {
  const css =
    "body{font-family:Arial,sans-serif;color:#111;padding:24px}" +
    "h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px;color:#0b3b7a}" +
    ".meta{font-size:11px;color:#555;margin-bottom:12px}" +
    "table{width:100%;border-collapse:collapse;font-size:12px}" +
    "th,td{border:1px solid #999;padding:6px 8px;text-align:left}" +
    "th{background:#eee}.num{text-align:center}";
  const parts = [
    `<h1>${escHtml(title)}</h1>`,
    `<div class="meta">${escHtml(new Date().toLocaleString("uz-UZ"))} · MY DREAM MENTAL</div>`,
  ];
  for (const s of sections) {
    parts.push(`<h2>${escHtml(s.heading)}</h2>`);
    parts.push(
      `<table><thead><tr>${s.heads.map((h) => `<th>${escHtml(h)}</th>`).join("")}</tr></thead><tbody>` +
        s.rows
          .map(
            (r) =>
              `<tr>${r.map((c, i) => `<td${i > 1 ? ' class="num"' : ""}>${escHtml(c)}</td>`).join("")}</tr>`
          )
          .join("") +
        `</tbody></table>`
    );
  }
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${css}</style></head><body>${parts.join("")}</body></html>`);
  doc.close();
  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    win.print();
  }
  setTimeout(() => iframe.remove(), 1500);
}

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("all");
  const [groupPeriod, setGroupPeriod] = useState<Period>("all");
  // Guruhlar tab ichida ham davr tanlanadi
  const period: Period = tab === "groups" ? groupPeriod : tab;
  const [items, setItems] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [meRank, setMeRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api.get<{ items: Row[]; me_id: string | null; me_rank: number | null }>(`/api/leaderboard?period=${period}`)
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setMeId(r.me_id);
        setMeRank(r.me_rank);
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Yuklashda xatolik."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period]);

  const me = meId ? items.find((x) => x.id === meId) : undefined;

  // Guruhlar ko'rinishi: guruh bo'yicha guruhlash (o'rin har guruhda 1 dan)
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of items) {
      const key = r.group_name || "Guruhsiz";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const arr = [...map.entries()].map(([name, members]) => ({
      name,
      members: [...members].sort((a, b) => b.points - a.points || b.accuracy - a.accuracy || b.questions - a.questions),
      total: members.reduce((s, m) => s + m.points, 0),
    }));
    arr.sort((a, b) => {
      if (a.name === "Guruhsiz" && b.name !== "Guruhsiz") return 1;
      if (b.name === "Guruhsiz" && a.name !== "Guruhsiz") return -1;
      return b.total - a.total || a.name.localeCompare(b.name, "uz");
    });
    return arr;
  }, [items]);

  const meGroup = meId ? grouped.find((g) => g.members.some((m) => m.id === meId)) : undefined;
  const meGroupRank = meGroup && meId ? meGroup.members.findIndex((m) => m.id === meId) + 1 : null;

  const periodLabel = tab === "groups" ? groupPeriods.find((p) => p.k === groupPeriod)?.l : tabs.find((p) => p.k === tab)?.l;

  // Joriy ko'rinishni PDF ga yuklash (har tab alohida)
  const printPdf = () => {
    const heads = ["№", "Ism", "Ishlangan testlar", "Aniqlik", "Faollik", "Kun faolligi", "Ball"];
    const toRow = (r: Row, rank: number, isMe: boolean): string[][] => [[
      String(rank),
      r.full_name + (isMe ? " (Siz)" : ""),
      String(r.tests),
      `${Math.round(r.accuracy)}%`,
      formatShort(r.active_seconds),
      `${r.active_days} kun`,
      String(r.points),
    ]];
    if (tab === "groups") {
      const sections = grouped.map((g) => ({
        heading: `${g.name === "Guruhsiz" ? "Guruhsizlar" : `${g.name} guruhi`} — ${g.members.length} nafar`,
        heads,
        rows: g.members.flatMap((r, i) => toRow(r, i + 1, meId !== null && r.id === meId)),
      }));
      downloadPdf(`Reyting — Guruhlar (${periodLabel})`, sections);
    } else {
      downloadPdf(`Reyting — ${periodLabel}`, [{
        heading: `Top-${items.length}`,
        heads,
        rows: items.flatMap((r) => toRow(r, r.rank, meId !== null && r.id === meId)),
      }]);
    }
  };

  return (
    <div className="m-page space-y-4 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-2">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">🏆 Reyting</h1>
          <p className="text-[11px] sm:text-sm text-slate-400">Misollar · aniqlik · testlar · faol vaqt · kunlik faollik</p>
        </div>
        {!loading && !error && items.length > 0 && (
          <button type="button" onClick={printPdf}
            className="no-print shrink-0 rounded-xl px-4 py-2.5 font-semibold border border-white/15 bg-white/5 text-sm text-slate-200 hover:bg-white/10 transition active:scale-95">
            📥 PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map((p) => (
          <button key={p.k} type="button" onClick={() => setTab(p.k)}
            className={`m-pill border transition active:scale-95 ${tab === p.k ? "border-gold-500 bg-gold-500/20 text-gold-300 shadow-glow" : "border-white/10 bg-white/5 text-slate-300"}`}>
            {p.l}
          </button>
        ))}
      </div>

      {/* Guruhlar tab ichida davr tanlash */}
      {tab === "groups" && (
        <div className="grid grid-cols-3 gap-1.5">
          {groupPeriods.map((p) => (
            <button key={p.k} type="button" onClick={() => setGroupPeriod(p.k)}
              className={`m-pill border transition active:scale-95 ${groupPeriod === p.k ? "border-gold-500 bg-gold-500/20 text-gold-300 shadow-glow" : "border-white/10 bg-white/5 text-slate-300"}`}>
              {p.l}
            </button>
          ))}
        </div>
      )}

      {loading ? <Loading lines={6} /> : error ? (
        <Card className="text-center py-8">
          <p className="text-red-300 font-semibold">{error}</p>
          <div className="mt-3"><GhostButton onClick={() => window.location.reload()}>Qayta urinish</GhostButton></div>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState icon="🏆" text="Hali reyting yo'q. Birinchi bo'lib mashq qiling!" />
      ) : tab === "groups" ? (
        <>
          {/* O'z guruhidagi o'rni */}
          {meGroup && meGroupRank ? (
            <div className="rounded-xl border border-gold-500/60 bg-gold-500/10 px-4 py-2.5 text-center text-[13px] sm:text-sm font-bold text-gold-200">
              Siz <b className="text-gold-300">{meGroup.name === "Guruhsiz" ? "Guruhsizlar" : `${meGroup.name} guruhi`}</b> ichida <b className="text-gold-300 text-base">{meGroupRank}-o'rindasiz</b> 👈
            </div>
          ) : null}

          {grouped.map((g) => (
            <div key={g.name} className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-2">
                <span className="font-extrabold text-gold-300 text-[13px] sm:text-sm tracking-wide">
                  {g.name === "Guruhsiz" ? "GURUHSIZLAR" : `${g.name.toUpperCase()} GURUHI`}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-300 whitespace-nowrap">{g.members.length} nafar · {g.total} ball</span>
              </div>
              <Card className="m-card overflow-x-auto !p-2">
                <table className="tbl min-w-[640px]">
                  <thead>
                    <tr>
                      <th className="w-12">№</th>
                      <th>Ism</th>
                      <th className="text-center">Ishlangan testlar</th>
                      <th className="text-center">Aniqlik</th>
                      <th className="text-center">Faollik</th>
                      <th className="text-center">Kun faolligi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.members.map((r, i) => {
                      const isMe = meId !== null && r.id === meId;
                      return (
                        <tr key={r.id} className={isMe ? "!bg-gold-500/15" : undefined}
                          style={isMe ? { boxShadow: "inset 3px 0 0 #f59e0b" } : undefined}>
                          <td className="font-extrabold text-gold-300 whitespace-nowrap">{medal(i + 1)}</td>
                          <td>
                            <span className="font-bold text-white text-[13px] sm:text-sm">{r.full_name}</span>
                            {isMe && <Badge tone="yellow">Siz</Badge>}
                            <span className="block text-[11px] text-slate-500">{r.points} ball · {levelNames[r.level] || r.level}</span>
                          </td>
                          <td className="text-center text-slate-200 font-semibold">{r.tests}</td>
                          <td className="text-center text-slate-200 font-semibold">{Math.round(r.accuracy)}%</td>
                          <td className="text-center text-slate-300 whitespace-nowrap">{formatShort(r.active_seconds)}</td>
                          <td className="text-center text-slate-300 whitespace-nowrap">{r.active_days} kun</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 text-center">
            Tartib ball bo'yicha: misol ×1 + to'g'ri ×2 + test ×5 + aniqlik% ×2 + faol daqiqa ×1 + faol kun ×10
          </p>
        </>
      ) : (
        <>
          {/* O'z o'rni — bir qarashda ko'rinadi */}
          {me && (
            <div className="rounded-xl border border-gold-500/60 bg-gold-500/10 px-4 py-2.5 text-center text-[13px] sm:text-sm font-bold text-gold-200">
              Siz {items.length} kishidan <b className="text-gold-300 text-base">{meRank || me.rank}-o'rindasiz</b> 👈
            </div>
          )}

          <Card className="m-card overflow-x-auto !p-2">
            <table className="tbl min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-12">№</th>
                  <th>Ism</th>
                  <th className="text-center">Ishlangan testlar</th>
                  <th className="text-center">Aniqlik</th>
                  <th className="text-center">Faollik</th>
                  <th className="text-center">Kun faolligi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const isMe = meId !== null && r.id === meId;
                  return (
                    <tr key={r.id} className={isMe ? "!bg-gold-500/15" : undefined}
                      style={isMe ? { boxShadow: "inset 3px 0 0 #f59e0b" } : undefined}>
                      <td className="font-extrabold text-gold-300 whitespace-nowrap">{medal(r.rank)}</td>
                      <td>
                        <span className="font-bold text-white text-[13px] sm:text-sm">{r.full_name}</span>
                        {isMe && <Badge tone="yellow">Siz</Badge>}
                        <span className="block text-[11px] text-slate-500">{r.points} ball · {levelNames[r.level] || r.level}</span>
                      </td>
                      <td className="text-center text-slate-200 font-semibold">{r.tests}</td>
                      <td className="text-center text-slate-200 font-semibold">{Math.round(r.accuracy)}%</td>
                      <td className="text-center text-slate-300 whitespace-nowrap">{formatShort(r.active_seconds)}</td>
                      <td className="text-center text-slate-300 whitespace-nowrap">{r.active_days} kun</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <p className="text-[11px] text-slate-500 text-center">
            Tartib ball bo'yicha: misol ×1 + to'g'ri ×2 + test ×5 + aniqlik% ×2 + faol daqiqa ×1 + faol kun ×10
          </p>
        </>
      )}
    </div>
  );
}
