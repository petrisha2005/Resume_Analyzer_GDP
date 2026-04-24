import type { QuizQuestion } from "./types";

/**
 * Quiz Engine — AI-generated MCQ questions per skill.
 * In a real backend, this would call Gemini with:
 *   "Generate 5 MCQ questions to test understanding of {skill}.
 *    Difficulty: beginner to intermediate. Return correct answers."
 *
 * Here we use a deterministic bank of realistic questions per skill.
 * Each skill has 5 questions with 4 options and one correct answer.
 */

// Seed-based deterministic shuffle (so questions feel fresh per session)
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QUESTION_BANK: Record<string, QuizQuestion[]> = {
  React: [
    { id: "r1", question: "What is JSX in React?", options: ["A syntax extension for JavaScript that looks like HTML", "A new programming language", "A CSS framework", "A database query language"], answer: 0 },
    { id: "r2", question: "What hook is used to manage state in a functional React component?", options: ["useEffect", "useState", "useReducer", "useContext"], answer: 1 },
    { id: "r3", question: "What does the Virtual DOM do?", options: ["Replaces the browser entirely", "Optimizes DOM updates by diffing before committing", "Runs code on the server", "Compresses images"], answer: 1 },
    { id: "r4", question: "How do you pass data from parent to child component?", options: ["Using global variables", "Using props", "Using localStorage", "Using Redux only"], answer: 1 },
    { id: "r5", question: "What is the purpose of useEffect with an empty dependency array []?", options: ["Runs on every render", "Runs only once after the first render", "Runs before every render", "Never runs"], answer: 1 },
  ],
  JavaScript: [
    { id: "j1", question: "What keyword is used to declare a constant variable?", options: ["var", "let", "const", "static"], answer: 2 },
    { id: "j2", question: "What does '===' do in JavaScript?", options: ["Assignment", "Strict equality (value and type)", "Loose equality", "Type conversion"], answer: 1 },
    { id: "j3", question: "What is an array method used to transform every element?", options: ["filter()", "map()", "reduce()", "forEach()"], answer: 1 },
    { id: "j4", question: "What is a Promise used for?", options: ["Styling elements", "Handling asynchronous operations", "Creating arrays", "Importing modules"], answer: 1 },
    { id: "j5", question: "What does JSON.parse() do?", options: ["Converts an object to a string", "Parses a JSON string into a JavaScript object", "Validates email addresses", "Encrypts data"], answer: 1 },
  ],
  Python: [
    { id: "p1", question: "What is the correct way to define a function in Python?", options: ["function myFunc():", "def myFunc():", "func myFunc():", "define myFunc():"], answer: 1 },
    { id: "p2", question: "What data structure uses key-value pairs?", options: ["List", "Tuple", "Dictionary", "Set"], answer: 2 },
    { id: "p3", question: "What does 'len()' do?", options: ["Returns the length of an object", "Converts to lowercase", "Creates a new list", "Opens a file"], answer: 0 },
    { id: "p4", question: "How do you start a for loop that counts from 0 to 4?", options: ["for i in range(5):", "for i in range(0,4):", "for (i=0; i<5; i++):", "loop i from 0 to 4:"], answer: 0 },
    { id: "p5", question: "What is a list comprehension?", options: ["A way to compress files", "A concise way to create lists", "Reading a list backwards", "Sorting a list"], answer: 1 },
  ],
  SQL: [
    { id: "s1", question: "Which SQL command retrieves data from a database?", options: ["INSERT", "UPDATE", "SELECT", "DELETE"], answer: 2 },
    { id: "s2", question: "What clause filters rows after grouping?", options: ["WHERE", "HAVING", "FILTER", "ORDER BY"], answer: 1 },
    { id: "s3", question: "What type of JOIN returns only matching rows?", options: ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL JOIN"], answer: 2 },
    { id: "s4", question: "What does PRIMARY KEY do?", options: ["Encrypts data", "Uniquely identifies each row in a table", "Sorts the table", "Deletes duplicate rows"], answer: 1 },
    { id: "s5", question: "Which function counts the number of rows?", options: ["SUM()", "AVG()", "COUNT()", "MAX()"], answer: 2 },
  ],
  "Node.js": [
    { id: "n1", question: "What module system does Node.js use by default?", options: ["ES6 modules", "CommonJS (require)", "AMD", "UMD"], answer: 1 },
    { id: "n2", question: "What is npm?", options: ["Node Package Manager", "Node Programming Module", "New Project Manager", "Network Protocol Method"], answer: 0 },
    { id: "n3", question: "What does 'require()' do?", options: ["Imports a module", "Starts the server", "Defines a variable", "Ends the program"], answer: 0 },
    { id: "n4", question: "Which HTTP method is used to create a new resource?", options: ["GET", "POST", "PUT", "DELETE"], answer: 1 },
    { id: "n5", question: "What does Express.js help with?", options: ["Building web servers and APIs", "Styling web pages", "Database management", "Testing code"], answer: 0 },
  ],
  "Machine Learning": [
    { id: "m1", question: "What is supervised learning?", options: ["Learning without labels", "Learning with labeled data", "Learning by reinforcement", "Learning by clustering"], answer: 1 },
    { id: "m2", question: "What is overfitting?", options: ["Model performs well on training data but poorly on new data", "Model is too simple", "Model runs too fast", "Model uses too little data"], answer: 0 },
    { id: "m3", question: "What is the purpose of a train-test split?", options: ["To make the model faster", "To evaluate model performance on unseen data", "To reduce dataset size", "To combine datasets"], answer: 1 },
    { id: "m4", question: "What does scikit-learn provide?", options: ["A web framework", "Machine learning algorithms and tools", "A database system", "A testing framework"], answer: 1 },
    { id: "m5", question: "What is a confusion matrix used for?", options: ["To confuse the model", "To visualize classification performance", "To sort data", "To preprocess images"], answer: 1 },
  ],
  Docker: [
    { id: "d1", question: "What is a Docker image?", options: ["A running process", "A read-only template to create containers", "A network configuration", "A log file"], answer: 1 },
    { id: "d2", question: "What command builds a Docker image?", options: ["docker run", "docker build", "docker start", "docker create"], answer: 1 },
    { id: "d3", question: "What is a Docker container?", options: ["A static file", "A running instance of an image", "A storage volume", "A network interface"], answer: 1 },
    { id: "d4", question: "What file defines a Docker image build?", options: ["package.json", "Dockerfile", "docker-compose.yml", "Makefile"], answer: 1 },
    { id: "d5", question: "What does 'docker-compose' do?", options: ["Runs multiple containers together", "Compiles code", "Tests the application", "Monitors logs"], answer: 0 },
  ],
  Git: [
    { id: "g1", question: "What command creates a new branch?", options: ["git branch <name>", "git checkout <name>", "git new <name>", "git create <name>"], answer: 0 },
    { id: "g2", question: "What does 'git commit' do?", options: ["Uploads code to GitHub", "Saves changes locally with a message", "Downloads changes", "Deletes a branch"], answer: 1 },
    { id: "g3", question: "What command combines branches?", options: ["git combine", "git merge", "git join", "git fuse"], answer: 1 },
    { id: "g4", question: "What does 'git push' do?", options: ["Uploads local commits to a remote repository", "Downloads remote changes", "Creates a new repository", "Deletes remote branch"], answer: 0 },
    { id: "g5", question: "What is a pull request?", options: ["A request to delete code", "A proposal to merge changes into a branch", "A bug report", "A feature request"], answer: 1 },
  ],
  TypeScript: [
    { id: "t1", question: "What does TypeScript add to JavaScript?", options: ["Faster execution", "Static type checking", "CSS support", "Database integration"], answer: 1 },
    { id: "t2", question: "How do you declare a typed variable?", options: ["var name = string", "let name: string", "string name", "name = string"], answer: 1 },
    { id: "t3", question: "What is an interface in TypeScript?", options: ["A UI component", "A contract that defines the shape of an object", "A database table", "A CSS class"], answer: 1 },
    { id: "t4", question: "What does 'tsc' do?", options: ["Runs TypeScript code", "Compiles TypeScript to JavaScript", "Tests TypeScript", "Formats TypeScript"], answer: 1 },
    { id: "t5", question: "What is a generic type?", options: ["A type that works with any data type", "A CSS style", "An error type", "A database query"], answer: 0 },
  ],
  AWS: [
    { id: "a1", question: "What does S3 stand for?", options: ["Simple Storage Service", "Secure Server System", "Simple Server Setup", "Storage Security Service"], answer: 0 },
    { id: "a2", question: "What is EC2?", options: ["A database service", "A virtual server in the cloud", "A storage bucket", "A messaging queue"], answer: 1 },
    { id: "a3", question: "What is Lambda?", options: ["A serverless compute service", "A database engine", "A load balancer", "A monitoring tool"], answer: 0 },
    { id: "a4", question: "What does IAM manage?", options: ["Network traffic", "User access and permissions", "Database connections", "File storage"], answer: 1 },
    { id: "a5", question: "What is a Region in AWS?", options: ["A programming language", "A geographical area with multiple data centers", "A type of database", "A security group"], answer: 1 },
  ],
};

// Generic fallback questions for skills not in the bank
const GENERIC_QUESTIONS: QuizQuestion[] = [
  { id: "gen1", question: "What is the primary purpose of this technology?", options: ["Building user interfaces", "Managing data", "Running servers", "It depends on the context"], answer: 3 },
  { id: "gen2", question: "Which of the following best describes this technology?", options: ["A programming language", "A framework or library", "A tool or platform", "It depends on the specific technology"], answer: 3 },
  { id: "gen3", question: "What is a common use case for this technology?", options: ["Web development", "Data analysis", "System administration", "All of the above"], answer: 3 },
  { id: "gen4", question: "How would you start learning this technology?", options: ["Read official documentation", "Build a small project", "Watch a tutorial", "All of the above are valid approaches"], answer: 3 },
  { id: "gen5", question: "What skill complements this technology well?", options: ["Problem-solving", "Debugging", "Version control with Git", "All of these are complementary"], answer: 3 },
];

/**
 * Generate quiz questions for a given skill.
 * Uses the question bank for known skills, generic questions for others.
 * Questions are shuffled deterministically per skill+seed for variety.
 */
export function generateQuiz(skillName: string, attemptNumber: number = 0): QuizQuestion[] {
  const bank = QUESTION_BANK[skillName] || GENERIC_QUESTIONS;
  // Shuffle with seed based on skill + attempt so each retry feels different
  const seed = hashString(skillName + ":" + attemptNumber);
  return seededShuffle(bank, seed).slice(0, 5);
}

/**
 * Score a quiz submission.
 * Returns { score, correct, total }.
 */
export function scoreQuiz(
  questions: QuizQuestion[],
  answers: (number | null)[]
): { score: number; correct: number; total: number } {
  const total = questions.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] === questions[i].answer) correct++;
  }
  const score = Math.round((correct / total) * 100);
  return { score, correct, total };
}

/**
 * Determine if a quiz score meets the completion threshold (70%).
 */
export function isPassingScore(score: number): boolean {
  return score >= 70;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
