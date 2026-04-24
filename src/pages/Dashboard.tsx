import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { detectSkillGaps, computeReadinessScore, generateRoadmap } from "../lib/scoring";
import { predictFutureSkills } from "../lib/futureSkills";
import {
  computeATSScore, evaluatePortfolioStrength, getMarketDemand,
  computeJobMatches, recommendProjects,
} from "../lib/extensions";
import {
  ATSScoreCard, PortfolioStrengthCard, MarketDemandPanel,
  JobMatchPanel, ProjectRecommendationPanel,
} from "../components/DashboardPanels";
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const VERDICT_COLOR: Record<string, string> = {
  Strong: "#22c55e",
  Basic: "#eab308",
  Weak: "#ef4444",
  Unverified: "#64748b",
};

export default function Dashboard() {
  const {
    resume, github, selectedCareer, skills, gaps, roadmap, futureSkills,
    readinessScore, readinessCategory,
    atsScore, portfolioStrength, marketDemand, jobMatches, projectIdeas,
    setGaps, setRoadmap, setFutureSkills, setReadiness,
    setATSScore, setPortfolioStrength, setMarketDemand, setJobMatches, setProjectIdeas,
  } = useApp();
  const navigate = useNavigate();

  // Compute everything
  useEffect(() => {
    if (!selectedCareer) return;
    const newGaps = detectSkillGaps(selectedCareer, skills);
    const { score, category } = computeReadinessScore(selectedCareer, skills);
    const newRoadmap = generateRoadmap(selectedCareer, newGaps);
    const future = predictFutureSkills(selectedCareer);
    setGaps(newGaps);
    setReadiness(score, category);
    setRoadmap(newRoadmap);
    setFutureSkills(future);

    // Extensions
    setMarketDemand(getMarketDemand(skills));
    setJobMatches(computeJobMatches(skills));
    setProjectIdeas(recommendProjects(selectedCareer, newGaps));
    if (resume?.valid) setATSScore(computeATSScore(resume, selectedCareer));
    if (github && !github.error) setPortfolioStrength(evaluatePortfolioStrength(github));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareer, skills, resume, github]);

  const skillChart = useMemo(() => {
    return skills
      .slice()
      .sort((a, b) => b.depth - a.depth)
      .slice(0, 12)
      .map((s) => ({ name: s.name, depth: s.depth, verification: s.verification }));
  }, [skills]);

  if (!selectedCareer) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <div className="font-semibold text-lg">Pick a career to see your dashboard</div>
        <button className="btn-primary mt-4" onClick={() => navigate("/career")}>Choose a role</button>
      </div>
    );
  }

  const readinessData = [{ name: "score", value: readinessScore, fill: scoreColor(readinessScore) }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-white/50">Career Dashboard</div>
          <h1 className="text-3xl font-bold">{selectedCareer.name}</h1>
          <div className="text-white/60 text-sm mt-1">{selectedCareer.description}</div>
        </div>
        <button className="btn-primary" onClick={() => navigate("/report")}>📥 Download Report</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Readiness score */}
        <div className="card p-6">
          <div className="text-sm text-white/50 mb-2">Career Readiness</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={readinessData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "rgba(255,255,255,0.05)" }} dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-32 pb-12">
            <div className="text-5xl font-extrabold" style={{ color: scoreColor(readinessScore) }}>
              {readinessScore}<span className="text-2xl">%</span>
            </div>
            <div className="text-sm text-white/70 mt-1">{readinessCategory}</div>
          </div>
        </div>

        {/* Verification breakdown */}
        <div className="card p-6">
          <div className="text-sm text-white/50 mb-3">Skill Verification</div>
          <div className="space-y-3">
            {(["Strong", "Basic", "Weak", "Unverified"] as const).map((v) => {
              const count = skills.filter((s) => s.verification === v).length;
              const total = Math.max(skills.length, 1);
              return (
                <div key={v}>
                  <div className="flex justify-between text-sm">
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: VERDICT_COLOR[v] }} />{v}</span>
                    <span className="text-white/50">{count}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: VERDICT_COLOR[v] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future skills */}
        <div className="card p-6">
          <div className="text-sm text-white/50 mb-3">🔮 Predicted Future Skills</div>
          <div className="space-y-2">
            {futureSkills.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <span className="text-purple-300">▸</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New: ATS + Portfolio Strength */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ATSScoreCard ats={atsScore} />
        <PortfolioStrengthCard ps={portfolioStrength} />
      </div>

      {/* New: Job matches + Market demand */}
      <div className="grid lg:grid-cols-2 gap-4">
        <JobMatchPanel matches={jobMatches} />
        <MarketDemandPanel data={marketDemand} />
      </div>

      {/* New: Project recommendations */}
      <ProjectRecommendationPanel ideas={projectIdeas} />

      {/* AI Coach CTA */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border-indigo-400/20">
        <div>
          <div className="font-semibold">🤖 Have questions about your career?</div>
          <div className="text-sm text-white/60">Chat with your AI coach — context-aware on your skills, gaps & goal.</div>
        </div>
        <button className="btn-primary" onClick={() => navigate("/career-chat")}>Open Chat →</button>
      </div>

      {/* Skill depth chart */}
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-1">Skill Depth Analysis</div>
        <div className="text-xs text-white/40 mb-4">Based on resume frequency, GitHub project usage, and interview verification.</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skillChart} layout="vertical" margin={{ left: 30, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.4)" />
              <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.6)" width={120} />
              <Tooltip contentStyle={{ background: "#1e2342", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="depth" radius={[0, 6, 6, 0]}>
                {skillChart.map((s, i) => (
                  <Cell key={i} fill={VERDICT_COLOR[s.verification]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gaps + Roadmap */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="text-sm text-white/50 mb-3">⚠️ Skill Gaps</div>
          {gaps.length === 0 ? (
            <div className="text-green-400 text-sm">No major gaps detected. You're well-aligned with this role.</div>
          ) : (
            <div className="space-y-2">
              {gaps.map((g, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div>
                    <div className="font-semibold text-sm">{g.skill}</div>
                    <div className="text-xs text-white/50">{g.status}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    g.priority === "High" ? "bg-red-500/20 text-red-300" :
                    g.priority === "Medium" ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-white/10 text-white/60"
                  }`}>{g.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="text-sm text-white/50 mb-3">🧭 Personalized Roadmap</div>
          <div className="space-y-3">
            {roadmap.map((step) => (
              <div key={step.step} className="border-l-2 border-indigo-500/40 pl-4 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300">STEP {step.step}</span>
                  <span className="text-xs text-white/40">~{step.durationWeeks} weeks</span>
                </div>
                <div className="font-semibold text-sm mt-0.5">{step.title}</div>
                <div className="text-xs text-white/60 mt-1">{step.description}</div>
                <ul className="text-xs text-white/50 mt-1.5 space-y-0.5">
                  {step.resources.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skills table */}
      <div className="card p-6">
        <div className="text-sm text-white/50 mb-3">All detected skills</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/50 text-xs uppercase">
              <tr className="border-b border-white/5">
                <th className="text-left py-2">Skill</th>
                <th className="text-left">Depth</th>
                <th className="text-left">Verification</th>
                <th className="text-left">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.name} className="border-b border-white/5">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${s.depth}%` }} />
                      </div>
                      <span className="text-xs text-white/50">{s.depth}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: VERDICT_COLOR[s.verification] + "33", color: VERDICT_COLOR[s.verification] }}>
                      {s.verification}
                    </span>
                  </td>
                  <td className="text-xs text-white/60">{s.evidence.join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
