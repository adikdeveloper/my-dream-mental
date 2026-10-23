import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, StatCard, Loading, Badge, GhostButton } from "../../components/ui";
import { Donut } from "../../components/Charts";
import { formatSeconds } from "../../lib/utils";
import { t } from "../../lib/i18n";

interface Res {
  attempt: {
    test_name: string; total_questions: number; correct_count: number; wrong_count: number;
    accuracy: number; score: number; duration_seconds: number; difficulty: string;
  };
  questions: { question_order: number; question_text: string; student_answer: number | null; expected_answer: number; is_correct: number; response_time_ms: number }[];
  avg_response_sec: number;
}

export default function Result() {
  const { attemptId } = useParams();
  const [r, setR] = useState<Res | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (attemptId) api.get<Res>(`/api/attempts/${attemptId}`).then(setR).catch((e) => setError(e instanceof Error ? e.message : "Natija topilmadi."));
  }, [attemptId]);

  if (error) return (
    <div className="min-h-screen p-4">
      <div className="max-w-xl mx-auto space-y-4 page-anim">
        <Card className="text-center py-8">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-red-300 font-semibold">{error}</p>
          <div className="mt-4 flex gap-2 justify-center">
            <Link to="/student/dashboard"><GhostButton>🏠 Dashboard</GhostButton></Link>
            <GhostButton onClick={() => window.location.reload()}>Qayta urinish</GhostButton>
          </div>
        </Card>
      </div>
    </div>
  );
  if (!r) return <Loading lines={5} />;
  const a = r.attempt;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-xl mx-auto space-y-4 page-anim">
        <Card className="text-center py-8" >
          <div className="text-6xl mb-3 animate-pop">{a.accuracy >= 70 ? "🎉" : "💪"}</div>
          <h1 className="text-3xl font-extrabold text-white">{t.result}: {a.correct_count} / {a.total_questions}</h1>
          <p className="text-slate-400 mt-1">{a.test_name}</p>
          <div className="mt-4 flex justify-center"><Donut correct={a.correct_count} wrong={a.wrong_count} size={140} /></div>
          <div className="mt-3"><Badge tone="blue">{a.difficulty}</Badge></div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="🎯" label={t.accuracy} value={`${Math.round(a.accuracy)}%`} accent="text-emerald-300" />
          <StatCard icon="⭐" label={t.score} value={String(a.score)} accent="text-gold-300" />
          <StatCard icon="⏱" label={t.spentTime} value={formatSeconds(a.duration_seconds)} />
          <StatCard icon="⚡" label={t.avgTime} value={`${r.avg_response_sec} soniya`} />
        </div>
        <Card>
          <h2 className="font-bold mb-3 text-white">Savollar tahlili</h2>
          <div className="space-y-1.5 max-h-80 overflow-auto">
            {r.questions.map((q) => (
              <div key={q.question_order} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${q.is_correct ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                <span className="font-mono font-bold flex-1 text-slate-100">{q.question_text.replace("= ?", `= ${q.student_answer ?? "—"}`)}</span>
                <span>{q.is_correct ? "✅" : `❌ (${q.expected_answer ?? "?"})`}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="flex gap-2">
          <Link to="/student/dashboard" className="flex-1"><GhostButton className="w-full">🏠 Dashboard</GhostButton></Link>
          <Link to="/student/history" className="flex-1"><GhostButton className="w-full">📜 Tarix</GhostButton></Link>
        </div>
      </div>
    </div>
  );
}
