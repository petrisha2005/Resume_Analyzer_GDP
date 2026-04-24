import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type {
  AppState, ResumeData, GitHubAnalysis, CareerRole, Skill, InterviewQA, User,
  ATSScore, PortfolioStrength, MarketDemand, JobMatch, ProjectIdea, LinkedInData, ChatMessage,
  SkillTrackingState,
} from "../lib/types";
import { getSession, logout as authLogout } from "../lib/authService";
import {
  loadProfile, saveProfile, loadProgress, recordAnalysis,
  type ProgressRecord,
} from "../lib/userDataService";

interface AppContextValue extends AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
  setResume: (r: ResumeData | null) => void;
  setGithub: (g: GitHubAnalysis | null) => void;
  setSelectedCareer: (c: CareerRole | null) => void;
  setSkills: (s: Skill[]) => void;
  setInterviews: (i: InterviewQA[]) => void;
  updateSkillVerification: (skillName: string, verification: Skill["verification"]) => void;
  setFutureSkills: (f: string[]) => void;
  setReadiness: (score: number, category: string) => void;
  setGaps: (g: AppState["gaps"]) => void;
  setRoadmap: (r: AppState["roadmap"]) => void;
  // Extensions
  setATSScore: (a: ATSScore | null) => void;
  setPortfolioStrength: (p: PortfolioStrength | null) => void;
  setMarketDemand: (m: MarketDemand[]) => void;
  setJobMatches: (j: JobMatch[]) => void;
  setProjectIdeas: (p: ProjectIdea[]) => void;
  setLinkedin: (l: LinkedInData | null) => void;
  setChatHistory: (c: ChatMessage[]) => void;
  // Progress tracking
  progress: ProgressRecord | null;
  // Skill tracking
  setSkillTracking: (s: SkillTrackingState) => void;
  reset: () => void;
}

const initialState: AppState = {
  resume: null,
  github: null,
  selectedCareer: null,
  skills: [],
  interviews: [],
  futureSkills: [],
  readinessScore: 0,
  readinessCategory: "",
  gaps: [],
  roadmap: [],
  atsScore: null,
  portfolioStrength: null,
  marketDemand: [],
  jobMatches: [],
  projectIdeas: [],
  linkedin: null,
  chatHistory: [],
  skillTracking: { skills: [], dailyLog: [] },
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [user, setUserState] = useState<User | null>(() => getSession());
  const [progress, setProgress] = useState<ProgressRecord | null>(null);

  // Refs to avoid stale closures inside debounced save
  const stateRef = useRef(state);
  stateRef.current = state;
  const userRef = useRef(user);
  userRef.current = user;
  const hydratedRef = useRef(false);

  // ── On user change: hydrate from per-user storage ─────────────────────
  useEffect(() => {
    hydratedRef.current = false;
    if (user) {
      const stored = loadProfile(user.id);
      if (stored) {
        setState({ ...initialState, ...stored });
      } else {
        setState(initialState);
      }
      setProgress(loadProgress(user.id));
    } else {
      setState(initialState);
      setProgress(null);
    }
    // Mark hydrated on next tick so we don't immediately overwrite storage
    // with the freshly-loaded state.
    const t = setTimeout(() => { hydratedRef.current = true; }, 0);
    return () => clearTimeout(t);
  }, [user]);

  // ── Auto-save profile (debounced) on every state change ───────────────
  useEffect(() => {
    if (!user || !hydratedRef.current) return;
    const t = setTimeout(() => {
      saveProfile(user.id, stateRef.current);
    }, 250);
    return () => clearTimeout(t);
  }, [state, user]);

  // ── Cross-tab session sync ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "skilliq:session" || e.key === null) {
        setUserState(getSession());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Auto-record progress whenever skills + readiness are computed ─────
  // (Triggered on milestones: skills change OR readiness updates.)
  useEffect(() => {
    if (!user || !hydratedRef.current) return;
    if (state.skills.length === 0) return;
    if (state.readinessScore <= 0 && state.readinessCategory === "") return;
    const updated = recordAnalysis(user.id, {
      skills: state.skills,
      readinessScore: state.readinessScore,
      readinessCategory: state.readinessCategory,
      goal: state.selectedCareer?.name,
    });
    setProgress(updated);
    // We deliberately depend only on the readiness fields + skills count to
    // throttle: progress is captured on each "analysis milestone", not on
    // every tiny edit (e.g. a single chat message).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.skills.length, state.readinessScore, state.readinessCategory, user]);

  const value: AppContextValue = {
    ...state,
    user,
    progress,
    setUser: (u) => setUserState(u),
    logout: () => {
      authLogout();
      setUserState(null);
      setState(initialState);
      setProgress(null);
    },
    setResume: (resume) => setState((s) => ({ ...s, resume })),
    setGithub: (github) => setState((s) => ({ ...s, github })),
    setSelectedCareer: (selectedCareer) => setState((s) => ({ ...s, selectedCareer })),
    setSkills: (skills) => setState((s) => ({ ...s, skills })),
    setInterviews: (interviews) => setState((s) => ({ ...s, interviews })),
    updateSkillVerification: (name, verification) =>
      setState((s) => ({
        ...s,
        skills: s.skills.map((sk) => (sk.name === name ? { ...sk, verification } : sk)),
      })),
    setFutureSkills: (futureSkills) => setState((s) => ({ ...s, futureSkills })),
    setReadiness: (readinessScore, readinessCategory) =>
      setState((s) => ({ ...s, readinessScore, readinessCategory })),
    setGaps: (gaps) => setState((s) => ({ ...s, gaps })),
    setRoadmap: (roadmap) => setState((s) => ({ ...s, roadmap })),
    setATSScore: (atsScore) => setState((s) => ({ ...s, atsScore })),
    setPortfolioStrength: (portfolioStrength) => setState((s) => ({ ...s, portfolioStrength })),
    setMarketDemand: (marketDemand) => setState((s) => ({ ...s, marketDemand })),
    setJobMatches: (jobMatches) => setState((s) => ({ ...s, jobMatches })),
    setProjectIdeas: (projectIdeas) => setState((s) => ({ ...s, projectIdeas })),
    setLinkedin: (linkedin) => setState((s) => ({ ...s, linkedin })),
    setChatHistory: (chatHistory) => setState((s) => ({ ...s, chatHistory })),
    setSkillTracking: (skillTracking) => setState((s) => ({ ...s, skillTracking })),
    reset: () => setState(initialState),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
