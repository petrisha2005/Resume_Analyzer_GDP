// Resume Validation — Pattern-based detection with confidence scoring
// Uses line-by-line parsing, flexible keyword matching, and structure analysis.
// NO AI dependency — deterministic and fast.

export interface ResumeValidationReport {
  status: "valid" | "moderate" | "invalid";
  confidenceScore: number;       // 0–100
  message: string;
  sectionScore: number;          // 0–6
  matchedSections: string[];
  missingSections: string[];
  emailFound: boolean;
  phoneFound: boolean;
  textLength: number;
  shortLines: number;
  bulletPoints: number;
  headingLines: number;
  matchedKeywords: string[];
  reasons: string[];
}

export const RESUME_REJECTION_MESSAGE =
  "⚠️ This document does not match a resume format. Please upload a proper resume.";

// ── SECTION KEYWORDS (flexible matching — REAL WORLD) ──────────────────
const SECTION_KEYWORDS: Record<string, string[]> = {
  education: ["education", "academic", "qualification", "degree", "bachelor", "master", "b.tech", "m.tech", "university", "college"],
  skills: ["skills", "technical skills", "technologies", "tools", "tech stack", "core competencies", "proficiencies"],
  projects: ["projects", "portfolio", "project work", "personal projects"],
  experience: ["experience", "internship", "employment", "work history", "work experience", "professional experience"],
  about: ["summary", "profile", "objective", "about me", "career objective"],
};

// ── TECH KEYWORDS (for scoring bonus) ──────────────────────────────────
const TECH_WORDS = [
  "python", "java", "javascript", "typescript", "react", "angular", "vue",
  "node", "express", "django", "flask", "sql", "mysql", "postgresql", "mongodb",
  "machine learning", "deep learning", "data science", "docker", "kubernetes",
  "aws", "azure", "gcp", "html", "css", "tailwind", "bootstrap",
  "git", "github", "rest", "api", "graphql", "ci/cd", "jenkins",
  "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "matplotlib",
  "linux", "redis", "elasticsearch", "spring", "php", "ruby", "go", "rust",
  "swift", "kotlin", "flutter", "react native", "firebase", "next.js", "nuxt",
];

// ── EMAIL & PHONE REGEX ────────────────────────────────────────────────
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{8,}\d)|\b\d{10}\b/;
const BULLET_RE = /^\s*[-•*●▪▫◦‣·]\s+/;

export function validateResume(rawText: string): ResumeValidationReport {
  // ── STEP 1: PREPROCESS TEXT (CRITICAL FIX) ─────────────────────────
  // Handle non-breaking spaces and normalize whitespace
  let text = (rawText || "")
    .replace(/\xa0/g, " ")          // non-breaking space
    .replace(/\u200B/g, "")         // zero-width space
    .replace(/\u200C/g, "")         // zero-width non-joiner
    .replace(/\u200D/g, "")         // zero-width joiner
    .trim();

  const textLower = text.toLowerCase();

  // ── STEP 2: SPLIT INTO LINES (CRITICAL FIX) ────────────────────────
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const linesLower = lines.map((l) => l.toLowerCase());

  // ── STEP 3: EMAIL DETECTION (ROBUST — whitespace-stripped) ─────────
  // PDFs sometimes break emails: "patricia @ gmail . com"
  // Strip ALL whitespace and search
  const cleanNoSpace = text.replace(/\s/g, "");
  const emailFound = EMAIL_RE.test(cleanNoSpace);

  // Also try the original text (for non-broken emails)
  const emailFoundOriginal = EMAIL_RE.test(text);
  const hasEmail = emailFound || emailFoundOriginal;

  // ── STEP 4: PHONE DETECTION ────────────────────────────────────────
  const phoneFound = PHONE_RE.test(text);

  // ── STEP 5: SECTION DETECTION (LINE-BASED — REAL FIX) ──────────────
  const matchedSections: string[] = [];
  let sectionScore = 0;

  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    // Check each keyword against each line (flexible matching)
    const found = keywords.some((kw) =>
      linesLower.some((line) => line.includes(kw))
    );
    if (found) {
      sectionScore += 1;
      matchedSections.push(section.charAt(0).toUpperCase() + section.slice(1));
    }
  }

  // ── STEP 6: SMART HEADING DETECTION (BOOST) ────────────────────────
  // Many resumes have ALL CAPS headings: EDUCATION, SKILLS, PROJECTS
  let headingCount = 0;
  for (const line of lines) {
    if (line === line.toUpperCase() && line.length > 2 && line.length < 40) {
      headingCount += 1;
    }
  }
  if (headingCount >= 2) {
    sectionScore += 1;
  }

  // ── STEP 7: STRUCTURE ANALYSIS ─────────────────────────────────────
  const shortLines = lines.filter((l) => l.length < 120).length;
  const bulletPoints = lines.filter((l) => BULLET_RE.test(l)).length;

  // ── STEP 8: TECH KEYWORDS ──────────────────────────────────────────
  const matchedKeywords: string[] = [];
  let techScore = 0;
  for (const word of TECH_WORDS) {
    if (textLower.includes(word)) {
      techScore += 1;
      matchedKeywords.push(word);
    }
  }

  // ── STEP 9: FINAL SCORING ──────────────────────────────────────────
  let totalScore = 0;

  // Sections: 15 points each (max 90 with heading bonus)
  totalScore += sectionScore * 15;

  // Email: 20 points
  if (hasEmail) totalScore += 20;

  // Phone: 15 points
  if (phoneFound) totalScore += 15;

  // Tech keywords: 5 points each, max 20
  totalScore += Math.min(techScore * 5, 20);

  // Structure: 10 points if well-structured
  if (shortLines > 10) totalScore += 10;

  // Normalize to 0–100 (max possible is ~155)
  const confidenceScore = Math.min(100, Math.round((totalScore / 155) * 100));

  // ── STEP 10: FINAL DECISION (IMPROVED) ─────────────────────────────
  let status: "valid" | "moderate" | "invalid";
  let message: string;
  const reasons: string[] = [];

  if (text.length < 150) {
    status = "invalid";
    message = "This file is too short to be a resume.";
    reasons.push(`Document is only ${text.length} characters. A resume needs at least 150 characters.`);
  } else if (sectionScore >= 2) {
    status = "valid";
    message = "This looks like a strong resume.";
  } else if (sectionScore === 1 && hasEmail) {
    status = "moderate";
    message = "This could be a resume — some sections detected.";
    reasons.push("Only 1 resume section found. Adding more sections (Education, Skills, Experience, Projects) would help.");
  } else {
    status = "invalid";
    message = RESUME_REJECTION_MESSAGE;
    if (!hasEmail) {
      reasons.push("No email address detected. A resume should include contact information.");
    }
    if (sectionScore === 0) {
      reasons.push("No resume sections detected (Education, Skills, Experience, Projects, Summary).");
    }
  }

  // Missing sections for feedback
  const allSections = ["Education", "Skills", "Projects", "Experience", "About"];
  const missingSections = allSections.filter(
    (s) => !matchedSections.includes(s)
  );

  // ── DEBUG OUTPUT (MANDATORY) ───────────────────────────────────────
  console.log("=== RESUME VALIDATION DEBUG ===");
  console.log("TEXT LENGTH:", text.length);
  console.log("EMAIL (clean):", emailFound, "| EMAIL (original):", emailFoundOriginal, "| HAS EMAIL:", hasEmail);
  console.log("PHONE FOUND:", phoneFound);
  console.log("SECTION SCORE:", sectionScore);
  console.log("MATCHED SECTIONS:", matchedSections);
  console.log("HEADING COUNT:", headingCount);
  console.log("SHORT LINES:", shortLines);
  console.log("BULLETS:", bulletPoints);
  console.log("TECH SCORE:", techScore);
  console.log("CONFIDENCE:", confidenceScore);
  console.log("STATUS:", status);
  console.log("FIRST 20 LINES:", lines.slice(0, 20));
  console.log("================================");

  return {
    status,
    confidenceScore,
    message,
    sectionScore,
    matchedSections,
    missingSections,
    emailFound: hasEmail,
    phoneFound,
    textLength: text.length,
    shortLines,
    bulletPoints,
    headingLines: headingCount,
    matchedKeywords: matchedKeywords.slice(0, 10),
    reasons,
  };
}
