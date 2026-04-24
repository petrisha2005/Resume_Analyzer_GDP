import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { generatePdfReport } from "../lib/reportGenerator";

export default function Report() {
  const state = useApp();
  const navigate = useNavigate();

  const ready = state.selectedCareer && state.skills.length > 0;

  function download() {
    if (!ready) return;
    generatePdfReport(state);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">📥 Download your report</h1>
      <p className="text-white/60 mb-6">A clean PDF summary of your skills, gaps, predicted future skills and roadmap.</p>

      {!ready ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-semibold text-lg">Complete your analysis first</div>
          <div className="text-white/60 mt-2">Pick a career and run the AI interview to generate a report.</div>
          <div className="mt-4 flex gap-2 justify-center">
            <button className="btn-ghost" onClick={() => navigate("/upload")}>Upload Resume</button>
            <button className="btn-primary" onClick={() => navigate("/career")}>Choose Career</button>
          </div>
        </div>
      ) : (
        <div className="card p-8">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Stat label="Target Role" value={state.selectedCareer!.name} />
            <Stat label="Readiness Score" value={`${state.readinessScore}%`} />
            <Stat label="Skills Tracked" value={String(state.skills.length)} />
            <Stat label="Skill Gaps" value={String(state.gaps.length)} />
            <Stat label="Verified (Strong)" value={String(state.skills.filter(s => s.verification === "Strong").length)} />
            <Stat label="Roadmap Steps" value={String(state.roadmap.length)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={download}>📥 Download PDF Report</button>
            <button className="btn-ghost" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
          </div>
          <div className="text-xs text-white/40 mt-4">
            The PDF includes: verified skills, skill gaps, predicted future skills, and your full personalized learning roadmap.
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
      <div className="text-xs text-white/50">{label}</div>
      <div className="font-bold text-lg mt-1">{value}</div>
    </div>
  );
}
