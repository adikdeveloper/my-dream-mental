import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button, GhostButton, Badge, Loading, useToast } from "../../components/ui";
import { levelNames } from "../../lib/i18n";
import type { TestItem } from "../../types";

const digitsToRange = (d: number): [number, number] => (d === 1 ? [1, 20] : d === 2 ? [10, 99] : [100, 999]);

function sliderFill(pct: number): CSSProperties {
  return { "--fill": `${pct}%` } as CSSProperties;
}

export default function TestSetup() {
  const { id } = useParams();
  const nav = useNavigate();
  const { push } = useToast();
  const [test, setTest] = useState<TestItem | null>(null);
  const [examples, setExamples] = useState(10);
  const [count, setCount] = useState(5);
  const [speed, setSpeed] = useState(1200);
  const [digits, setDigits] = useState(1);
  const [withMinus, setWithMinus] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<{ test: TestItem }>(`/api/tests/${id}`)
      .then((r) => {
        setTest(r.test);
        setExamples(Math.min(100, Math.max(1, r.test.question_count || 10)));
        setCount(Math.min(20, Math.max(2, r.test.flash_numbers || 5)));
        setSpeed(r.test.flash_interval_ms || 1200);
      })
      .catch((e) => { push(e instanceof Error ? e.message : "Test topilmadi.", "err"); nav("/student/dashboard"); });
  }, [id, nav, push]);

  const estSec = useMemo(() => {
    // Realistik taxmin: countdown (birinchi 2s + keyingilar 1.2s) + har misolda
    // count*speed chaqnash + 350ms pauza + javob uchun ~4s
    const countdown = examples > 0 ? 2 + Math.max(0, examples - 1) * 1.2 : 0;
    const flash = (examples * count * speed) / 1000 + examples * 0.5;
    const answering = examples * 4;
    return Math.round(countdown + flash + answering);
  }, [examples, count, speed]);

  if (!test) return <Loading lines={4} />;
  const [mn, mx] = digitsToRange(digits);

  const start = async () => {
    if (!id) return;
    setBusy(true);
    const params = `?examples=${examples}&flash_numbers=${count}&flash_interval_ms=${speed}&min_number=${mn}&max_number=${mx}&minus=${withMinus ? 1 : 0}`;
    // Runner start'ni o'zi qiladi — sozlamalar query orqali uzatiladi
    nav(`/student/test/${id}${params}`);
  };

  return (
    <div className="m-page max-w-xl mx-auto space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left">
        <h1 className="text-[17px] sm:text-2xl font-extrabold text-white">{test.name}</h1>
        <p className="text-[11px] sm:text-sm text-slate-400">Aqlli charchoqni yo'q qiling, miyani chiniqtiring</p>
      </div>
      <div className="hidden sm:flex gap-2 flex-wrap">
        <Badge tone="blue">{levelNames[test.difficulty] || test.difficulty}</Badge>
        <Badge tone="yellow">Chaqnash rejimi</Badge>
        {test.section_title && <Badge>{test.section_title}</Badge>}
      </div>

      <Card className="m-card">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="m-section-title text-slate-400 font-bold">MISOLLAR SONI</label>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[5, 10, 20, 30, 50, 100].map((n) => (
                <button key={n} type="button" onClick={() => setExamples(n)}
                  className={`m-pill border transition active:scale-95 ${examples === n ? "border-gold-500 bg-gold-500/20 text-gold-300 shadow-glow" : "border-white/10 bg-white/5 text-slate-300"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="m-section-title text-slate-400 font-bold">SONLAR SONI (HAR BIR MISOLDA)</label>
              <span className="text-[13px] font-extrabold text-gold-300">{count} ta son</span>
            </div>
            <input type="range" min={2} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="slider" style={sliderFill(((count - 2) / 18) * 100)} aria-label="Sonlar soni" />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>2 ta</span><span>20 ta</span></div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="m-section-title text-slate-400 font-bold">TEZLIK (MILTILLASH VAQTI)</label>
              <span className="text-[12px] font-bold text-gold-300">{speed} ms ({(speed / 1000).toFixed(1)}s)</span>
            </div>
            <input type="range" min={400} max={3000} step={100} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              className="slider" style={sliderFill(((speed - 400) / 2600) * 100)} aria-label="Tezlik" />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>400 ms</span><span>3000 ms</span></div>
          </div>

          <div>
            <label className="m-section-title text-slate-400 font-bold mb-2 block">XONALAR ORALIG'I</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { d: 1, l: "1 - 20" },
                { d: 2, l: "10 - 99" },
                { d: 3, l: "100 - 999" },
              ].map((o) => (
                <button key={o.d} type="button" onClick={() => setDigits(o.d)}
                  className={`m-pill border transition active:scale-95 ${digits === o.d ? "border-gold-500 bg-gold-500/20 text-gold-300 shadow-glow" : "border-white/10 bg-white/5 text-slate-300"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div>
              <div className="text-[12px] font-bold text-white">AMALLAR TURI</div>
              <div className="text-[11px] text-slate-400">Faqat qo'shish amali (+)</div>
            </div>
            <button type="button" role="switch" aria-checked={withMinus} onClick={() => setWithMinus((v) => !v)}
              className={`m-toggle ${withMinus ? "on" : ""}`} aria-label="Ayirishni yoqish" />
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-200 leading-relaxed">
            <b>Ogohlantirish:</b> {estSec} soniya joriy sozlamada. Bolaga diqqatni jamlashga yordam bering.
            {test.time_limit_seconds > 0 && estSec > test.time_limit_seconds && (
              <div className="mt-1 text-red-300 font-semibold">
                ⚠️ Limit ({test.time_limit_seconds}s) dan oshadi — misollar sonini kamaytiring.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <GhostButton onClick={() => nav(-1)} className="hidden sm:block">Orqaga</GhostButton>
          <Button disabled={busy} onClick={start} className="flex-1 text-[15px] !py-3.5 tracking-wide">BOSHLASH 🔥</Button>
        </div>
      </Card>
    </div>
  );
}
