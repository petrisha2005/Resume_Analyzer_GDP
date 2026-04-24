import type {
  Skill, CareerRole, ResumeData, GitHubAnalysis, SkillGap,
  MarketDemand, DemandLevel, JobMatch, ProjectIdea, ATSScore,
  PortfolioStrength, LinkedInData,
} from "./types";
import { CAREER_ROLES } from "./careers";

/* ============================================================
   1) MARKET DEMAND ENGINE
   ============================================================ */
const DEMAND_DB: Record<string, { demand: DemandLevel; trend: "rising" | "stable" | "declining"; note: string }> = {
  python:        { demand: "High",   trend: "rising",   note: "Dominant in AI, data science, automation, and backend." },
  javascript:    { demand: "High",   trend: "stable",   note: "Backbone of every modern web stack." },
  typescript:    { demand: "High",   trend: "rising",   note: "Now standard for production frontend & Node services." },
  react:         { demand: "High",   trend: "stable",   note: "Most-used UI library; constant hiring demand." },
  "next.js":     { demand: "High",   trend: "rising",   note: "Top choice for SSR/full-stack React apps." },
  "node.js":     { demand: "High",   trend: "stable",   note: "Required for most JS backend roles." },
  sql:           { demand: "High",   trend: "stable",   note: "Universal requirement across data & backend roles." },
  mongodb:       { demand: "Medium", trend: "stable",   note: "Common in JS stacks and rapid prototyping." },
  postgresql:    { demand: "High",   trend: "rising",   note: "Preferred relational DB for new products." },
  aws:           { demand: "High",   trend: "rising",   note: "Cloud literacy is now expected for almost every role." },
  docker:        { demand: "High",   trend: "stable",   note: "Containerization is a baseline DevOps skill." },
  kubernetes:    { demand: "High",   trend: "rising",   note: "Required across cloud / platform engineering." },
  "machine learning": { demand: "High", trend: "rising", note: "Core to AI hiring across industries." },
  "deep learning":    { demand: "High", trend: "rising", note: "Essential for ML and computer vision roles." },
  pytorch:       { demand: "High",   trend: "rising",   note: "Industry standard for new model development." },
  tensorflow:    { demand: "Medium", trend: "stable",   note: "Still common in production ML pipelines." },
  "data visualization": { demand: "Medium", trend: "stable", note: "Valued in analyst & ML communication roles." },
  "rest apis":   { demand: "High",   trend: "stable",   note: "Required for nearly every backend/full-stack role." },
  graphql:       { demand: "Medium", trend: "stable",   note: "Common in modern API-heavy products." },
  authentication:{ demand: "High",   trend: "stable",   note: "Security & auth are baseline expectations." },
  testing:       { demand: "Medium", trend: "rising",   note: "Hiring filters increasingly require test coverage." },
  git:           { demand: "High",   trend: "stable",   note: "Universal requirement." },
  "ci/cd":       { demand: "High",   trend: "rising",   note: "Required for any modern engineering team." },
  tailwind:      { demand: "Medium", trend: "rising",   note: "Most popular utility CSS framework." },
  java:          { demand: "Medium", trend: "stable",   note: "Strong in enterprise & Android." },
  "c++":         { demand: "Medium", trend: "stable",   note: "Used in systems, gaming, and HFT." },
  go:            { demand: "Medium", trend: "rising",   note: "Growing in cloud-native backend services." },
  rust:          { demand: "Medium", trend: "rising",   note: "Adoption growing in systems & web infra." },
  figma:         { demand: "Medium", trend: "stable",   note: "Standard tool for product design." },
  "ui/ux":       { demand: "Medium", trend: "stable",   note: "Steady demand across product teams." },
  flutter:       { demand: "Medium", trend: "stable",   note: "Popular for cross-platform mobile apps." },
  "react native":{ demand: "Medium", trend: "stable",   note: "Strong demand in mobile-first companies." },
  cybersecurity: { demand: "High",   trend: "rising",   note: "Talent shortage; consistent high demand." },
  "data analysis":{ demand: "High",  trend: "stable",   note: "Foundational for analyst & PM roles." },
  excel:         { demand: "Medium", trend: "stable",   note: "Still required across BA/analyst roles." },
  "power bi":    { demand: "Medium", trend: "stable",   note: "Enterprise BI standard." },
  tableau:       { demand: "Medium", trend: "stable",   note: "Valued for analyst & DS roles." },
};

export function getMarketDemand(skills: Skill[]): MarketDemand[] {
  return skills.map((s) => {
    const key = s.name.toLowerCase();
    const entry = DEMAND_DB[key];
    if (entry) return { skill: s.name, ...entry };
    // Fallback inference
    const demand: DemandLevel = s.depth >= 60 ? "Medium" : "Low";
    return { skill: s.name, demand, trend: "stable", note: "Niche or specialized skill." };
  });
}

/* ============================================================
   2) JOB / ROLE MATCHING ENGINE
   ============================================================ */
function norm(s: string) { return s.toLowerCase().trim(); }

export function computeJobMatches(skills: Skill[]): JobMatch[] {
  const verifiedSet = new Set(
    skills.filter((s) => s.verification === "Strong" || s.verification === "Basic").map((s) => norm(s.name))
  );
  const presentSet = new Set(skills.map((s) => norm(s.name)));

  const matches: JobMatch[] = CAREER_ROLES.map((role) => {
    const required = role.requiredSkills.map(norm);
    const nice = role.niceToHave.map(norm);

    const matchedRequired = required.filter((r) => verifiedSet.has(r) || presentSet.has(r));
    const matchedNice = nice.filter((r) => verifiedSet.has(r) || presentSet.has(r));
    const missing = required.filter((r) => !presentSet.has(r));

    // Weight verified higher
    const verifiedRequired = required.filter((r) => verifiedSet.has(r)).length;
    const reqScore = required.length === 0 ? 0 :
      ((verifiedRequired * 1.0 + (matchedRequired.length - verifiedRequired) * 0.5) / required.length) * 80;
    const niceScore = nice.length === 0 ? 0 : (matchedNice.length / nice.length) * 20;
    const matchPercent = Math.round(Math.max(0, Math.min(100, reqScore + niceScore)));

    return {
      roleId: role.id,
      roleName: role.name,
      category: role.category,
      matchPercent,
      matchedSkills: matchedRequired.map(prettify),
      missingSkills: missing.map(prettify),
    };
  });

  return matches.sort((a, b) => b.matchPercent - a.matchPercent);
}

function prettify(s: string) {
  const map: Record<string, string> = {
    "rest apis": "REST APIs", "ci/cd": "CI/CD", "ui/ux": "UI/UX",
    "node.js": "Node.js", "next.js": "Next.js", "c++": "C++",
    sql: "SQL", aws: "AWS", "power bi": "Power BI",
  };
  if (map[s]) return map[s];
  return s.split(" ").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

/* ============================================================
   3) AI PROJECT RECOMMENDATION GENERATOR
   ============================================================ */
const PROJECT_BLUEPRINTS: Record<string, ProjectIdea[]> = {
  ai: [
    { title: "Resume-to-Job Matcher", description: "Build a tool that parses a resume PDF and ranks job descriptions by similarity using embeddings.", techStack: ["Python", "FastAPI", "Sentence-Transformers", "React"], difficulty: "Intermediate", coversSkills: ["Python", "Machine Learning", "REST APIs"] },
    { title: "Smart Notes Summarizer", description: "Upload class notes; the app summarizes and generates flashcards using an LLM API.", techStack: ["Python", "Gemini API", "React", "Tailwind"], difficulty: "Beginner", coversSkills: ["Python", "REST APIs", "React"] },
    { title: "Image Caption Bot", description: "Caption uploaded images using a vision-language model and post results to a feed.", techStack: ["PyTorch", "FastAPI", "React"], difficulty: "Advanced", coversSkills: ["Deep Learning", "PyTorch"] },
  ],
  data: [
    { title: "City Traffic Insights Dashboard", description: "Pull open city traffic data, clean it with pandas, and visualize peak hours by zone.", techStack: ["Python", "Pandas", "Plotly", "Streamlit"], difficulty: "Intermediate", coversSkills: ["Python", "Data Visualization", "SQL"] },
    { title: "Sales Forecasting Notebook", description: "Build a time-series forecast on sample retail data using ARIMA + Prophet and compare error rates.", techStack: ["Python", "Pandas", "Prophet"], difficulty: "Intermediate", coversSkills: ["Machine Learning", "Data Analysis"] },
    { title: "Product Reviews Analyzer", description: "Scrape product reviews and run sentiment + topic clustering, surface trends in a dashboard.", techStack: ["Python", "scikit-learn", "Streamlit"], difficulty: "Beginner", coversSkills: ["Python", "Data Analysis"] },
  ],
  web: [
    { title: "Realtime Collab Whiteboard", description: "A multi-user whiteboard with cursors, shapes, and chat using WebSockets.", techStack: ["React", "Node.js", "Socket.io", "MongoDB"], difficulty: "Advanced", coversSkills: ["React", "Node.js", "MongoDB"] },
    { title: "Personal Habit Tracker (PWA)", description: "Track habits offline-first; sync when online. Includes auth and streak charts.", techStack: ["React", "TypeScript", "IndexedDB", "Tailwind"], difficulty: "Intermediate", coversSkills: ["React", "TypeScript", "Authentication"] },
    { title: "API Status Page", description: "Build a public status page that pings your APIs and shows uptime + incident history.", techStack: ["Next.js", "PostgreSQL", "Vercel Cron"], difficulty: "Intermediate", coversSkills: ["Next.js", "PostgreSQL", "REST APIs"] },
  ],
  cloud: [
    { title: "Auto-Scaling Image Resizer", description: "Drop images in S3 → Lambda resizes → serves via CloudFront. Add CI/CD with GitHub Actions.", techStack: ["AWS", "Lambda", "S3", "GitHub Actions"], difficulty: "Intermediate", coversSkills: ["AWS", "CI/CD", "Docker"] },
    { title: "Microservices on Kubernetes", description: "Build 3 small services + ingress on a local K8s cluster (kind/minikube), with health checks.", techStack: ["Docker", "Kubernetes", "Go"], difficulty: "Advanced", coversSkills: ["Kubernetes", "Docker", "Go"] },
  ],
  security: [
    { title: "Password Strength + Breach Checker", description: "A web app that scores passwords and checks against a public breach API.", techStack: ["React", "Node.js", "HaveIBeenPwned API"], difficulty: "Beginner", coversSkills: ["React", "Authentication", "REST APIs"] },
    { title: "Mini SIEM Log Viewer", description: "Ingest sample auth logs, detect brute-force patterns, alert via dashboard.", techStack: ["Python", "Elasticsearch", "Kibana"], difficulty: "Advanced", coversSkills: ["Cybersecurity", "Python"] },
  ],
  mobile: [
    { title: "Expense Splitter App", description: "Split bills with friends, sync to cloud, send reminders.", techStack: ["React Native", "Firebase"], difficulty: "Intermediate", coversSkills: ["React Native", "Authentication"] },
  ],
  design: [
    { title: "Onboarding Flow Redesign Case Study", description: "Pick a real app, audit the onboarding, prototype an improved flow with measurable goals.", techStack: ["Figma", "User Testing"], difficulty: "Beginner", coversSkills: ["Figma", "UI/UX"] },
  ],
  product: [
    { title: "Feature Prioritization Doc", description: "Pick a real product. Write a PRD with RICE scoring, success metrics, and a rollout plan.", techStack: ["Notion", "Mixpanel (mock)"], difficulty: "Beginner", coversSkills: ["Product Strategy", "Data Analysis"] },
  ],
};

export function recommendProjects(career: CareerRole, gaps: SkillGap[]): ProjectIdea[] {
  const cat = career.category.toLowerCase();
  let pool: ProjectIdea[] = [];
  if (cat.includes("ai") || cat.includes("ml")) pool = PROJECT_BLUEPRINTS.ai.concat(PROJECT_BLUEPRINTS.data);
  else if (cat.includes("data")) pool = PROJECT_BLUEPRINTS.data;
  else if (cat.includes("web") || cat.includes("software")) pool = PROJECT_BLUEPRINTS.web;
  else if (cat.includes("cloud") || cat.includes("devops")) pool = PROJECT_BLUEPRINTS.cloud;
  else if (cat.includes("security")) pool = PROJECT_BLUEPRINTS.security;
  else if (cat.includes("mobile")) pool = PROJECT_BLUEPRINTS.mobile;
  else if (cat.includes("design")) pool = PROJECT_BLUEPRINTS.design;
  else if (cat.includes("product") || cat.includes("business")) pool = PROJECT_BLUEPRINTS.product;
  else pool = PROJECT_BLUEPRINTS.web;

  // Rank by how many gap skills the project covers
  const gapNames = new Set(gaps.map((g) => g.skill.toLowerCase()));
  const ranked = pool
    .map((p) => ({
      ...p,
      _score: p.coversSkills.filter((s) => gapNames.has(s.toLowerCase())).length,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 4)
    .map(({ _score, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

  return ranked;
}

/* ============================================================
   4) RESUME ATS SCORE ANALYZER
   ============================================================ */
export function computeATSScore(resume: ResumeData, career: CareerRole | null): ATSScore {
  const text = (resume.rawText || "").toLowerCase();
  const tips: string[] = [];

  // Keyword match against career role
  let keywordScore = 50;
  if (career) {
    const required = career.requiredSkills.map((s) => s.toLowerCase());
    const matched = required.filter((r) => text.includes(r));
    keywordScore = Math.round((matched.length / Math.max(required.length, 1)) * 100);
    if (matched.length < required.length * 0.6) {
      tips.push(`Add more role-specific keywords (e.g. ${required.filter(r => !text.includes(r)).slice(0, 3).join(", ")}).`);
    }
  } else {
    tips.push("Pick a career goal so we can tailor keyword matching to that role.");
  }

  // Formatting heuristics
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  let formattingScore = 60;
  if (wordCount > 250) formattingScore += 15;
  if (wordCount > 500) formattingScore += 10;
  if (/email|@/.test(text)) formattingScore += 5;
  if (/phone|\+?\d[\d\s\-()]{7,}/.test(text)) formattingScore += 5;
  if (/(experience|education|projects?|skills)/.test(text)) formattingScore += 5;
  formattingScore = Math.min(100, formattingScore);
  if (wordCount < 250) tips.push("Resume seems short. Aim for 400–700 words covering projects, experience, and skills.");
  if (!/(experience|projects?)/.test(text)) tips.push("Add clear 'Experience' and 'Projects' sections — ATS systems look for them.");
  if (!/\b(led|built|designed|implemented|developed|optimized|improved|reduced|automated)\b/.test(text)) {
    tips.push("Use strong action verbs (Built, Led, Designed, Implemented) at the start of bullets.");
  }

  // Skill relevance density
  const skillCount = (resume.skills?.length || 0) + (resume.tools?.length || 0);
  const relevanceScore = Math.min(100, 30 + skillCount * 5);
  if (skillCount < 8) tips.push("List at least 8–12 concrete skills/tools you've actually used.");

  const score = Math.round(keywordScore * 0.45 + formattingScore * 0.30 + relevanceScore * 0.25);
  if (tips.length === 0) tips.push("Resume looks ATS-friendly. Keep tailoring keywords per job description.");

  return { score, keywordScore, formattingScore, relevanceScore, tips };
}

/* ============================================================
   5) GITHUB PORTFOLIO STRENGTH EVALUATOR
   ============================================================ */
export function evaluatePortfolioStrength(gh: GitHubAnalysis): PortfolioStrength {
  const feedback: string[] = [];
  const repos = gh.repos || [];

  // Repo quality: stars + descriptions + inferred capabilities
  const withDesc = repos.filter((r) => r.description && r.description.length > 15).length;
  const totalStars = repos.reduce((sum, r) => sum + (r.stars || 0), 0);
  const withInfer = repos.filter((r) => r.inferred && r.inferred.length > 0).length;

  let repoQuality = 0;
  if (repos.length > 0) {
    repoQuality = Math.round(
      (withDesc / repos.length) * 40 +
      (withInfer / repos.length) * 40 +
      Math.min(20, totalStars * 2)
    );
  }
  if (withDesc / Math.max(repos.length, 1) < 0.5) {
    feedback.push("Many repos are missing meaningful descriptions. Add a one-line summary to each.");
  }
  if (totalStars === 0) feedback.push("Pin your best 4–6 repos and ask peers to star them honestly.");

  // README quality (proxy: inferred capabilities count)
  const avgInferred = repos.length === 0 ? 0 : repos.reduce((s, r) => s + (r.inferred?.length || 0), 0) / repos.length;
  const readmeQuality = Math.min(100, Math.round(avgInferred * 25));
  if (readmeQuality < 50) {
    feedback.push("Strengthen READMEs: include problem statement, screenshots, tech stack, and how to run.");
  }

  // Diversity: number of distinct languages
  const distinctLangs = gh.topLanguages?.length || 0;
  const diversity = Math.min(100, distinctLangs * 18);
  if (distinctLangs < 3) feedback.push("Add 1–2 projects in a different language/stack to show range.");

  // Consistency: number of repos as a proxy
  const consistency = Math.min(100, Math.round((gh.totalRepos || 0) * 8));
  if ((gh.totalRepos || 0) < 5) feedback.push("Aim to publish at least 5 polished projects on GitHub.");

  const score = Math.round(repoQuality * 0.35 + readmeQuality * 0.30 + diversity * 0.15 + consistency * 0.20);
  if (feedback.length === 0) feedback.push("Strong portfolio. Keep shipping and write a blog post per project.");

  return { score, repoQuality, readmeQuality, diversity, consistency, feedback };
}

/* ============================================================
   6) LINKEDIN PROFILE ANALYZER
   ============================================================ */
const SKILL_VOCAB = [
  "python","javascript","typescript","react","next.js","node.js","sql","mongodb","postgresql","aws",
  "docker","kubernetes","machine learning","deep learning","pytorch","tensorflow","data visualization",
  "rest apis","graphql","authentication","testing","git","ci/cd","tailwind","java","c++","go","rust",
  "figma","ui/ux","flutter","react native","cybersecurity","data analysis","excel","power bi","tableau",
  "html","css","redux","express","django","flask","fastapi","spring","linux","bash","redis",
];

export function analyzeLinkedInText(input: string): LinkedInData {
  const text = (input || "").trim();
  if (text.length < 80) {
    return {
      experience: [], skills: [], roles: [], projects: [], rawText: text,
      valid: false,
      message: "⚠️ Please paste a longer LinkedIn profile (At least 80 characters covering your experience, skills, or projects).",
    };
  }

  const lower = text.toLowerCase();
  const skills = SKILL_VOCAB.filter((s) => lower.includes(s)).map((s) =>
    s === "rest apis" ? "REST APIs" :
    s === "ci/cd" ? "CI/CD" :
    s === "ui/ux" ? "UI/UX" :
    s === "node.js" ? "Node.js" :
    s === "next.js" ? "Next.js" :
    s === "c++" ? "C++" :
    s === "sql" ? "SQL" :
    s === "aws" ? "AWS" :
    s === "html" ? "HTML" :
    s === "css" ? "CSS" :
    s.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")
  );

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const ROLE_REGEX = /(intern|engineer|developer|analyst|scientist|designer|manager|consultant|architect|lead)/i;
  const roles = Array.from(new Set(lines.filter((l) => ROLE_REGEX.test(l) && l.length < 100))).slice(0, 8);

  const PROJECT_REGEX = /^(project|built|created|developed|implemented|designed)\b/i;
  const projects = lines.filter((l) => PROJECT_REGEX.test(l)).slice(0, 8);

  const experience = lines.filter((l) =>
    /\b(20\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|years?|months?)\b/i.test(l) && l.length < 160
  ).slice(0, 10);

  const headlineMatch = lines.find((l) => l.length < 120 && ROLE_REGEX.test(l));
  const nameMatch = lines[0] && lines[0].length < 60 && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(lines[0]) ? lines[0] : undefined;

  return {
    name: nameMatch,
    headline: headlineMatch,
    experience,
    skills: Array.from(new Set(skills)),
    roles,
    projects,
    rawText: text,
    valid: true,
  };
}

/* ============================================================
   7) MERGE LinkedIn into existing skill set (utility)
   ============================================================ */
export function mergeLinkedInSkills(existing: Skill[], linkedin: LinkedInData): Skill[] {
  const map = new Map(existing.map((s) => [s.name.toLowerCase(), { ...s }]));
  for (const sk of linkedin.skills) {
    const key = sk.toLowerCase();
    if (map.has(key)) {
      const cur = map.get(key)!;
      cur.depth = Math.min(100, cur.depth + 5);
      if (!cur.evidence.some((e) => e.includes("LinkedIn"))) cur.evidence.push("Listed on LinkedIn");
    } else {
      map.set(key, {
        name: sk,
        depth: 30,
        evidence: ["Listed on LinkedIn"],
        verification: "Unverified",
      });
    }
  }
  return Array.from(map.values());
}
