import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useApp } from "../state/AppContext";
import { CAREER_ROLES } from "../lib/careers";
import { computeSkillDepth } from "../lib/skillEngine";
import type { Skill } from "../lib/types";

export default function CareerSelection() {
  const { resume, github, selectedCareer, setSelectedCareer, setSkills } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set(CAREER_ROLES.map((r) => r.category)))], []);
  const filtered = filter === "All" ? CAREER_ROLES : CAREER_ROLES.filter((r) => r.category === filter);

  function handleSelect(role: typeof CAREER_ROLES[number]) {
    setSelectedCareer(role);

    // Build the unified skill profile right here
    const resumeText = resume?.rawText || "";
    const repos = (github?.repos || []).map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      readme: r.inferred.join(" ") + " " + r.techStack.join(" "),
    }));

    const allSkillNames = new Set<string>();
    (resume?.skills || []).forEach((s) => allSkillNames.add(s));
    (github?.repos || []).forEach((r) => r.techStack.forEach((s) => allSkillNames.add(s)));
    role.requiredSkills.forEach((s) => allSkillNames.add(s));

    const skills: Skill[] = Array.from(allSkillNames).map((name) => {
      const { depth, evidence } = computeSkillDepth(name, resumeText, repos);
      return {
        name,
        depth,
        evidence,
        verification: "Unverified" as const,
      };
    });

    setSkills(skills);
    navigate("/interview");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🎯 Choose your target career</h1>
      <p className="text-white/60 mb-6">We'll measure your skills against this role and design your roadmap.</p>

      {!resume && !github && (
        <div className="card p-4 mb-6 border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 text-sm">
          💡 Tip: upload your resume and connect GitHub first for a much more accurate analysis.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === c ? "bg-indigo-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((role) => {
          const active = selectedCareer?.id === role.id;
          return (
            <button
              key={role.id}
              onClick={() => handleSelect(role)}
              className={`card p-5 text-left transition hover:border-indigo-400/50 hover:-translate-y-0.5 ${
                active ? "ring-2 ring-indigo-400" : ""
              }`}
            >
              <div className="text-xs text-indigo-300 font-semibold">{role.category}</div>
              <div className="font-bold text-lg mt-1">{role.name}</div>
              <div className="text-sm text-white/60 mt-2 line-clamp-2">{role.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.requiredSkills.slice(0, 4).map((s) => (
                  <span key={s} className="chip">{s}</span>
                ))}
                {role.requiredSkills.length > 4 && (
                  <span className="chip">+{role.requiredSkills.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
