// Skill normalization & extraction logic (simulates backend NLP)

const SKILL_DICTIONARY: Record<string, string[]> = {
  "Python": ["python", "py", "python3"],
  "JavaScript": ["javascript", "js", "ecmascript"],
  "TypeScript": ["typescript", "ts"],
  "React": ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs", "next js"],
  "Node.js": ["node.js", "nodejs", "node js", "node"],
  "Express": ["express", "expressjs", "express.js"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3"],
  "Tailwind CSS": ["tailwind", "tailwindcss"],
  "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite"],
  "MongoDB": ["mongodb", "mongo"],
  "Redis": ["redis"],
  "Java": ["java"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", "csharp"],
  "Go": ["golang", " go "],
  "Rust": ["rust"],
  "Machine Learning": ["machine learning", "ml ", "scikit", "sklearn"],
  "Deep Learning": ["deep learning", "neural network", "cnn", "rnn"],
  "TensorFlow": ["tensorflow", "tf"],
  "PyTorch": ["pytorch", "torch"],
  "Pandas": ["pandas"],
  "NumPy": ["numpy"],
  "Data Visualization": ["matplotlib", "seaborn", "plotly", "data visualization", "chart", "recharts", "d3"],
  "Statistics": ["statistics", "statistical"],
  "APIs": ["api", "apis", "rest", "graphql", "fetch", "axios"],
  "Authentication": ["auth", "authentication", "jwt", "oauth", "login system", "sign in"],
  "Docker": ["docker"],
  "Kubernetes": ["kubernetes", "k8s"],
  "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
  "Azure": ["azure"],
  "GCP": ["gcp", "google cloud"],
  "Git": ["git", "github", "gitlab"],
  "CI/CD": ["ci/cd", "github actions", "jenkins", "gitlab ci"],
  "Linux": ["linux", "ubuntu", "bash", "shell"],
  "Networking": ["networking", "tcp", "http", "dns"],
  "FastAPI": ["fastapi"],
  "Flask": ["flask"],
  "Django": ["django"],
  "React Native": ["react native"],
  "Flutter": ["flutter", "dart"],
  "Figma": ["figma"],
  "Excel": ["excel", "spreadsheet"],
  "Power BI": ["power bi", "powerbi"],
  "Tableau": ["tableau"],
  "OOP": ["object oriented", "oop"],
  "Data Structures": ["data structures", "dsa"],
  "Algorithms": ["algorithms", "algorithm"],
  "Testing": ["jest", "pytest", "unit test", "testing"],
  "MLOps": ["mlops"],
  "LangChain": ["langchain"],
  "Vector Databases": ["pinecone", "weaviate", "vector db", "chromadb"],
  "Terraform": ["terraform"],
  "Security Fundamentals": ["security", "owasp"],
  "Cryptography": ["cryptography", "encryption", "hashing"],
  "Communication": ["communication", "presentation"],
  "Agile": ["agile", "scrum", "kanban"],
};

export function normalizeSkills(text: string): string[] {
  const lower = " " + text.toLowerCase() + " ";
  const found = new Set<string>();
  for (const [canonical, aliases] of Object.entries(SKILL_DICTIONARY)) {
    for (const alias of aliases) {
      if (lower.includes(alias.toLowerCase())) {
        found.add(canonical);
        break;
      }
    }
  }
  return Array.from(found);
}

export function countOccurrences(text: string, term: string): number {
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = lower.indexOf(t, idx)) !== -1) {
    count++;
    idx += t.length;
  }
  return count;
}

/**
 * Compute depth score 0-100 for each skill.
 * Factors: frequency in resume + github repos + project diversity.
 */
export function computeSkillDepth(
  skill: string,
  resumeText: string,
  repos: { name: string; description: string; language: string; readme?: string }[]
): { depth: number; evidence: string[] } {
  const evidence: string[] = [];
  let score = 0;

  const aliases = SKILL_DICTIONARY[skill] || [skill.toLowerCase()];
  const allText = resumeText.toLowerCase();

  let freq = 0;
  for (const alias of aliases) freq += countOccurrences(allText, alias);
  if (freq > 0) {
    score += Math.min(freq * 8, 30);
    evidence.push(`Mentioned ${freq}× in resume`);
  }

  let repoCount = 0;
  for (const repo of repos) {
    const blob = `${repo.name} ${repo.description} ${repo.language} ${repo.readme || ""}`.toLowerCase();
    let used = false;
    for (const alias of aliases) {
      if (blob.includes(alias)) { used = true; break; }
    }
    if (used) {
      repoCount++;
      evidence.push(`Used in project "${repo.name}"`);
    }
  }
  if (repoCount > 0) {
    score += Math.min(repoCount * 18, 55);
  }

  // Diversity bonus: used across resume AND github
  if (freq > 0 && repoCount > 0) score += 15;

  return {
    depth: Math.max(5, Math.min(score, 100)),
    evidence: evidence.slice(0, 4),
  };
}
