export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
}

export type SkillVerification = "Strong" | "Basic" | "Weak" | "Unverified";

export interface Skill {
  name: string;
  depth: number; // 0-100
  evidence: string[];
  verification: SkillVerification;
}

// ResumeValidationReport is defined in `./resumeValidator.ts` and re-exported here
// so consumers can keep importing it from "../lib/types".
import type { ResumeValidationReport } from "./resumeValidator";
export type { ResumeValidationReport };

export interface ResumeData {
  name?: string;
  skills: string[];
  tools: string[];
  projects: string[];
  experience: string[];
  rawText: string;
  valid: boolean;
  message?: string;
  validation?: ResumeValidationReport;
}

export interface RepoInsight {
  name: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  inferred: string[]; // human-readable inferences
  techStack: string[];
}

export interface GitHubAnalysis {
  username: string;
  totalRepos: number;
  topLanguages: { name: string; count: number }[];
  repos: RepoInsight[];
  inferredCapabilities: string[];
  error?: string;
}

export interface CareerRole {
  id: string;
  name: string;
  category: string;
  requiredSkills: string[];
  niceToHave: string[];
  description: string;
}

export interface InterviewQA {
  skill: string;
  question: string;
  answer: string;
  verdict: SkillVerification;
  feedback: string;
}

export interface SkillGap {
  skill: string;
  status: "Missing" | "Weak" | "Basic";
  priority: "High" | "Medium" | "Low";
}

export interface Roadmap {
  step: number;
  title: string;
  description: string;
  resources: string[];
  durationWeeks: number;
}

export type DemandLevel = "High" | "Medium" | "Low";

export interface MarketDemand {
  skill: string;
  demand: DemandLevel;
  trend: "rising" | "stable" | "declining";
  note: string;
}

export interface JobMatch {
  roleId: string;
  roleName: string;
  category: string;
  matchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ProjectIdea {
  title: string;
  description: string;
  techStack: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  coversSkills: string[];
}

export interface ATSScore {
  score: number; // 0-100
  keywordScore: number;
  formattingScore: number;
  relevanceScore: number;
  tips: string[];
}

export interface PortfolioStrength {
  score: number; // 0-100
  repoQuality: number;
  readmeQuality: number;
  diversity: number;
  consistency: number;
  feedback: string[];
}

export interface LinkedInData {
  name?: string;
  headline?: string;
  experience: string[];
  skills: string[];
  roles: string[];
  projects: string[];
  rawText: string;
  valid: boolean;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ── Skill Progress Tracking ──────────────────────────────────────────────
export type SkillStatus = "not_started" | "in_progress" | "completed";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number; // index of correct option
}

export interface SkillProgress {
  skillName: string;
  status: SkillStatus;
  progress: number;          // 0–100 (quiz score)
  quizScore: number;         // 0–100
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  quizAttempts: number;
}

export interface DailyProgress {
  date: string;
  skillsCompleted: string[];
  skillsInProgress: string[];
  quizAttempts: number;
}

export interface SkillTrackingState {
  skills: SkillProgress[];
  dailyLog: DailyProgress[];
}

export interface AppState {
  resume: ResumeData | null;
  github: GitHubAnalysis | null;
  selectedCareer: CareerRole | null;
  skills: Skill[];
  interviews: InterviewQA[];
  futureSkills: string[];
  readinessScore: number;
  readinessCategory: string;
  gaps: SkillGap[];
  roadmap: Roadmap[];
  // Extensions
  atsScore: ATSScore | null;
  portfolioStrength: PortfolioStrength | null;
  marketDemand: MarketDemand[];
  jobMatches: JobMatch[];
  projectIdeas: ProjectIdea[];
  linkedin: LinkedInData | null;
  chatHistory: ChatMessage[];
  // Skill progress tracking
  skillTracking: SkillTrackingState;
}
