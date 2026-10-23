import React, { createContext, useCallback, useContext, useState } from "react";
import { cx } from "../lib/utils";

/* ---------- Toast ---------- */
interface Toast { id: number; text: string; kind: "ok" | "err" | "info"; }
const ToastCtx = createContext<{ push: (text: string, kind?: Toast["kind"]) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);
let toastId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = toastId++;
    setItems((p) => [...p, { id, text, kind }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,420px)]" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx("rounded-xl px-4 py-3 text-sm font-medium shadow-glow text-white animate-fadeUp border border-white/10",
            t.kind === "ok" && "bg-emerald-700", t.kind === "err" && "bg-red-700", t.kind === "info" && "bg-navy-800")}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Primitives ---------- */
export function Card({ className, children, hover }: { className?: string; children: React.ReactNode; hover?: boolean }) {
  return <div className={cx("card p-5", hover && "card-hover cursor-pointer", className)}>{children}</div>;
}

export function StatCard({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent?: string; icon?: string }) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-xl">{icon}</span>}
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</div>
      </div>
      <div className={cx("mt-1 text-2xl font-extrabold", accent || "text-white")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cx("h-2.5 w-full rounded-full bg-white/10 overflow-hidden", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#d97706,#f59e0b,#ffd97a)" }} />
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "red" | "yellow" | "blue" }) {
  const tones: Record<string, string> = {
    slate: "bg-white/10 text-slate-300",
    green: "bg-emerald-500/15 text-emerald-300",
    red: "bg-red-500/15 text-red-300",
    yellow: "bg-gold-500/15 text-gold-300",
    blue: "bg-brand-500/15 text-brand-300",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Button({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={cx("btn-primary", className)} />;
}

export function GhostButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={cx("btn-ghost-dark", className)} />;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-navy-850 border border-white/10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-auto shadow-card animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Yopish" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, text }: { open: boolean; onClose: () => void; onConfirm: () => void; text: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Tasdiqlash">
      <p className="text-slate-300 mb-5">{text}</p>
      <div className="flex gap-2 justify-end">
        <GhostButton onClick={onClose}>Yo'q</GhostButton>
        <button onClick={onConfirm} className="rounded-xl px-4 py-2.5 font-semibold bg-red-600 text-white hover:bg-red-500">Ha</button>
      </div>
    </Modal>
  );
}

export function Loading({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-label="Yuklanmoqda">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ text, action, icon = "📋" }: { text: string; action?: React.ReactNode; icon?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-slate-400 font-medium">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mt-4 no-print">
      <GhostButton disabled={page <= 1} onClick={() => onPage(page - 1)}>←</GhostButton>
      <span className="text-sm text-slate-400">{page} / {pages}</span>
      <GhostButton disabled={page >= pages} onClick={() => onPage(page + 1)}>→</GhostButton>
    </div>
  );
}
