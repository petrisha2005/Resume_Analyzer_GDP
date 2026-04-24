import type { GitHubAnalysis, RepoInsight } from "./types";
import { normalizeSkills } from "./skillEngine";

interface GHRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  fork: boolean;
  default_branch: string;
}

export async function analyzeGitHubUser(username: string): Promise<GitHubAnalysis> {
  if (!username || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    return emptyAnalysis(username, "Please enter a valid GitHub username.");
  }

  let repos: GHRepo[] = [];
  try {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`);
    if (r.status === 404) return emptyAnalysis(username, "GitHub user not found.");
    if (r.status === 403) return emptyAnalysis(username, "GitHub API rate limit reached. Try again in a few minutes.");
    if (!r.ok) return emptyAnalysis(username, `GitHub error (${r.status}). Try again.`);
    repos = await r.json();
  } catch {
    return emptyAnalysis(username, "Network error reaching GitHub.");
  }

  // Skip forks for cleaner signal
  const own = repos.filter((r) => !r.fork);

  // Sort by stars + recent and take top 8 for deep analysis (README fetch)
  const top = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 8);

  const insights: RepoInsight[] = [];
  for (const repo of top) {
    const readme = await fetchReadme(username, repo.name, repo.default_branch).catch(() => "");
    const blob = `${repo.name} ${repo.description || ""} ${readme}`.toLowerCase();
    const tech = normalizeSkills(blob);
    const inferred = inferCapabilities(blob, tech, repo);
    insights.push({
      name: repo.name,
      description: repo.description || "No description",
      language: repo.language || "Unknown",
      stars: repo.stargazers_count,
      url: repo.html_url,
      inferred,
      techStack: tech,
    });
  }

  // Aggregate language counts
  const langMap = new Map<string, number>();
  for (const r of own) {
    if (r.language) langMap.set(r.language, (langMap.get(r.language) || 0) + 1);
  }
  const topLanguages = Array.from(langMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Aggregate inferred capabilities across repos
  const capMap = new Map<string, number>();
  for (const i of insights) {
    for (const cap of i.inferred) capMap.set(cap, (capMap.get(cap) || 0) + 1);
  }
  const inferredCapabilities = Array.from(capMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
    .slice(0, 12);

  return {
    username,
    totalRepos: own.length,
    topLanguages,
    repos: insights,
    inferredCapabilities,
  };
}

function emptyAnalysis(username: string, error: string): GitHubAnalysis {
  return { username, totalRepos: 0, topLanguages: [], repos: [], inferredCapabilities: [], error };
}

async function fetchReadme(user: string, repo: string, branch: string): Promise<string> {
  const candidates = [
    `https://raw.githubusercontent.com/${user}/${repo}/${branch}/README.md`,
    `https://raw.githubusercontent.com/${user}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${user}/${repo}/master/README.md`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const t = await r.text();
        return t.slice(0, 6000);
      }
    } catch { /* keep trying */ }
  }
  return "";
}

/**
 * Deep inference — produces human-readable capability statements,
 * not just a bag of tech tokens.
 */
function inferCapabilities(blob: string, tech: string[], repo: GHRepo): string[] {
  const out: string[] = [];
  const has = (...words: string[]) => words.some((w) => blob.includes(w));

  // Frontend
  if (tech.includes("React") || has("react", "next.js", "vue", "svelte")) {
    if (has("fetch", "axios", "api")) {
      out.push(`Built frontend UI with React and integrated REST APIs in "${repo.name}"`);
    } else {
      out.push(`Built frontend UI with React in "${repo.name}"`);
    }
  }
  if (has("tailwind")) out.push(`Designed responsive UI using Tailwind CSS`);

  // Backend
  if (tech.includes("Node.js") || has("express", "node")) {
    out.push(`Implements backend logic with Node.js / Express`);
  }
  if (tech.includes("FastAPI")) out.push(`Built REST API server using FastAPI (Python)`);
  if (tech.includes("Flask")) out.push(`Built backend service using Flask`);
  if (tech.includes("Django")) out.push(`Built full backend with Django ORM and views`);

  // Database
  if (tech.includes("MongoDB")) out.push(`Uses MongoDB (NoSQL) for data storage`);
  if (tech.includes("SQL")) out.push(`Uses SQL database for structured data storage`);
  if (tech.includes("Redis")) out.push(`Uses Redis for caching / session storage`);

  // Auth
  if (has("jwt", "oauth", "auth", "login", "passport", "bcrypt")) {
    out.push(`Implements authentication system (login / sessions)`);
  }

  // ML / AI
  if (tech.includes("Machine Learning") || tech.includes("TensorFlow") || tech.includes("PyTorch")) {
    out.push(`Trains and uses ML models for predictions`);
  }
  if (has("openai", "gemini", "llm", "langchain", "chatgpt")) {
    out.push(`Integrates LLM APIs (OpenAI / Gemini) into the application`);
  }
  if (has("opencv", "image classification", "yolo")) {
    out.push(`Performs computer vision / image processing`);
  }
  if (has("nltk", "spacy", "nlp", "transformer", "bert")) {
    out.push(`Performs NLP tasks (text processing / classification)`);
  }

  // Data
  if (tech.includes("Pandas") || tech.includes("NumPy")) {
    out.push(`Performs data processing with Pandas / NumPy`);
  }
  if (tech.includes("Data Visualization")) {
    out.push(`Creates data visualizations and charts`);
  }

  // DevOps
  if (tech.includes("Docker")) out.push(`Containerizes the application using Docker`);
  if (has("github actions", "ci/cd", "jenkins")) out.push(`Sets up CI/CD pipelines for automated deploys`);
  if (tech.includes("AWS")) out.push(`Deploys / uses AWS cloud services`);

  // Testing
  if (has("jest", "pytest", "unit test", "test/")) out.push(`Writes automated tests for code reliability`);

  // Mobile
  if (tech.includes("React Native")) out.push(`Built cross-platform mobile app with React Native`);
  if (tech.includes("Flutter")) out.push(`Built cross-platform mobile app with Flutter`);

  // Fallback
  if (out.length === 0 && repo.language) {
    out.push(`Implemented project primarily in ${repo.language}`);
  }
  return out;
}
