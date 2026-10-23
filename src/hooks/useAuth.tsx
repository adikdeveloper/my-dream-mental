import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Student, Teacher } from "../types";

interface AuthState {
  role: "teacher" | "student" | null;
  teacher: Teacher | null;
  student: Student | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  role: null, teacher: null, student: null, loading: true,
  refresh: async () => {}, logout: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AuthState["role"]>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  // StrictMode double-effect'da ikki marta /me so'rov yubormaslik uchun
  const inflight = React.useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    const p = (async () => {
      setLoading(true);
      try {
        const me = await api.get<{ role: string | null; teacher?: Teacher | null }>("/api/auth/me");
        if (me.role === "teacher" && me.teacher) {
          setRole("teacher");
          setTeacher(me.teacher);
          setStudent(null);
          return;
        }
        const sme = await api.get<{ role: string | null; student?: Student | null }>("/api/student/me");
        if (sme.role === "student" && sme.student) {
          setRole("student");
          setStudent(sme.student);
          setTeacher(null);
          return;
        }
        setRole(null);
        setTeacher(null);
        setStudent(null);
      } catch {
        // Faqat real network xatoda bu yerga tushadi (401 endi kelmaydi)
        setRole(null);
        setTeacher(null);
        setStudent(null);
      } finally {
        setLoading(false);
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, []);

  const logout = useCallback(async () => {
    // Role noma'lum bo'lsa ham ikkala sessiyani yopishga urinamiz —
    // aks holda cookie o'chmay qolib sessiya "tirilib" ketadi.
    try {
      await api.post("/api/auth/teacher/logout").catch(() => {});
    } catch { /* ignore */ }
    try {
      await api.post("/api/student/logout").catch(() => {});
    } catch { /* ignore */ }
    setRole(null);
    setTeacher(null);
    setStudent(null);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <Ctx.Provider value={{ role, teacher, student, loading, refresh, logout }}>{children}</Ctx.Provider>;
}
