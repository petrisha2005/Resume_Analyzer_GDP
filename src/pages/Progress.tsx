import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, Legend,
} from "recharts";
import { useApp } from "../state/AppContext";
import { newlyLearnedSkills, skillDeltas, resetProgress } from "../lib/userDataService";

export default function Progress() {
  const { user, progress, setReadiness } = useApp();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Sign in to see your progress</h1>
        <Link to="/login" className="btn-primary inline-block mt-4">Log in</Link>
      </div>
    );
  }

  if (!progress || progress.scoreHistory.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">📈</div>
        <h1 className="text-2xl font-bold mb-2">No progress yet</h1>
        <p className="text-white/60 mb-6">
          Upload your resume, pick a career goal, and complete the analysis. Your before/after journey will be tracked here automatically.
        </p>
        <Link to="/upload" className="btn-primary inline-block">Start Analysis</Link>
      </div>
    );
  }

  const initialSkillCount = progress.initialSkills.length;
  const currentSkillCount = progress.currentSkills.length;
  const initialAvgDepth = avg(progress.initialSkills.map((s) => s.depth));
  const currentAvgDepth = avg(progress.currentSkills.map((s) => s.depth));
  const initialScore = progress.scoreHistory[0]?.score ?? 0;
  const currentScore = progress.scoreHistory[progress.scoreHistory.length - 1]?.score ?? 0;
  const verifiedCount = progress.currentSkills.filter(
    (s) => s.verification === "Strong" || s.verification === "Basic"
  ).length;
  const initialVerified = progress.initialSkills.filter(
    (s) => s.verification === "Strong" || s.verification === "Basic"
  ).length;

  const newSkills = newlyLearnedSkills(progress);
  const deltas = skillDeltas(progress).slice(0, 10);

  const scoreChartData = progress.scoreHistory.map((p, i) => ({
    name: i === 0 ? "Start" : `#${i + 1}`,
    score: p.score,
    date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  const beforeAfterData = [
    { metric: "Skills",         before: initialSkillCount, after: currentSkillCount },
    { metric: "Verified",       before: initialVerified,   after: verifiedCount },
    { metric: "Avg Depth",      before: initialAvgDepth,   after: currentAvgDepth },
    { metric: "Readiness",      before: initialScore,      after: currentScore },
  ];

  function handleReset() {
    if (!user) return;
    if (confirm("Reset your progress baseline? This will clear your improvement history.")) {
      resetProgress(user.id);
      // trigger re-record on next state update
      setReadiness(0, "");
      window.location.reload();
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50">Your Journey</div>
          <h1 className="text-3xl font-bold">📈 Progress Tracking</h1>
          <p className="text-white/60 text-sm mt-1">
            Started on {new Date(progress.initialDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            {progress.initialGoal && <> · Goal: <b className="text-white/80">{progress.initialGoal}</b></>}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:bg-white/5"
          title="Clear baseline and start fresh"
        >
          🔄 Reset baseline
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Readiness Score" before={initialScore} after={currentScore} suffix="%" />
        <Kpi label="Total Skills" before={initialSkillCount} after={currentSkillCount} />
        <Kpi label="Verified Skills" before={initialVerified} after={verifiedCount} />
        <Kpi label="Avg Depth" before={initialAvgDepth} after={currentAvgDepth} suffix="%" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Before vs After bar chart */}
        <div className="card p-5">
          <h2 className="font-semibold mb-1">Before vs After</h2>
          <p className="text-xs text-white/50 mb-3">Snapshot comparison of your baseline vs latest analysis.</p>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={beforeAfterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
                <XAxis dataKey="metric" stroke="#ffffff80" tick={{ fontSize: 12 }} />
                <YAxis stroke="#ffffff80" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#0c0c1a", border: "1px solid #ffffff20", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="before" name="Before" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="after" name="Now"     fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score history line chart */}
        <div className="card p-5">
          <h2 className="font-semibold mb-1">Readiness Over Time</h2>
          <p className="text-xs text-white/50 mb-3">
            {progress.scoreHistory.length} analysis snapshot{progress.scoreHistory.length === 1 ? "" : "s"} recorded.
          </p>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={scoreChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
                <XAxis dataKey="name" stroke="#ffffff80" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="#ffffff80" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#0c0c1a", border: "1px solid #ffffff20", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(v) => [`${v}%`, "Readiness"]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#a78bfa"
                  strokeWidth={3}
                  dot={{ fill: "#a78bfa", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Skill deltas + newly learned */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-1">Top Skill Improvements</h2>
          <p className="text-xs text-white/50 mb-3">Depth change since your baseline.</p>
          {deltas.length === 0 ? (
            <p className="text-sm text-white/50">No skill changes recorded yet — re-analyze to see deltas.</p>
          ) : (
            <div style={{ width: "100%", height: Math.max(180, deltas.length * 32) }}>
              <ResponsiveContainer>
                <BarChart data={deltas} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
                  <XAxis type="number" domain={[-50, 100]} stroke="#ffffff80" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} stroke="#ffffff80" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#0c0c1a", border: "1px solid #ffffff20", borderRadius: 8 }}
                    formatter={((v: unknown, name: unknown) => {
                      const num = Number(v);
                      return [`${num > 0 ? "+" : ""}${num}%`, name === "delta" ? "Δ" : String(name)];
                    }) as never}
                  />
                  <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                    {deltas.map((d, i) => (
                      <Cell key={i} fill={d.delta >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-3">🆕 Newly Learned Skills</h2>
          {newSkills.length === 0 ? (
            <p className="text-sm text-white/50">
              No new skills added since baseline. Update your resume or GitHub and re-run analysis to track new skills here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {newSkills.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm"
                >
                  ✨ {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Improvement log */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3">📜 Improvement Log</h2>
        {progress.improvementLog.length === 0 ? (
          <p className="text-sm text-white/50">No log entries yet.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {[...progress.improvementLog].reverse().map((entry, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="text-xs text-white/40 whitespace-nowrap mt-0.5">
                  {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
                <div className="text-sm text-white/85">{entry.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, before, after, suffix = "" }: { label: string; before: number; after: number; suffix?: string }) {
  const delta = after - before;
  const up = delta > 0;
  const same = delta === 0;
  return (
    <div className="card p-4">
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold">{after}{suffix}</div>
        <div className={`text-xs font-semibold ${same ? "text-white/40" : up ? "text-emerald-400" : "text-red-400"}`}>
          {same ? "—" : (up ? "▲" : "▼")} {Math.abs(delta)}{suffix}
        </div>
      </div>
      <div className="text-[11px] text-white/40 mt-0.5">was {before}{suffix}</div>
    </div>
  );
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
