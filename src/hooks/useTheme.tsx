// Kunduzgi / Tungi / Avto rejim.
// - Tanlov localStorage ("mdm-theme") da saqlanadi.
// - "auto" — qurilma/soat tizim temasiga (prefers-color-scheme) ergashadi.
// - html elementiga "light" klassi qo'yiladi; dark — standart (klassiz).
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type EffectiveTheme = "light" | "dark";

const STORAGE_KEY = "mdm-theme";

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch { /* ignore */ }
  return "auto";
}

function systemTheme(): EffectiveTheme {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export function resolveEffective(mode: ThemeMode): EffectiveTheme {
  return mode === "auto" ? systemTheme() : mode;
}

function applyTheme(eff: EffectiveTheme) {
  const root = document.documentElement;
  root.classList.toggle("light", eff === "light");
  root.style.colorScheme = eff;
  root.dataset.theme = eff;
}

interface ThemeState {
  mode: ThemeMode;
  effective: EffectiveTheme;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeState>({ mode: "auto", effective: "dark", setMode: () => {} });

export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStored());
  const [effective, setEffective] = useState<EffectiveTheme>(() => resolveEffective(readStored()));

  // Tizim temasi o'zgarganda (faqat auto rejimda) — jonli yangilash
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      setModeState((m) => {
        if (m === "auto") setEffective(systemTheme());
        return m;
      });
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setEffective(resolveEffective(m));
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch { /* ignore */ }
  }, []);

  // İlk yuklanishda html dagi sinf bilan sinxronlash (index.html dagi skript qo'ygan)
  useEffect(() => {
    setEffective(resolveEffective(readStored()));
  }, []);

  return <Ctx.Provider value={{ mode, effective, setMode }}>{children}</Ctx.Provider>;
}
