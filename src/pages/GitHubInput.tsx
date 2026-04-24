import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { analyzeGitHubUser } from "../lib/githubAnalyzer";

export default function GitHubInput() {
  const { github, setGithub } = useApp();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleAnalyze() {
    if (!username.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeGitHubUser(username.trim());
      setGithub(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">🐙 Deep GitHub Analysis</h1>
      <p className="text-white/60 mb-6">
        We don't just list languages. We read your READMEs, understand your project structure,
        and infer what you actually <em>built</em>.
      </p>

      <div className="card p-6">
        <label className="text-sm text-white/60 mb-2 block">GitHub username</label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <span className="px-3 text-white/40">github.com/</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="torvalds"
              className="flex-1 bg-transparent py-2.5 outline-none text-white placeholder-white/30"
            />
          </div>
          <button className="btn-primary" disabled={loading || !username.trim()} onClick={handleAnalyze}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        <div className="text-xs text-white/40 mt-2">
          Try: <button className="underline" onClick={() => setUsername("torvalds")}>torvalds</button>,{" "}
          <button className="underline" onClick={() => setUsername("gaearon")}>gaearon</button>,{" "}
          <button className="underline" onClick={() => setUsername("yyx990803")}>yyx990803</button>
        </div>
      </div>

      {github?.error && (
        <div className="mt-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200">
          ⚠️ {github.error}
        </div>
      )}

      {github && !github.error && (
        <div className="mt-6 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-white/50">Profile</div>
                <div className="text-2xl font-bold">@{github.username}</div>
                <div className="text-white/60 text-sm">{github.totalRepos} non-fork repositories analyzed</div>
              </div>
              <button className="btn-primary" onClick={() => navigate("/career")}>
                Next: Pick Career →
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-white/50 mb-2">Top languages</div>
                <div className="space-y-2">
                  {github.topLanguages.map((l) => (
                    <div key={l.name}>
                      <div className="flex justify-between text-sm">
                        <span>{l.name}</span><span className="text-white/50">{l.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                             style={{ width: `${(l.count / github.topLanguages[0].count) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-white/50 mb-2">Inferred capabilities</div>
                <ul className="text-sm space-y-1.5 text-white/80">
                  {github.inferredCapabilities.map((c, i) => (
                    <li key={i}>✔ {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Top repositories — deep analysis</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {github.repos.map((r) => (
                <div key={r.name} className="card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <a href={r.url} target="_blank" rel="noopener" className="font-semibold text-indigo-300 hover:underline">
                      {r.name}
                    </a>
                    <span className="text-xs text-white/50">⭐ {r.stars}</span>
                  </div>
                  <div className="text-sm text-white/60 mt-1 line-clamp-2">{r.description}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.techStack.slice(0, 6).map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                  {r.inferred.length > 0 && (
                    <ul className="text-xs text-white/70 mt-3 space-y-1">
                      {r.inferred.slice(0, 3).map((i, idx) => <li key={idx}>✔ {i}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
