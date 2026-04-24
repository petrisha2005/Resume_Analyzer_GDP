import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";

const FEATURES = [
  { icon: "📄", title: "Smart Resume Analysis", desc: "Upload PDF/DOCX. We extract real skills, tools, projects and roles." },
  { icon: "🐙", title: "Deep GitHub Insights", desc: "We don't just list 'React' — we infer what you actually built." },
  { icon: "🗣️", title: "AI Skill Verification", desc: "Simple, real-world questions verify whether you truly know each skill." },
  { icon: "📊", title: "Career Readiness Score", desc: "Honest score against your target role, based on verified skills." },
  { icon: "🧭", title: "Personalized Roadmap", desc: "Step-by-step plan based on your real weaknesses, not generic advice." },
  { icon: "🔮", title: "Future Skills Forecast", desc: "Role-specific industry trends so you stay ahead of the curve." },
];

export default function Home() {
  const { user } = useApp();
  return (
    <div>
      <section className="text-center py-12">
        <div className="inline-flex items-center gap-2 chip mb-6">
          <span>✨</span> AI-powered career intelligence
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-white to-indigo-300 bg-clip-text text-transparent">
          Know exactly where you stand.<br />Then know exactly what to learn.
        </h1>
        <p className="mt-6 text-white/70 max-w-2xl mx-auto text-lg">
          SkillIQ analyzes your resume and GitHub, verifies your skills with simple AI interview questions,
          and builds a personalized roadmap to your dream role.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {user ? (
            <>
              <Link to="/upload" className="btn-primary">🚀 Continue Analysis</Link>
              <Link to="/dashboard" className="btn-ghost">Open Dashboard</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-primary">🚀 Get Started — It's Free</Link>
              <Link to="/login" className="btn-ghost">Log in</Link>
            </>
          )}
        </div>
        {user && (
          <p className="mt-4 text-sm text-white/50">
            Signed in as <span className="text-indigo-300">{user.email}</span>
          </p>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-12">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <div className="font-semibold text-lg">{f.title}</div>
            <div className="text-sm text-white/60 mt-2">{f.desc}</div>
          </div>
        ))}
      </section>

      <section className="card p-8 mt-12">
        <h2 className="text-2xl font-bold mb-6">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { n: 1, t: "Upload Resume", d: "PDF or DOCX. We extract your skills." },
            { n: 2, t: "Connect GitHub", d: "We deep-analyze your projects." },
            { n: 3, t: "AI Interview", d: "Quick simple questions per skill." },
            { n: 4, t: "Get Your Plan", d: "Score, gaps & roadmap to your role." },
          ].map((s) => (
            <div key={s.n} className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 grid place-items-center font-bold text-indigo-300">{s.n}</div>
              <div className="font-semibold mt-3">{s.t}</div>
              <div className="text-sm text-white/60 mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
