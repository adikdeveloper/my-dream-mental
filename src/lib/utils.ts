export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total || 0));
  if (s < 60) return `${s} soniya`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} daqiqa ${r} soniya` : `${m} daqiqa`;
}

export function formatShort(total: number): string {
  const s = Math.max(0, Math.round(total || 0));
  const m = Math.floor(s / 60);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s % 60}s`;
}

export function formatDateTime(tsSec: number | null | undefined): string {
  if (!tsSec) return "—";
  const d = new Date(tsSec * 1000);
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function formatDate(tsSec: number): string {
  return new Date(tsSec * 1000).toLocaleDateString("uz-UZ");
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "\uFEFF" + [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
