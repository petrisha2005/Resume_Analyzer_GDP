// Per-User Data Persistence Service
// Mirrors the FastAPI/MongoDB collections in the spec, but uses localStorage
// (this is a frontend-only environment). All keys are namespaced by user_id.
//
// Collections:
//   user_profiles       → snapshot of the user's app state (resume, github, skills, ...)
//   analysis_results    → derived analysis (gaps, readiness, roadmap, ...)
//   progress_tracking   → initial vs current skills + score history + improvement log
//
// Strategy:
//   - On login / app load → load all collections for the active user
//   - Whenever AppState changes → debounced auto-save to user_profiles + analysis_results
//   - On every "analyze" milestone (skills extracted, readiness computed) → updateProgress()

import type { AppState, Skill } from "./types";

const PROFILE_KEY  = (uid: string) => `skilliq:profile:${uid}`;
const PROGRESS_KEY = (uid: string) => `skilliq:progress:${uid}`;

// ─────────────────────────────────────────────────────────────────────────────
// Profile (= user_profiles + analysis_results combined into one snapshot)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredProfile {
  state: AppState;
  lastUpdated: string;
}

export function loadProfile(userId: string): AppState | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProfile;
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

export function saveProfile(userId: string, state: AppState): void {
  try {
    const payload: StoredProfile = { state, lastUpdated: new Date().toISOString() };
    localStorage.setItem(PROFILE_KEY(userId), JSON.stringify(payload));
  } catch {
    // storage full or disabled — silently degrade
  }
}

export function clearProfile(userId: string): void {
  localStorage.removeItem(PROFILE_KEY(userId));
  localStorage.removeItem(PROGRESS_KEY(userId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Tracking (= progress_tracking collection)
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillSnapshot {
  name: string;
  depth: number;
  verification: Skill["verification"];
}

export interface ScorePoint {
  date: string;        // ISO
  score: number;       // 0..100
  category: string;
  goal?: string;
}

export interface ImprovementEntry {
  date: string;
  message: string;     // human-readable
}

export interface ProgressRecord {
  userId: string;
  initialSkills: SkillSnapshot[];        // captured the first time skills are computed
  currentSkills: SkillSnapshot[];        // latest
  scoreHistory: ScorePoint[];            // every readiness computation
  improvementLog: ImprovementEntry[];    // diff messages
  initialGoal?: string;
  initialDate: string;
  lastUpdated: string;
}

function snapshotSkills(skills: Skill[]): SkillSnapshot[] {
  return skills.map((s) => ({
    name: s.name,
    depth: Math.round(s.depth),
    verification: s.verification,
  }));
}

export function loadProgress(userId: string): ProgressRecord | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ProgressRecord;
  } catch {
    return null;
  }
}

function writeProgress(p: ProgressRecord): void {
  try {
    localStorage.setItem(PROGRESS_KEY(p.userId), JSON.stringify(p));
  } catch {
    // ignore
  }
}

/**
 * Record a fresh analysis. On first call → captures initial baseline.
 * On subsequent calls → updates current snapshot, appends score point,
 * and computes improvement messages by diffing baseline vs latest.
 */
export function recordAnalysis(
  userId: string,
  opts: {
    skills: Skill[];
    readinessScore: number;
    readinessCategory: string;
    goal?: string;
  }
): ProgressRecord {
  if (!userId) {
    return {
      userId: "",
      initialSkills: [],
      currentSkills: [],
      scoreHistory: [],
      improvementLog: [],
      initialDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  const now = new Date().toISOString();
  const newSnap = snapshotSkills(opts.skills);
  const existing = loadProgress(userId);

  // ─── First-time user: capture baseline ────────────────────────────────
  if (!existing) {
    const record: ProgressRecord = {
      userId,
      initialSkills: newSnap,
      currentSkills: newSnap,
      scoreHistory: [
        {
          date: now,
          score: Math.round(opts.readinessScore),
          category: opts.readinessCategory,
          goal: opts.goal,
        },
      ],
      improvementLog: [
        { date: now, message: `Started journey with ${newSnap.length} skills detected.` },
      ],
      initialGoal: opts.goal,
      initialDate: now,
      lastUpdated: now,
    };
    writeProgress(record);
    return record;
  }

  // ─── Returning user: diff & append ────────────────────────────────────
  const initialMap = new Map(existing.initialSkills.map((s) => [s.name.toLowerCase(), s]));
  const currentMap = new Map(existing.currentSkills.map((s) => [s.name.toLowerCase(), s]));

  const newImprovements: ImprovementEntry[] = [];

  for (const skill of newSnap) {
    const key = skill.name.toLowerCase();
    const initial = initialMap.get(key);
    const previous = currentMap.get(key);

    // Newly learned (not in initial baseline)
    if (!initial && !previous) {
      newImprovements.push({ date: now, message: `🆕 Learned ${skill.name}` });
      continue;
    }

    // Depth improvement vs baseline (only log if meaningful jump)
    if (initial && skill.depth - initial.depth >= 10) {
      newImprovements.push({
        date: now,
        message: `📈 Improved ${skill.name} from ${initial.depth}% to ${skill.depth}%`,
      });
    }

    // Verification upgrade
    const order = { Unverified: 0, Weak: 1, Basic: 2, Strong: 3 } as const;
    if (
      previous &&
      order[skill.verification] > order[previous.verification] &&
      skill.verification !== "Unverified"
    ) {
      newImprovements.push({
        date: now,
        message: `✅ Verified ${skill.name} as ${skill.verification}`,
      });
    }
  }

  // Score delta entry
  const lastScore = existing.scoreHistory[existing.scoreHistory.length - 1]?.score ?? 0;
  const delta = Math.round(opts.readinessScore) - lastScore;
  if (delta !== 0 && existing.scoreHistory.length > 0) {
    const arrow = delta > 0 ? "↑" : "↓";
    newImprovements.push({
      date: now,
      message: `${arrow} Readiness ${delta > 0 ? "rose" : "dipped"} ${Math.abs(delta)}% (now ${Math.round(opts.readinessScore)}%)`,
    });
  }

  const record: ProgressRecord = {
    ...existing,
    currentSkills: newSnap,
    scoreHistory: [
      ...existing.scoreHistory,
      {
        date: now,
        score: Math.round(opts.readinessScore),
        category: opts.readinessCategory,
        goal: opts.goal,
      },
    ].slice(-50), // cap
    improvementLog: [...existing.improvementLog, ...newImprovements].slice(-100),
    lastUpdated: now,
  };
  writeProgress(record);
  return record;
}

export function resetProgress(userId: string): void {
  localStorage.removeItem(PROGRESS_KEY(userId));
}

/** Convenience: list of skill names that exist in current but not in initial. */
export function newlyLearnedSkills(p: ProgressRecord): string[] {
  const initialNames = new Set(p.initialSkills.map((s) => s.name.toLowerCase()));
  return p.currentSkills
    .filter((s) => !initialNames.has(s.name.toLowerCase()))
    .map((s) => s.name);
}

/** Convenience: skills present in both, with depth deltas. */
export function skillDeltas(
  p: ProgressRecord
): { name: string; before: number; after: number; delta: number }[] {
  const initialMap = new Map(p.initialSkills.map((s) => [s.name.toLowerCase(), s]));
  return p.currentSkills
    .map((s) => {
      const before = initialMap.get(s.name.toLowerCase())?.depth ?? 0;
      return { name: s.name, before, after: s.depth, delta: s.depth - before };
    })
    .filter((d) => d.delta !== 0 || d.before > 0)
    .sort((a, b) => b.delta - a.delta);
}
