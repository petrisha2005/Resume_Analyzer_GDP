import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { generateQuiz, scoreQuiz } from "../lib/quizEngine";
import {
  loadSkillTracking, initSkillsFromRoadmap,
  startSkill, submitQuizResult, getSkillStats,
} from "../lib/skillTrackingService";
import type { QuizQuestion, SkillProgress } from "../lib/types";

export default function SkillTracker() {
  const { user, selectedCareer, roadmap, skillTracking, setSkillTracking } = useApp();
  const [activeQuiz, setActiveQuiz] = useState<{ skill: string; questions: QuizQuestion[] } | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [quizAttempt, setQuizAttempt] = useState(0);

  // Load tracking on mount + sync with roadmap
  useEffect(() => {
    if (!user) return;
    const loaded = loadSkillTracking(user.id);
    setSkillTracking(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Sync roadmap skills into tracker
  useEffect(() => {
    if (!user || roadmap.length === 0) return;
    const skillNames = roadmap.map((r) => {
      // Extract skill name from roadmap title (e.g. "Learn React from scratch" → "React")
      const match = r.title.match(/^(?:Learn|Strengthen)\s+(.+?)(?:\s+from scratch)?$/);
      return match ? match[1] : r.title;
    });
    const updated = initSkillsFromRoadmap(user.id, skillNames, skillTracking);
    setSkillTracking(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap.length]);

  const stats = getSkillStats(skillTracking);

  // ── Quiz handlers ───────────────────────────────────────────────────
  function openQuiz(skillName: string) {
    const skill = skillTracking.skills.find((s) => s.skillName === skillName);
    const attempt = skill ? skill.quizAttempts : 0;
    setQuizAttempt(attempt);
    const questions = generateQuiz(skillName, attempt);
    setActiveQuiz({ skill: skillName, questions });
    setSelectedAnswers(new Array(5).fill(null));
    setQuizResult(null);
  }

  function closeQuiz() {
    setActiveQuiz(null);
    setSelectedAnswers([]);
    setQuizResult(null);
  }

  function selectAnswer(qIndex: number, optIndex: number) {
    const next = [...selectedAnswers];
    next[qIndex] = optIndex;
    setSelectedAnswers(next);
  }

  function submitQuiz() {
    if (!activeQuiz || !user) return;
    const result = scoreQuiz(activeQuiz.questions, selectedAnswers);
    setQuizResult(result);

    const updated = submitQuizResult(user.id, activeQuiz.skill, result.score, skillTracking);
    setSkillTracking(updated);

    // If passed, also start the next not-started skill
    if (result.score >= 70) {
      const nextSkill = updated.skills.find((s) => s.status === "not_started");
      if (nextSkill) {
        const started = startSkill(user.id, nextSkill.skillName, updated);
        setSkillTracking(started);
      }
    }
  }

  function handleStartSkill(skillName: string) {
    if (!user) return;
    const updated = startSkill(user.id, skillName, skillTracking);
    setSkillTracking(updated);
  }

  // ── Render ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Sign in to track your skills</h1>
        <Link to="/login" className="btn-primary inline-block mt-4">Log in</Link>
      </div>
    );
  }

  if (!selectedCareer || roadmap.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">🧭</div>
        <h1 className="text-2xl font-bold mb-2">No roadmap yet</h1>
        <p className="text-white/60 mb-6">
          Pick a career goal and complete your analysis to generate a learning roadmap.
        </p>
        <Link to="/career" className="btn-primary inline-block">Choose Career</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header + stats */}
      <div>
        <div className="text-sm text-white/50">Skill Progress Tracker</div>
        <h1 className="text-3xl font-bold">🧭 Learning Roadmap</h1>
        <p className="text-white/60 text-sm mt-1">
          Learn each skill → take the quiz → pass with 70%+ to mark it complete.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Skills" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} color="text-emerald-400" />
        <StatCard label="In Progress" value={stats.inProgress} color="text-amber-400" />
        <StatCard label="Not Started" value={stats.notStarted} color="text-white/50" />
        <StatCard label="Avg Quiz Score" value={`${stats.avgScore}%`} color={stats.avgScore >= 70 ? "text-emerald-400" : "text-amber-400"} />
      </div>

      {/* Weekly summary */}
      {stats.weeklyCompleted > 0 && (
        <div className="card p-4 flex items-center gap-3 bg-indigo-500/10 border-indigo-400/20">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="font-semibold">Weekly Progress</div>
            <div className="text-sm text-white/70">
              {stats.weeklyCompleted} skill{stats.weeklyCompleted !== 1 ? "s" : ""} completed this week.
              {stats.todayEntry && (
                <> Today: {stats.todayEntry.skillsCompleted.length} completed, {stats.todayEntry.skillsInProgress.length} in progress.</>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skill cards */}
      <div className="space-y-3">
        {skillTracking.skills.map((skill) => (
          <SkillCard
            key={skill.skillName}
            skill={skill}
            onStart={() => handleStartSkill(skill.skillName)}
            onQuiz={() => openQuiz(skill.skillName)}
          />
        ))}
      </div>

      {/* Quiz modal */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">📝 Quiz: {activeQuiz.skill}</h2>
              <button onClick={closeQuiz} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50">✕</button>
            </div>

            {quizResult ? (
              // ── Quiz result ──────────────────────────────────────────
              <div className="space-y-4">
                <div className={`text-center p-6 rounded-xl ${quizResult.score >= 70 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                  <div className={`text-5xl font-extrabold ${quizResult.score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                    {quizResult.score}%
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    {quizResult.correct} / {quizResult.total} correct
                  </div>
                  <div className="text-sm font-semibold mt-2">
                    {quizResult.score >= 70 ? "✅ Passed! Skill marked as completed." : "⚠️ Keep practicing — need 70% to pass."}
                  </div>
                </div>
                <div className="flex gap-2">
                  {quizResult.score < 70 && (
                    <button
                      onClick={() => {
                        setActiveQuiz({ ...activeQuiz, questions: generateQuiz(activeQuiz.skill, quizAttempt + 1) });
                        setSelectedAnswers(new Array(5).fill(null));
                        setQuizResult(null);
                        setQuizAttempt((a) => a + 1);
                      }}
                      className="btn-primary flex-1 text-sm"
                    >
                      Retry Quiz
                    </button>
                  )}
                  <button onClick={closeQuiz} className="btn-ghost flex-1 text-sm">Close</button>
                </div>
              </div>
            ) : (
              // ── Quiz questions ───────────────────────────────────────
              <div className="space-y-5">
                {activeQuiz.questions.map((q, qi) => (
                  <div key={q.id}>
                    <div className="font-medium text-sm mb-2">{qi + 1}. {q.question}</div>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(qi, oi)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${
                            selectedAnswers[qi] === oi
                              ? "border-indigo-400 bg-indigo-500/20 text-white"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={submitQuiz}
                  disabled={selectedAnswers.some((a) => a === null)}
                  className="btn-primary w-full"
                >
                  Submit Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skill Card Component ──────────────────────────────────────────────
function SkillCard({ skill, onStart, onQuiz }: { skill: SkillProgress; onStart: () => void; onQuiz: () => void }) {
  const statusConfig = {
    not_started: { label: "Not Started", color: "text-white/50", bar: "bg-white/10", icon: "○" },
    in_progress: { label: "In Progress", color: "text-amber-400", bar: "bg-amber-500", icon: "◉" },
    completed: { label: "Completed", color: "text-emerald-400", bar: "bg-emerald-500", icon: "✓" },
  };
  const cfg = statusConfig[skill.status];

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cfg.color}>{cfg.icon}</span>
            <span className="font-semibold">{skill.skillName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${skill.completed ? "bg-emerald-500/15 text-emerald-300" : skill.status === "in_progress" ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-white/50"}`}>
              {cfg.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cfg.bar}`}
                style={{ width: `${skill.progress}%` }}
              />
            </div>
            <span className="text-xs text-white/50 w-10 text-right">{skill.progress}%</span>
          </div>

          {/* Meta info */}
          <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-white/40">
            {skill.startedAt && <span>Started: {new Date(skill.startedAt).toLocaleDateString()}</span>}
            {skill.quizAttempts > 0 && <span>Quiz attempts: {skill.quizAttempts}</span>}
            {skill.completedAt && <span>Completed: {new Date(skill.completedAt).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {skill.status === "not_started" && (
            <button onClick={onStart} className="btn-primary text-xs py-1.5 px-3">
              Start Learning
            </button>
          )}
          {(skill.status === "in_progress" || skill.status === "not_started") && (
            <button onClick={onQuiz} className="btn-ghost text-xs py-1.5 px-3">
              Take Quiz
            </button>
          )}
          {skill.completed && (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              ✓ Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────
function StatCard({ label, value, color = "text-white" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-white/50 mt-0.5">{label}</div>
    </div>
  );
}
