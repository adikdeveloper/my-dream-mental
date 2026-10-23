// Qo'lda chizilgan (doodle) uslubdagi animatsiyali SVG stikerlar.
// Hamma stiker sof SVG — hech qanday rasm fayli kerak emas, ikkala temada ham chiroyli ko'rinadi.
import type { CSSProperties } from "react";
import { cx } from "../lib/utils";

interface StickerProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

function St({ size = 64, className, style, label, children }: StickerProps & { children: React.ReactNode }) {
  // Eslatma: <title> ataylab chiqarilmaydi — hover'da nom chiqib turmasligi uchun.
  // Ekran o'quvchilar uchun aria-label yetarli.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cx("st-sticker", className)}
      style={style}
      role="img"
      aria-label={label || "stiker"}
    >
      {children}
    </svg>
  );
}

// Doodle aksessuarlar
function Sparkles({ points = [{ x: 14, y: 20, s: 1, d: "0s" }] }: { points?: { x: number; y: number; s: number; d: string }[] }) {
  return (
    <g>
      {points.map((p, i) => (
        <path
          key={i}
          className="st-twinkle"
          style={{ animationDelay: p.d }}
          transform={`translate(${p.x} ${p.y}) scale(${p.s})`}
          d="M0 -7 C1 -2 2 -1 7 0 C2 1 1 2 0 7 C-1 2 -2 1 -7 0 C-2 -1 -1 -2 0 -7 Z"
          fill="#FFD97A"
          stroke="#B45309"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function Eyes({ x1, y1, x2, y2, r = 3.2, wink = false, delay = "0s" }: { x1: number; y1: number; x2: number; y2: number; r?: number; wink?: boolean; delay?: string }) {
  return (
    <g fill="#0B1026">
      <circle className="st-eye" style={{ animationDelay: delay }} cx={x1} cy={y1} r={r} />
      {wink ? (
        <path d={`M${x2 - 4} ${y2} Q${x2} ${y2 + 3.5} ${x2 + 4} ${y2}`} fill="none" stroke="#0B1026" strokeWidth="2.6" strokeLinecap="round" />
      ) : (
        <circle className="st-eye" style={{ animationDelay: delay }} cx={x2} cy={y2} r={r} />
      )}
    </g>
  );
}

function Smile({ x, y, w = 12, flip = false }: { x: number; y: number; w?: number; flip?: boolean }) {
  const d = flip
    ? `M${x - w / 2} ${y} Q${x} ${y - 5} ${x + w / 2} ${y}`
    : `M${x - w / 2} ${y} Q${x} ${y + 5} ${x + w / 2} ${y}`;
  return <path d={d} fill="none" stroke="#0B1026" strokeWidth="2.8" strokeLinecap="round" />;
}

const OUTLINE = "#0B1026";

/* ---------- 🧠 Aqlli miya ---------- */
export function BrainSticker(props: StickerProps) {
  return (
    <St {...props} label="Tabassumli miya">
      <g className="st-bob">
        <path
          d="M50 10 C58 10 61 16 68 16 C79 16 87 24 87 35 C87 41 84 45 81 48 C86 52 86 60 80 64 C77 66 74 66 71 65 C68 72 60 77 52 75 C44 77 36 72 33 66 C27 67 22 63 22 57 C22 52 25 48 28 46 C24 42 23 35 27 30 C31 24 37 26 41 23 C43 15 46 10 50 10 Z"
          fill="#FFE9A8"
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M50 24 C45 33 55 38 50 47 C46 54 54 58 51 68" fill="none" stroke="#F59E0B" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M38 32 C34 38 36 44 33 50 M63 33 C67 39 65 45 68 51" fill="none" stroke="#F59E0B" strokeWidth="2.6" strokeLinecap="round" />
        <Eyes x1={41} y1={49} x2={59} y2={49} />
        <Smile x={50} y={58} />
        <circle cx={33} cy={57} r={2.4} fill="#F59E0B" opacity=".7" />
        <circle cx={67} cy={57} r={2.4} fill="#F59E0B" opacity=".7" />
      </g>
      <Sparkles points={[{ x: 13, y: 22, s: 0.9, d: "0s" }, { x: 88, y: 70, s: 0.7, d: "1.1s" }]} />
    </St>
  );
}

/* ---------- 🚀 Raketa ---------- */
export function RocketSticker(props: StickerProps) {
  return (
    <St {...props} label="Uchayotgan raketa">
      <g className="st-drift">
        <path d="M14 44 L6 44 M16 60 L4 60 M14 76 L8 76" stroke="#F59E0B" strokeWidth="3.4" strokeLinecap="round" className="st-dash" />
        <path d="M52 6 C61 17 66 30 66 45 L38 45 C38 30 43 17 52 6 Z" fill="#fff" stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="52" cy="31" r="7.5" fill="#BFDBFE" stroke={OUTLINE} strokeWidth="3.4" />
        <circle cx="54.5" cy="28.5" r="2" fill="#fff" />
        <path d="M38 40 L26 58 L38 54 Z" fill="#F87171" stroke={OUTLINE} strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M66 40 L78 58 L66 54 Z" fill="#F87171" stroke={OUTLINE} strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M45 45 L52 66 L59 45 Z" fill="#FFD97A" stroke={OUTLINE} strokeWidth="3.2" strokeLinejoin="round" />
        <path d="M48.5 45 L52 56 L55.5 45 Z" fill="#F59E0B" />
        <Eyes x1={46.5} y1={42} x2={57.5} y2={42} r={2.2} delay=".7s" />
      </g>
      <Sparkles points={[{ x: 86, y: 18, s: 0.9, d: ".4s" }]} />
    </St>
  );
}

/* ---------- 🏆 Kubok ---------- */
export function TrophySticker(props: StickerProps) {
  return (
    <St {...props} label="Oltin kubok">
      <g className="st-wiggle">
        <path d="M34 22 C22 22 20 32 30 38 C33 40 36 40 38 40 M66 22 C78 22 80 32 70 38 C67 40 64 40 62 40" fill="none" stroke={OUTLINE} strokeWidth="4" strokeLinecap="round" />
        <path d="M33 14 L67 14 L63 40 C62 49 56 54 50 54 C44 54 38 49 37 40 Z" fill="#FFD97A" stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round" />
        <path d="M50 24 L52.6 30.4 L59.5 30.7 L54 34.9 L55.8 41.6 L50 37.8 L44.2 41.6 L46 34.9 L40.5 30.7 L47.4 30.4 Z" fill="#F59E0B" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M50 54 L50 63 M40 69 L60 69 L62 76 L38 76 Z" fill="#FFE9A8" stroke={OUTLINE} strokeWidth="3.6" strokeLinejoin="round" />
        <Eyes x1={45} y1={46} x2={55} y2={46} r={2.2} delay="1.3s" />
        <Smile x={50} y={50.5} w={7} />
      </g>
      <Sparkles points={[{ x: 15, y: 30, s: 0.8, d: ".8s" }, { x: 86, y: 44, s: 1, d: "0s" }]} />
    </St>
  );
}

/* ---------- ⭐ Yulduzcha ---------- */
export function StarSticker(props: StickerProps) {
  return (
    <St {...props} label="Ko'z qisgan yulduz">
      <g className="st-bob">
        <path
          d="M50 10 L60 38 L89 39 L66 56 L74 85 L50 68 L26 85 L34 56 L11 39 L40 38 Z"
          fill="#FFD97A"
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <Eyes x1={42} y1={50} x2={59} y2={50} r={3} wink delay="2s" />
        <Smile x={50} y={59} w={11} />
        <circle cx={35} cy={58} r={2.2} fill="#F59E0B" opacity=".8" />
        <circle cx={65} cy={58} r={2.2} fill="#F59E0B" opacity=".8" />
      </g>
      <Sparkles points={[{ x: 88, y: 16, s: 0.8, d: ".2s" }]} />
    </St>
  );
}

/* ---------- ⚡ Chaqlan ---------- */
export function BoltSticker(props: StickerProps) {
  return (
    <St {...props} label="Quvnoq chaqmoq">
      <g className="st-wiggle">
        <path
          d="M60 6 L28 56 L45 56 L40 94 L72 40 L55 40 Z"
          fill="#FFE9A8"
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <Eyes x1={48} y1={52} x2={58} y2={50} r={2.8} delay=".4s" />
        <Smile x={53} y={60} w={10} />
      </g>
      <Sparkles points={[{ x: 80, y: 78, s: 0.9, d: "1.4s" }, { x: 16, y: 30, s: 0.7, d: ".6s" }]} />
    </St>
  );
}

/* ---------- 🔥 Olov (streak) ---------- */
export function FlameSticker(props: StickerProps) {
  return (
    <St {...props} label="Streak olovi">
      <g className="st-bob">
        <path
          d="M50 6 C56 20 72 28 72 52 C72 71 61 86 50 86 C39 86 28 71 28 52 C28 42 32 33 38 27 C40 35 44 38 47 38 C45 28 46 15 50 6 Z"
          fill="#FBBF24"
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M50 46 C54 53 60 56 60 65 C60 72 55 77 50 77 C45 77 40 72 40 65 C40 60 42 56 45 53 C46 57 48 58 50 58 C49 54 49 50 50 46 Z" fill="#F87171" />
        <Eyes x1={44} y1={62} x2={56} y2={62} r={2.6} delay="1s" />
        <Smile x={50} y={70} w={8} />
      </g>
      <Sparkles points={[{ x: 14, y: 60, s: 0.8, d: ".9s" }, { x: 86, y: 40, s: 0.7, d: ".1s" }]} />
    </St>
  );
}

/* ---------- ☀️ Quyoshcha ---------- */
export function SunSticker(props: StickerProps) {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <St {...props} label="Kuluvchi quyosh">
      <g className="st-spin-slow" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {rays.map((a, i) => (
          <line
            key={i}
            x1={50 + Math.cos(a) * 24}
            y1={50 + Math.sin(a) * 24}
            x2={50 + Math.cos(a) * 33}
            y2={50 + Math.sin(a) * 33}
            stroke="#F59E0B"
            strokeWidth="4.4"
            strokeLinecap="round"
          />
        ))}
      </g>
      <g className="st-bob">
        <circle cx="50" cy="50" r="19" fill="#FFD97A" stroke={OUTLINE} strokeWidth="4" />
        <Eyes x1={43.5} y1={48} x2={56.5} y2={48} r={2.8} delay="1.7s" />
        <Smile x={50} y={56} w={11} />
        <circle cx={37} cy={54} r={2.2} fill="#F59E0B" opacity=".8" />
        <circle cx={63} cy={54} r={2.2} fill="#F59E0B" opacity=".8" />
      </g>
    </St>
  );
}

/* ---------- 🌙 Oycha ---------- */
export function MoonSticker(props: StickerProps) {
  return (
    <St {...props} label="Uxlayotgan oy">
      <g className="st-drift">
        <path
          d="M64 10 C42 10 26 27 26 50 C26 73 42 90 64 90 C50 80 43 66 43 50 C43 34 50 20 64 10 Z"
          fill="#BFDBFE"
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M40 52 Q44 55 48 52" fill="none" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
        <Smile x={47} y={60} w={8} />
        <circle cx={37} cy={58} r={2} fill="#3B82F6" opacity=".7" />
      </g>
      <g fill="#1E2763" fontWeight="800" fontSize="13" fontStyle="italic">
        <text x="66" y="34" className="st-float-z" style={{ animationDelay: "0s" }}>z</text>
        <text x="74" y="24" fontSize="16" className="st-float-z" style={{ animationDelay: ".9s" }}>z</text>
        <text x="84" y="12" fontSize="19" className="st-float-z" style={{ animationDelay: "1.8s" }}>z</text>
      </g>
      <Sparkles points={[{ x: 18, y: 20, s: 0.8, d: ".5s" }]} />
    </St>
  );
}

/* ---------- 🧮 Abakus ---------- */
export function AbacusSticker(props: StickerProps) {
  return (
    <St {...props} label="Rangli abakus">
      <g className="st-wiggle">
        <rect x="18" y="24" width="64" height="52" rx="9" fill="#fff" stroke={OUTLINE} strokeWidth="4" />
        <line x1="18" y1="48" x2="82" y2="48" stroke={OUTLINE} strokeWidth="3.4" />
        {[34, 50, 66].map((x) => (
          <line key={x} x1={x} y1={28} x2={x} y2={72} stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
        ))}
        <circle cx="34" cy="36" r="5.4" fill="#F87171" stroke={OUTLINE} strokeWidth="2.6" className="st-bead" style={{ animationDelay: "0s" }} />
        <circle cx="34" cy="62" r="5.4" fill="#FBBF24" stroke={OUTLINE} strokeWidth="2.6" className="st-bead" style={{ animationDelay: ".5s" }} />
        <circle cx="50" cy="40" r="5.4" fill="#34D399" stroke={OUTLINE} strokeWidth="2.6" className="st-bead" style={{ animationDelay: "1s" }} />
        <circle cx="50" cy="64" r="5.4" fill="#60A5FA" stroke={OUTLINE} strokeWidth="2.6" className="st-bead" style={{ animationDelay: "1.5s" }} />
        <circle cx="66" cy="34" r="5.4" fill="#FBBF24" stroke={OUTLINE} strokeWidth="2.6" className="st-bead" style={{ animationDelay: "2s" }} />
        <circle cx="66" cy="60" r="5.4" fill="#F87171" stroke={OUTLINE} strokeWidth="2.6" className="st-bead" style={{ animationDelay: "2.5s" }} />
      </g>
      <Sparkles points={[{ x: 88, y: 16, s: 0.8, d: "1.2s" }]} />
    </St>
  );
}

/* ---------- 🏅 Medal ---------- */
export function MedalSticker(props: StickerProps) {
  return (
    <St {...props} label="G'olib medali">
      <g className="st-bob">
        <path d="M38 6 L48 34 L38 40 L28 12 Z" fill="#60A5FA" stroke={OUTLINE} strokeWidth="3.2" strokeLinejoin="round" />
        <path d="M62 6 L52 34 L62 40 L72 12 Z" fill="#F87171" stroke={OUTLINE} strokeWidth="3.2" strokeLinejoin="round" />
        <circle cx="50" cy="62" r="22" fill="#FFD97A" stroke={OUTLINE} strokeWidth="4" />
        <circle cx="50" cy="62" r="15.5" fill="none" stroke="#B45309" strokeWidth="2.4" strokeDasharray="4 4" className="st-dash" />
        <path d="M50 51 L52.8 58.4 L60.8 58.6 L54.4 63.2 L56.4 70.8 L50 66.4 L43.6 70.8 L45.6 63.2 L39.2 58.6 L47.2 58.4 Z" fill="#F59E0B" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      </g>
      <Sparkles points={[{ x: 16, y: 60, s: 0.9, d: ".3s" }, { x: 85, y: 62, s: 0.8, d: "1.5s" }]} />
    </St>
  );
}

/* ---------- Kichik miltillovchi yulduzcha (bezak) ---------- */
export function SparkleDoodle({ size = 22, className, style }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cx("st-twinkle", className)} style={style} aria-hidden="true">
      <path
        d="M12 2 C12.8 8 14 10 20 12 C14 14 12.8 16 12 22 C11.2 16 10 14 4 12 C10 10 11.2 8 12 2 Z"
        fill="#FFD97A"
        stroke="#B45309"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
