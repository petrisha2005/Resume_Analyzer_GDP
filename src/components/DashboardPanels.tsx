import type { ATSScore, PortfolioStrength, MarketDemand, JobMatch, ProjectIdea } from "../lib/types";

const DEMAND_STYLE: Record<string, { color: string; emoji: string; bg: string }> = {
  High:   { color: "#22c55e", emoji: "🔥", bg: "bg-green-500/15 border-green-500/30 text-green-300" },
  Medium: { color: "#eab308", emoji: "⚡", bg: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300" },
  Low:    { color: "#94a3b8", emoji: "📉", bg: "bg-white/5 border-white/10 text-white/60" },
};

/* -------- ATS Score Card -------- */
export function ATSScoreCard({ ats }: { ats: ATSScore | null }) {
  if (!ats) {
    return (
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-2">📄 Resume ATS Score</div>
        <div className="text-sm text-white/50">Upload a resume to see your ATS score.</div>
      </div>
    );
  }
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white/50">📄 Resume ATS Score</div>
        <div className="text-3xl font-extrabold" style={{ color: scoreColor(ats.score) }}>{ats.score}<span className="text-base text-white/50">/100</span></div>
      </div>
      <div className="space-y-2 mb-3">
        <Bar label="Keyword match" value={ats.keywordScore} />
        <Bar label="Formatting" value={ats.formattingScore} />
        <Bar label="Skill relevance" value={ats.relevanceScore} />
      </div>
      <div className="text-xs text-white/50 mb-1">Improvement tips:</div>
      <ul className="text-xs text-white/70 space-y-1">
        {ats.tips.slice(0, 4).map((t, i) => <li key={i}>• {t}</li>)}
      </ul>
    </div>
  );
}

/* -------- Portfolio Strength Card -------- */
export function PortfolioStrengthCard({ ps }: { ps: PortfolioStrength | null }) {
  if (!ps) {
    return (
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-2">💻 GitHub Portfolio Strength</div>
        <div className="text-sm text-white/50">Connect a GitHub username to see your portfolio score.</div>
      </div>
    );
  }
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-white/50">💻 GitHub Portfolio Strength</div>
        <div className="text-3xl font-extrabold" style={{ color: scoreColor(ps.score) }}>{ps.score}<span className="text-base text-white/50">/100</span></div>
      </div>
      <div className="space-y-2 mb-3">
        <Bar label="Repo quality" value={ps.repoQuality} />
        <Bar label="README depth" value={ps.readmeQuality} />
        <Bar label="Stack diversity" value={ps.diversity} />
        <Bar label="Consistency" value={ps.consistency} />
      </div>
      <div className="text-xs text-white/50 mb-1">Feedback:</div>
      <ul className="text-xs text-white/70 space-y-1">
        {ps.feedback.slice(0, 3).map((t, i) => <li key={i}>• {t}</li>)}
      </ul>
    </div>
  );
}

/* -------- Market Demand Panel -------- */
export function MarketDemandPanel({ data }: { data: MarketDemand[] }) {
  if (!data?.length) {
    return (
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-2">📊 Market Demand</div>
        <div className="text-sm text-white/50">Add skills to see market demand.</div>
      </div>
    );
  }
  const sorted = [...data].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.demand] - order[b.demand];
  });
  return (
    <div className="card p-6">
      <div className="text-sm text-white/50 mb-3">📊 Real-Time Market Demand</div>
      <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {sorted.slice(0, 14).map((m) => {
          const s = DEMAND_STYLE[m.demand];
          return (
            <div key={m.skill} className={`p-2.5 rounded-lg border text-xs ${s.bg}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white/90">{m.skill}</span>
                <span>{s.emoji} {m.demand}</span>
              </div>
              <div className="text-[11px] text-white/60 mt-1">{m.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------- Job Match Panel -------- */
export function JobMatchPanel({ matches }: { matches: JobMatch[] }) {
  if (!matches?.length) {
    return (
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-2">🎯 Top Role Matches</div>
        <div className="text-sm text-white/50">Verify some skills first to see job matches.</div>
      </div>
    );
  }
  const top = matches.slice(0, 5);
  return (
    <div className="card p-6">
      <div className="text-sm text-white/50 mb-3">🎯 Top Role Matches</div>
      <div className="space-y-3">
        {top.map((m, i) => (
          <div key={m.roleId} className="p-3 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">
                  {i === 0 && <span className="mr-1">🥇</span>}
                  {i === 1 && <span className="mr-1">🥈</span>}
                  {i === 2 && <span className="mr-1">🥉</span>}
                  {m.roleName}
                </div>
                <div className="text-[11px] text-white/50">{m.category}</div>
              </div>
              <div className="text-xl font-extrabold" style={{ color: scoreColor(m.matchPercent) }}>{m.matchPercent}%</div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full" style={{ width: `${m.matchPercent}%`, background: scoreColor(m.matchPercent) }} />
            </div>
            <div className="text-[11px] text-white/60 mt-2">
              <span className="text-green-300">✓ {m.matchedSkills.slice(0, 4).join(", ") || "—"}</span>
              {m.missingSkills.length > 0 && (
                <div className="text-red-300/80 mt-0.5">✗ Missing: {m.missingSkills.slice(0, 4).join(", ")}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Project Recommendation Panel -------- */
export function ProjectRecommendationPanel({ ideas }: { ideas: ProjectIdea[] }) {
  if (!ideas?.length) {
    return (
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-2">🚀 Project Ideas</div>
        <div className="text-sm text-white/50">Pick a career goal to get tailored project ideas.</div>
      </div>
    );
  }
  const diffColor = { Beginner: "bg-green-500/20 text-green-300", Intermediate: "bg-yellow-500/20 text-yellow-300", Advanced: "bg-red-500/20 text-red-300" };
  return (
    <div className="card p-6">
      <div className="text-sm text-white/50 mb-3">🚀 AI-Recommended Projects</div>
      <div className="grid md:grid-cols-2 gap-3">
        {ideas.map((p, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm">{p.title}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${diffColor[p.difficulty]}`}>{p.difficulty}</span>
            </div>
            <div className="text-xs text-white/60 mt-1">{p.description}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {p.techStack.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Helpers -------- */
function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/60">
        <span>{label}</span><span>{value}/100</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-0.5">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}
