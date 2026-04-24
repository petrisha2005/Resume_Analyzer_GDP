import type { SkillVerification } from "./types";

/**
 * SIMPLE, BEGINNER-FRIENDLY questions per skill — real-world phrasing.
 * Each skill has a few question variants and key concepts to grade against.
 */
interface QuestionTemplate {
  question: string;
  keywords: string[]; // any of these in answer = strong signal
  minWords: number;
}

const QUESTION_BANK: Record<string, QuestionTemplate[]> = {
  "Python": [
    { question: "In your own words, why did you pick Python for your project? What did you build with it?", keywords: ["data", "script", "easy", "library", "build", "automation", "ml", "api", "backend", "fast"], minWords: 10 },
  ],
  "JavaScript": [
    { question: "When a user clicks a button on your website, what happens in your JavaScript code?", keywords: ["event", "listener", "function", "click", "fetch", "update", "dom"], minWords: 10 },
  ],
  "TypeScript": [
    { question: "What's one thing TypeScript helps you with that plain JavaScript doesn't?", keywords: ["type", "error", "safety", "interface", "compile", "autocomplete"], minWords: 8 },
  ],
  "React": [
    { question: "How does your React app show new data on the screen after the user does something?", keywords: ["state", "usestate", "render", "props", "component", "update", "hook"], minWords: 10 },
  ],
  "Node.js": [
    { question: "When your frontend asks the backend for data, how does your Node.js server handle that request?", keywords: ["route", "express", "request", "response", "endpoint", "api", "handler"], minWords: 10 },
  ],
  "APIs": [
    { question: "How does your app get data from the backend? Walk me through one example.", keywords: ["fetch", "axios", "request", "endpoint", "json", "get", "post", "api"], minWords: 10 },
  ],
  "SQL": [
    { question: "If you wanted to get all users older than 18 from a 'users' table, what would you write?", keywords: ["select", "from", "where", "users", "age", ">"], minWords: 5 },
  ],
  "MongoDB": [
    { question: "How is data stored in MongoDB compared to a regular table-based database?", keywords: ["document", "collection", "json", "bson", "nosql", "flexible", "schema"], minWords: 8 },
  ],
  "Authentication": [
    { question: "When a user logs in to your app, how do you remember they are logged in?", keywords: ["token", "jwt", "session", "cookie", "store", "header", "localstorage"], minWords: 10 },
  ],
  "Machine Learning": [
    { question: "In simple words, how does a machine learning model 'learn' from data?", keywords: ["train", "data", "pattern", "label", "predict", "model", "fit"], minWords: 10 },
  ],
  "Deep Learning": [
    { question: "What's the basic idea behind a neural network in your own words?", keywords: ["layer", "neuron", "weight", "input", "output", "network", "train"], minWords: 10 },
  ],
  "Pandas": [
    { question: "If you have a CSV file with sales data, how would you load it and find the total sales using pandas?", keywords: ["read_csv", "dataframe", "sum", "column"], minWords: 8 },
  ],
  "NumPy": [
    { question: "What's NumPy useful for that plain Python lists are not great at?", keywords: ["array", "vector", "matrix", "math", "fast", "numeric"], minWords: 8 },
  ],
  "Data Visualization": [
    { question: "If your boss asks you to show monthly sales trends, what kind of chart would you pick and why?", keywords: ["line", "bar", "trend", "chart", "axis", "time"], minWords: 10 },
  ],
  "Statistics": [
    { question: "What does 'mean' tell you about a dataset, and when can it be misleading?", keywords: ["average", "outlier", "skew", "median", "central"], minWords: 10 },
  ],
  "HTML": [
    { question: "What's the difference between a <div> and a <button> in HTML?", keywords: ["click", "semantic", "interactive", "button", "container"], minWords: 8 },
  ],
  "CSS": [
    { question: "How would you center a box horizontally on a page using CSS?", keywords: ["flex", "margin", "auto", "center", "justify", "grid"], minWords: 5 },
  ],
  "Tailwind CSS": [
    { question: "What do you like about Tailwind compared to writing normal CSS?", keywords: ["utility", "class", "fast", "consistent", "responsive"], minWords: 8 },
  ],
  "Docker": [
    { question: "What problem does Docker solve when you give your code to a teammate?", keywords: ["container", "environment", "consistent", "image", "run", "anywhere"], minWords: 10 },
  ],
  "Git": [
    { question: "Your friend made changes to the same file. How would you combine your changes using Git?", keywords: ["pull", "merge", "branch", "conflict", "commit"], minWords: 8 },
  ],
  "AWS": [
    { question: "Name one AWS service you've used and what it did in your project.", keywords: ["s3", "ec2", "lambda", "rds", "store", "host", "compute"], minWords: 8 },
  ],
  "Linux": [
    { question: "How would you list all files in a folder including hidden ones using a Linux terminal?", keywords: ["ls", "-a", "-la"], minWords: 2 },
  ],
  "Figma": [
    { question: "Walk me through how you'd design a login screen in Figma — what would you create first?", keywords: ["wireframe", "frame", "component", "layout", "color", "design"], minWords: 10 },
  ],
  "Excel": [
    { question: "How would you sum a column of numbers in Excel?", keywords: ["sum", "=", "formula", "function"], minWords: 3 },
  ],
};

const GENERIC_QUESTION: QuestionTemplate = {
  question: "Describe a project where you used this skill. What did you build and what was your role?",
  keywords: ["build", "use", "project", "implement", "design"],
  minWords: 12,
};

export function getQuestionForSkill(skill: string): string {
  const bank = QUESTION_BANK[skill];
  if (bank && bank.length) return bank[0].question;
  return GENERIC_QUESTION.question.replace("this skill", skill);
}

export function evaluateAnswer(skill: string, answer: string): { verdict: SkillVerification; feedback: string } {
  const a = answer.trim().toLowerCase();
  if (a.length === 0) {
    return { verdict: "Weak", feedback: "No answer provided." };
  }
  const wordCount = a.split(/\s+/).length;
  if (wordCount < 4) {
    return { verdict: "Weak", feedback: "Your answer was too short to demonstrate understanding. Try explaining with an example from a project." };
  }

  const tpl = (QUESTION_BANK[skill] && QUESTION_BANK[skill][0]) || GENERIC_QUESTION;
  let hits = 0;
  for (const kw of tpl.keywords) {
    if (a.includes(kw)) hits++;
  }

  // Bonus for "I built/used/in my project" — real-world signal
  const realWorldSignal = /(i built|i used|in my project|in my app|my project|i implemented|i created|i wrote|i designed)/i.test(answer);

  let score = hits;
  if (realWorldSignal) score += 1;
  if (wordCount >= tpl.minWords) score += 1;

  if (score >= 3) {
    return { verdict: "Strong", feedback: `Great answer — you mentioned ${hits} key concept${hits === 1 ? "" : "s"} and explained it from real experience.` };
  }
  if (score >= 1) {
    return { verdict: "Basic", feedback: `Decent answer, but try to explain more deeply with a concrete example. Mention specific terms like ${tpl.keywords.slice(0, 3).join(", ")}.` };
  }
  return { verdict: "Weak", feedback: `Your answer didn't show clear understanding of ${skill}. Practice by building a small project that uses it.` };
}
