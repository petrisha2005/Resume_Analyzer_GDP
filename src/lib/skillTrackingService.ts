import type { SkillProgress, SkillStatus, SkillTrackingState, DailyProgress } from "./types";

/**
 * Skill Progress Tracking Service
 * Persists per-user skill tracking data in localStorage under key `skilliq:skilltrack:<userId>`.
 */

const TRACKING_KEY = (uid: string) => `skilliq:skilltrack:${uid}`;

export function loadSkillTracking(userId: string): SkillTrackingState {
  if (!userId) return { skills: [], dailyLog: [] };
  try {
    const raw = localStorage.getItem(TRACKING_KEY(userId));
    return raw ? JSON.parse(raw) : { skills: [], dailyLog: [] };
  } catch {
    return { skills: [], dailyLog: [] };
  }
}

export function saveSkillTracking(userId: string, state: SkillTrackingState): void {
  if (!userId) return;
  try {
    localStorage.setItem(TRACKING_KEY(userId), JSON.stringify(state));
  } catch {
    // silently degrade
  }
}

export function clearSkillTracking(userId: string): void {
  if (!userId) return;
  localStorage.removeItem(TRACKING_KEY(userId));
}

/** Initialize tracking for skills that appear in the roadmap. */
export function initSkillsFromRoadmap(
  userId: string,
  skillNames: string[],
  existing: SkillTrackingState
): SkillTrackingState {
  const existingMap = new Map(existing.skills.map((s) => [s.skillName, s]));

  const merged: SkillProgress[] = skillNames.map((name) => {
    const prev = existingMap.get(name);
    if (prev) return prev;
    return {
      skillName: name,
      status: "not_started" as SkillStatus,
      progress: 0,
      quizScore: 0,
      completed: false,
      startedAt: null,
      completedAt: null,
      quizAttempts: 0,
    };
  });

  // Also keep any skills the user was tracking that aren't in the current roadmap
  for (const [name, prev] of existingMap) {
    if (!skillNames.includes(name)) {
      merged.push(prev);
    }
  }

  const updated: SkillTrackingState = { ...existing, skills: merged };
  saveSkillTracking(userId, updated);
  return updated;
}

/** Mark a skill as in_progress. */
export function startSkill(userId: string, skillName: string, state: SkillTrackingState): SkillTrackingState {
  const updated = {
    ...state,
    skills: state.skills.map((s) =>
      s.skillName === skillName
        ? { ...s, status: "in_progress" as SkillStatus, startedAt: s.startedAt || new Date().toISOString() }
        : s
    ),
  };
  saveSkillTracking(userId, updated);
  logDaily(userId, updated);
  return updated;
}

/** Record a quiz score for a skill. If score >= 70, mark completed. */
export function submitQuizResult(
  userId: string,
  skillName: string,
  score: number,
  state: SkillTrackingState
): SkillTrackingState {
  const now = new Date().toISOString();
  const passed = score >= 70;

  const updated = {
    ...state,
    skills: state.skills.map((s) =>
      s.skillName === skillName
        ? {
            ...s,
            quizScore: score,
            progress: score,
            quizAttempts: s.quizAttempts + 1,
            status: passed ? ("completed" as SkillStatus) : ("in_progress" as SkillStatus),
            completed: passed,
            completedAt: passed ? now : s.completedAt,
          }
        : s
    ),
  };
  saveSkillTracking(userId, updated);
  logDaily(userId, updated);
  return updated;
}

/** Mark a skill as completed manually (only if quiz score >= 70). */
export function markSkillComplete(userId: string, skillName: string, state: SkillTrackingState): SkillTrackingState {
  const skill = state.skills.find((s) => s.skillName === skillName);
  if (!skill || skill.quizScore < 70) return state; // guard

  const updated = {
    ...state,
    skills: state.skills.map((s) =>
      s.skillName === skillName
        ? { ...s, status: "completed" as SkillStatus, completed: true, completedAt: new Date().toISOString() }
        : s
    ),
  };
  saveSkillTracking(userId, updated);
  logDaily(userId, updated);
  return updated;
}

/** Log today's progress snapshot. */
function logDaily(userId: string, state: SkillTrackingState): void {
  const today = new Date().toISOString().slice(0, 10);
  const existing = state.dailyLog.find((d) => d.date === today);

  const completed = state.skills.filter((s) => s.completed).map((s) => s.skillName);
  const inProgress = state.skills.filter((s) => s.status === "in_progress").map((s) => s.skillName);
  const quizAttempts = state.skills.reduce((sum, s) => sum + s.quizAttempts, 0);

  const entry: DailyProgress = { date: today, skillsCompleted: completed, skillsInProgress: inProgress, quizAttempts };

  const updated: SkillTrackingState = {
    ...state,
    dailyLog: existing
      ? state.dailyLog.map((d) => (d.date === today ? entry : d))
      : [...state.dailyLog, entry],
  };
  saveSkillTracking(userId, updated);
}

/** Get completion stats for the dashboard summary. */
export function getSkillStats(state: SkillTrackingState) {
  const total = state.skills.length;
  const completed = state.skills.filter((s) => s.completed).length;
  const inProgress = state.skills.filter((s) => s.status === "in_progress").length;
  const notStarted = state.skills.filter((s) => s.status === "not_started").length;
  const avgScore = total > 0
    ? Math.round(state.skills.reduce((sum, s) => sum + s.quizScore, 0) / total)
    : 0;
  const todayEntry = state.dailyLog.find((d) => d.date === new Date().toISOString().slice(0, 10));
  const weeklyCompleted = state.dailyLog
    .filter((d) => {
      const dDate = new Date(d.date);
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      return dDate >= weekAgo;
    })
    .reduce((sum, d) => sum + d.skillsCompleted.length, 0);

  return { total, completed, inProgress, notStarted, avgScore, todayEntry, weeklyCompleted };
}
