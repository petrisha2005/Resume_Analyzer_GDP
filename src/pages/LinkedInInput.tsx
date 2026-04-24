import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { analyzeLinkedInText, mergeLinkedInSkills } from "../lib/extensions";

const SAMPLE = `Priya Sharma
Software Engineering Intern | React • Node.js • Python

Experience
Software Engineering Intern · Acme Corp · Jun 2024 - Aug 2024
Built an internal dashboard with React and TypeScript, integrated REST APIs from a Node.js backend, deployed via Docker and AWS.

Projects
Built a portfolio site using Next.js and Tailwind.
Developed a study planner web app with authentication and MongoDB.

Skills
Python, JavaScript, React, Node.js, MongoDB, REST APIs, Git, AWS, Docker, Tailwind`;

export default function LinkedInInput() {
  const { setLinkedin, skills, setSkills } = useApp();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ count: number; merged: number } | null>(null);

  function handleAnalyze() {
    setError(null); setDone(null);
    if (!text.trim()) {
      setError("Please paste your LinkedIn profile text first.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const li = analyzeLinkedInText(text);
      if (!li.valid) {
        setError(li.message || "Invalid input.");
        setBusy(false);
        return;
      }
      setLinkedin(li);
      // Merge into skill graph
      const merged = mergeLinkedInSkills(skills, li);
      setSkills(merged);
      setDone({ count: li.skills.length, merged: merged.length - skills.length });
      setBusy(false);
    }, 400);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-sm text-white/50">Step (optional)</div>
        <h1 className="text-3xl font-bold">🔗 LinkedIn Profile Analyzer</h1>
        <p className="text-white/60 text-sm mt-2">
          Paste your LinkedIn profile (copy-paste from the page) and we'll merge experience, skills, and projects into your skill graph.
        </p>
      </div>

      <div className="card p-6">
        <label className="text-sm text-white/70 block mb-2">LinkedIn profile text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Paste here — include your headline, experience, projects, and skills..."
          className="input w-full font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <button className="btn-primary" onClick={handleAnalyze} disabled={busy}>
            {busy ? "Analyzing..." : "🔍 Analyze LinkedIn"}
          </button>
          <button className="btn-secondary" onClick={() => setText(SAMPLE)} disabled={busy}>
            📋 Try sample
          </button>
          <button className="btn-secondary" onClick={() => { setText(""); setError(null); setDone(null); }} disabled={busy}>
            Clear
          </button>
        </div>

        {error && <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>}

        {done && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
            ✅ Extracted <b>{done.count}</b> skills from LinkedIn.
            {done.merged > 0 && <> Added <b>{done.merged}</b> new skills to your profile.</>}
            <div className="mt-3">
              <button className="btn-primary text-sm py-1.5 px-3" onClick={() => navigate("/dashboard")}>
                Continue to Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-white/40 text-center">
        We don't store or transmit your profile — analysis happens in your browser.
      </div>
    </div>
  );
}
