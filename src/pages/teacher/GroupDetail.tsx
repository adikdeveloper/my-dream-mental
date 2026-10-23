import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Badge, Loading, EmptyState, GhostButton } from "../../components/ui";
import { levelNames } from "../../lib/i18n";
import type { Group } from "../../types";

interface GroupStudent {
  id: string;
  full_name: string;
  student_code: string;
  level: string;
  status: string;
}

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    api.get<{ group: Group; students: GroupStudent[] }>(`/api/groups/${id}`)
      .then((r) => {
        if (!alive) return;
        setGroup(r.group);
        setStudents(r.students || []);
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Yuklashda xatolik."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <Loading lines={5} />;
  if (error) return <Card><p className="text-red-400">{error}</p></Card>;
  if (!group) return <Card><p className="text-slate-400">Guruh topilmadi.</p></Card>;

  return (
    <div className="space-y-4">
      <Link to="/teacher/groups" className="text-sm text-slate-400 hover:text-gold-300">← Guruhlar</Link>
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-12 h-12 rounded-2xl text-2xl" style={{ background: "linear-gradient(135deg,rgba(255,217,122,.25),rgba(245,158,11,.25))" }}>📁</span>
        <div>
          <h1 className="text-2xl font-extrabold text-white">{group.name}</h1>
          <p className="text-sm text-slate-400">{students.length} nafar o'quvchi</p>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState icon="👥" text="Bu guruhda o'quvchi yo'q." />
      ) : (
        <Card className="!p-2">
          <div className="space-y-1.5">
            {students.map((s) => (
              <Link key={s.id} to={`/teacher/students/${s.id}`}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 hover:bg-white/5 hover:border-gold-500/40 transition">
                <span className="grid place-items-center w-9 h-9 rounded-full font-bold text-sm text-navy-950 shrink-0"
                  style={{ background: "linear-gradient(135deg,#ffd97a,#f59e0b)" }}>
                  {s.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-slate-100 text-sm block truncate">{s.full_name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{s.student_code}</span>
                </span>
                <Badge tone="blue">{levelNames[s.level] || s.level}</Badge>
                {s.status === "active" ? <Badge tone="green">Faol</Badge> : <Badge tone="red">Nofaol</Badge>}
              </Link>
            ))}
          </div>
        </Card>
      )}
      <div>
        <Link to="/teacher/students"><GhostButton>+ O'quvchi qo'shish</GhostButton></Link>
      </div>
    </div>
  );
}
