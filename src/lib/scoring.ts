import type { CareerRole, Skill, SkillGap, Roadmap } from "./types";

export function detectSkillGaps(role: CareerRole, skills: Skill[]): SkillGap[] {
  const gaps: SkillGap[] = [];
  const skillMap = new Map(skills.map((s) => [s.name.toLowerCase(), s]));

  for (const req of role.requiredSkills) {
    const found = skillMap.get(req.toLowerCase());
    if (!found) {
      gaps.push({ skill: req, status: "Missing", priority: "High" });
    } else if (found.verification === "Weak" || found.depth < 30) {
      gaps.push({ skill: req, status: "Weak", priority: "High" });
    } else if (found.verification === "Basic" || found.depth < 60) {
      gaps.push({ skill: req, status: "Basic", priority: "Medium" });
    }
  }

  for (const nice of role.niceToHave) {
    const found = skillMap.get(nice.toLowerCase());
    if (!found) gaps.push({ skill: nice, status: "Missing", priority: "Low" });
  }

  return gaps;
}

export function computeReadinessScore(role: CareerRole, skills: Skill[]): { score: number; category: string } {
  const skillMap = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
  let total = 0;
  let max = 0;

  for (const req of role.requiredSkills) {
    max += 100;
    const found = skillMap.get(req.toLowerCase());
    if (!found) continue;
    let s = found.depth;
    if (found.verification === "Strong") s = Math.min(100, s + 15);
    else if (found.verification === "Basic") s = Math.max(s * 0.7, 25);
    else if (found.verification === "Weak") s = Math.max(s * 0.4, 10);
    total += Math.min(100, s);
  }

  // Nice-to-haves provide a small bonus
  for (const nice of role.niceToHave) {
    const f = skillMap.get(nice.toLowerCase());
    if (f) total += f.depth * 0.15;
  }

  const score = Math.round(Math.min(100, (total / max) * 100));
  const category =
    score >= 80 ? "Job Ready 🚀" :
    score >= 60 ? "Almost There 💪" :
    score >= 40 ? "Building Foundations 🌱" :
    "Just Getting Started 🌟";

  return { score, category };
}

export function generateRoadmap(role: CareerRole, gaps: SkillGap[]): Roadmap[] {
  const sorted = [...gaps].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const roadmap: Roadmap[] = [];
  let step = 1;
  for (const gap of sorted.slice(0, 6)) {
    roadmap.push({
      step: step++,
      title: gap.status === "Missing" ? `Learn ${gap.skill} from scratch` : `Strengthen ${gap.skill}`,
      description: roadmapDescription(gap.skill, gap.status, role.name),
      resources: roadmapResources(gap.skill),
      durationWeeks: gap.status === "Missing" ? 4 : 2,
    });
  }
  return roadmap;
}

function roadmapDescription(skill: string, status: string, role: string): string {
  if (status === "Missing") {
    return `As a future ${role}, ${skill} is essential. Start with the fundamentals, then build 1 small hands-on project that uses ${skill} end-to-end.`;
  }
  if (status === "Weak") {
    return `You've touched ${skill}, but your interview answer showed gaps. Re-learn the core concepts and rebuild a focused project to solidify it.`;
  }
  return `You have basic ${skill} skills. Push to intermediate by tackling a more complex project that combines ${skill} with other tools you already know.`;
}

function roadmapResources(skill: string): string[] {
  const map: Record<string, string[]> = {
    Python: ["Python.org official tutorial", "Automate the Boring Stuff (free)", "Build: a CLI todo app"],
    JavaScript: ["javascript.info", "MDN Web Docs", "Build: an interactive quiz app"],
    React: ["React official docs (react.dev)", "Build: a weather dashboard with API"],
    "Node.js": ["Node.js docs", "Build: a REST API with Express + MongoDB"],
    SQL: ["SQLBolt interactive tutorial", "Build: query a real Kaggle dataset"],
    MongoDB: ["MongoDB University free courses", "Build: a notes app with Mongo"],
    APIs: ["REST API tutorial (restfulapi.net)", "Build: integrate 2 public APIs"],
    Authentication: ["JWT.io intro", "Build: full login/signup with JWT"],
    Docker: ["Docker official Get Started", "Containerize one of your projects"],
    "Machine Learning": ["Andrew Ng ML course (Coursera)", "Build: predict house prices with sklearn"],
    AWS: ["AWS Cloud Practitioner essentials", "Deploy: host a static site on S3"],
    Git: ["Atlassian Git tutorial", "Practice: branch + merge workflow"],
  };
  return map[skill] || [`Search "${skill} for beginners" on YouTube`, `Build a small project that uses ${skill}`, `Read the official ${skill} documentation`];
}
