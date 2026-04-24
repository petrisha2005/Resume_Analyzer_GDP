import type { AppState, ChatMessage, User } from "./types";

/**
 * Conversational AI Career Coach.
 *
 * Architecture (mirrors a real Gemini chat backend):
 *   1. Maintain full chat history (role/content/timestamp) per user.
 *   2. Build messages = [SYSTEM_PROMPT, ...history.slice(-10), userInput].
 *   3. Send to LLM, get fresh response, append, persist.
 *
 * In this offline build, the "LLM" is a deterministic-but-varied composer
 * that detects multi-label intent, resolves references ("tell me more",
 * "why", "what about X"), avoids repeating recent assistant replies, and
 * gracefully handles open-domain questions (math, definitions, greetings,
 * meta) so it behaves like a general assistant — NOT a hard-coded FAQ.
 *
 * To swap in a real Gemini call: replace `composeReply()` with a fetch to
 * your /career-chat endpoint, passing { systemPrompt: SYSTEM_PROMPT,
 * history, userInput, userContext } — everything else stays the same.
 */

// ───────────────────────────── System prompt ─────────────────────────────
export const SYSTEM_PROMPT = `
You are an intelligent AI assistant and career coach.

You can answer ANY question the user asks.

Your behavior:
- Be conversational and natural
- Answer clearly and directly
- Do NOT repeat previous answers
- Do NOT loop or reuse same explanation
- Understand the user's intent before answering
- If unclear, ask a follow-up question
- If technical, explain step-by-step
- If career-related, give guidance
- If general question, answer normally

User Context will be injected with: skills, career goal, gaps, readiness.

Adapt your response based on the question. Do not restrict yourself.
`.trim();

// ───────────────────────────── Persistence ─────────────────────────────
export function loadChatHistory(userId: string | undefined): ChatMessage[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`chat:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveChatHistory(userId: string | undefined, history: ChatMessage[]) {
  if (!userId) return;
  try { localStorage.setItem(`chat:${userId}`, JSON.stringify(history.slice(-100))); } catch { /* ignore */ }
}

export function clearChatHistory(userId: string | undefined) {
  if (!userId) return;
  try { localStorage.removeItem(`chat:${userId}`); } catch { /* ignore */ }
}

export function newMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
}

// ───────────────────────────── Public API ─────────────────────────────
export interface CoachContext {
  user: User | null;
  state: AppState;
  history: ChatMessage[];   // full prior conversation, NOT including the new user message
}

/** Profile scan result — used by click-activated chatbot */
export interface ProfileScanResult {
  resume: string;
  github: string;
  linkedin: string;
  interview: string;
  skills: string;
  readinessScore: number;
  readinessCategory: string;
  careerGoal: string;
  topGaps: string[];
  message: string;
}

/**
 * Analyze user's profile — scan all data sources and return structured summary.
 * This is the click-activated "AI Profile Analyzer" scan.
 */
export function scanUserProfile(ctx: CoachContext): ProfileScanResult {
  const { state } = ctx;
  const resumeExists = !!(state.resume?.valid);
  const githubExists = !!(state.github && !state.github.error);
  const linkedinExists = !!(state.linkedin?.valid);
  const interviewCompleted = state.interviews.length > 0;
  const skillsEntered = state.skills.length > 0;

  const result: ProfileScanResult = {
    resume: resumeExists ? "Detected" : "Not uploaded",
    github: githubExists ? "Connected" : "Not connected",
    linkedin: linkedinExists ? "Detected" : "Not connected",
    interview: interviewCompleted ? "Completed" : "Pending",
    skills: skillsEntered ? `${state.skills.length} skills added` : "Missing",
    readinessScore: state.readinessScore,
    readinessCategory: state.readinessCategory || "Not assessed",
    careerGoal: state.selectedCareer?.name || "Not selected",
    topGaps: state.gaps.slice(0, 3).map((g) => g.skill),
    message: "",
  };

  // Generate AI summary
  const strengths: string[] = [];
  const missing: string[] = [];
  if (resumeExists) strengths.push("resume uploaded");
  else missing.push("Upload your resume to begin skill analysis");
  if (githubExists) strengths.push("GitHub connected");
  else missing.push("Connect your GitHub to improve portfolio evaluation accuracy");
  if (linkedinExists) strengths.push("LinkedIn analyzed");
  else missing.push("Add your LinkedIn profile to merge experience data");
  if (interviewCompleted) strengths.push("skills verified via interview");
  else missing.push("Complete the skill interview to verify your expertise");
  if (state.selectedCareer) strengths.push(`career goal set to **${state.selectedCareer.name}**`);
  else missing.push("Select a career goal for tailored guidance");

  let msg = "";
  if (strengths.length > 0) {
    msg += `**Strengths:** ${strengths.join(", ")}.\n\n`;
  }
  if (missing.length > 0) {
    msg += `**Missing:** ${missing.join(". ")}.\n\n`;
  }
  if (state.selectedCareer) {
    msg += `Your readiness for **${state.selectedCareer.name}** is **${state.readinessScore}%** (${state.readinessCategory || "in progress"}). `;
    msg += state.gaps.length > 0
      ? `Top gaps to close: ${state.gaps.slice(0, 2).map((g) => g.skill).join(", ")}.`
      : "You're well-aligned — focus on building a strong portfolio project.";
  } else {
    msg += "Pick a career goal to get a readiness score and personalized roadmap.";
  }

  result.message = msg;
  return result;
}

export async function generateCoachReply(question: string, ctx: CoachContext): Promise<string> {
  // small artificial delay = realism
  await new Promise(r => setTimeout(r, 380 + Math.random() * 320));

  const reply = composeReply(question, ctx);

  // Anti-loop guarantee — never return EXACTLY the previous assistant message
  const lastAi = [...ctx.history].reverse().find(m => m.role === "assistant")?.content?.trim();
  if (lastAi && reply.trim() === lastAi) {
    return rephrase(reply, question);
  }
  if (!reply || !reply.trim()) {
    return "I'm not sure I followed that — could you rephrase, or give me a bit more detail?";
  }
  return reply;
}

// ═════════════════════════════════════════════════════════════════════════
//                          CORE RESPONSE COMPOSER
// ═════════════════════════════════════════════════════════════════════════

interface IntentScore { intent: string; score: number; }

function composeReply(rawQ: string, ctx: CoachContext): string {
  const q = rawQ.trim();
  const ql = q.toLowerCase();
  const { user, history } = ctx;
  void user;
  const recentAi = history.filter(m => m.role === "assistant").slice(-5).map(m => m.content);

  // ── Reference / follow-up resolution ───────────────────────────────
  // "tell me more", "why", "explain that", "and?", "go on", "ok"
  if (isFollowUp(ql)) {
    return expandOnPrevious(history, ctx, ql);
  }

  // ── Open-domain quick handlers (greeting, thanks, math, time…) ─────
  const generic = handleGeneric(q, ql, ctx);
  if (generic) return varyOpener(generic, recentAi);

  // ── Multi-label intent detection ───────────────────────────────────
  const intents = detectIntents(ql);
  if (intents.length === 0) {
    // fully open-domain → conversational answer
    return openDomainAnswer(q, ctx);
  }

  // ── Compose answer for top intent (or blend top-2) ─────────────────
  const top = intents[0].intent;
  let body = "";
  switch (top) {
    case "learn_next":      body = answerLearnNext(ctx); break;
    case "ready":           body = answerReady(ctx); break;
    case "role_fit":        body = answerRoleFit(ctx); break;
    case "my_skills":       body = answerSkills(ctx); break;
    case "gaps":            body = answerGaps(ctx); break;
    case "projects":        body = answerProjects(ctx); break;
    case "resume":          body = answerResume(ctx); break;
    case "linkedin":        body = answerLinkedIn(ctx); break;
    case "github":          body = answerGitHub(ctx); break;
    case "market":          body = answerMarket(ctx); break;
    case "future":          body = answerFuture(ctx); break;
    case "roadmap":         body = answerRoadmap(ctx); break;
    case "score":           body = answerScore(ctx); break;
    case "company":         body = answerCompanies(ctx); break;
    case "salary":          body = answerSalary(ctx); break;
    case "interview_prep":  body = answerInterviewPrep(ctx); break;
    case "explain_skill":   body = explainSkill(q, ctx); break;
    case "compare_roles":   body = compareRoles(q, ctx); break;
    case "motivation":      body = answerMotivation(ctx); break;
    case "about_bot":       body = answerAboutBot(user); break;
    default:                body = openDomainAnswer(q, ctx);
  }

  // Blend a brief mention of secondary intent if relevant
  if (intents[1] && intents[1].score >= 2 && intents[1].intent !== top) {
    const tail = miniHint(intents[1].intent, ctx);
    if (tail) body += `\n\n${tail}`;
  }

  return varyOpener(body, recentAi);
}

// ═════════════════════════════════════════════════════════════════════════
//                            INTENT DETECTION
// ═════════════════════════════════════════════════════════════════════════

const INTENT_PATTERNS: Array<{ intent: string; patterns: RegExp[]; weight?: number }> = [
  { intent: "learn_next",     patterns: [/\b(what|which).*(learn|study|focus)\b/, /\blearn next\b/, /\bnext (step|skill|topic)\b/, /\bwhere (do|should) i start\b/, /\bhow do i (start|begin)\b/] },
  { intent: "ready",          patterns: [/\b(am i|are we) ready\b/, /\bready (for|to)\b.*\b(intern|job|placement|apply|interview)\b/, /\bcan i apply\b/] },
  { intent: "role_fit",       patterns: [/\bwhich role\b/, /\bwhat role\b/, /\bbest role\b/, /\bsuits? me\b/, /\bcareer fit\b/, /\bwhat (job|career) (should|can) i\b/] },
  { intent: "my_skills",      patterns: [/\bmy (skills|strengths)\b/, /\bstrong skills\b/, /\bgood at\b/, /\bwhat am i good\b/] },
  { intent: "gaps",           patterns: [/\b(my )?gaps?\b/, /\bweak(ness)?\b/, /\bwhat.*missing\b/, /\bwhat.*improve\b/, /\bwhere.*lacking\b/] },
  { intent: "projects",       patterns: [/\bproject ideas?\b/, /\bbuild (a|something|me)\b/, /\bportfolio project\b/, /\bwhat.*build\b/, /\bsuggest.*project\b/] },
  { intent: "resume",         patterns: [/\bresume\b/, /\bcv\b/, /\bats\b/] },
  { intent: "linkedin",       patterns: [/\blinkedin\b/, /\bprofile\b/] },
  { intent: "github",         patterns: [/\bgithub\b/, /\brepo(s|sitor)?\b/, /\bportfolio (page|score)\b/] },
  { intent: "market",         patterns: [/\b(market|demand|hiring|trend|hot|popular|in[- ]demand)\b/] },
  { intent: "future",         patterns: [/\bfuture (skill|tech)\b/, /\b(emerging|trending|next.gen|tomorrow)\b/, /\bwhat.*coming\b/] },
  { intent: "roadmap",        patterns: [/\broadmap\b/, /\bplan (for|to)\b/, /\bweek by week\b/, /\bschedule\b/] },
  { intent: "score",          patterns: [/\b(my )?(score|readiness|rating|level)\b/, /\bhow (good|ready) am i\b/] },
  { intent: "company",        patterns: [/\bwhich compan(y|ies)\b/, /\b(google|amazon|microsoft|faang|startup|mnc)\b/, /\bwhere (can|should) i apply\b/] },
  { intent: "salary",         patterns: [/\bsalary\b/, /\bpackage\b/, /\bctc\b/, /\bhow much.*(earn|pay)\b/, /\b(lpa|inr|usd)\b/] },
  { intent: "interview_prep", patterns: [/\binterview prep\b/, /\bcrack interview\b/, /\bdsa\b/, /\bcoding (round|interview)\b/, /\bsystem design\b/, /\bhr round\b/] },
  { intent: "explain_skill",  patterns: [/\bexplain\b/, /\bwhat is\b/, /\bwhat are\b/, /\bdefine\b/, /\btell me about\b/, /\bhow does\b.*\bwork\b/] },
  { intent: "compare_roles",  patterns: [/\b(vs|versus|compare|difference between|or)\b/, /\bwhich is better\b/] },
  { intent: "motivation",     patterns: [/\bdemotivat\w*\b/, /\bgive up\b/, /\bquit\b/, /\bstuck\b/, /\bfeel(ing)? (lost|down|stressed|overwhelm)\b/, /\bnot good enough\b/, /\bcan('?| no)t do\b/] },
  { intent: "about_bot",      patterns: [/\bwho are you\b/, /\bwhat are you\b/, /\bwhat can you do\b/, /\byour name\b/] },
];

function detectIntents(ql: string): IntentScore[] {
  const scores = new Map<string, number>();
  for (const { intent, patterns, weight = 1 } of INTENT_PATTERNS) {
    for (const p of patterns) {
      if (p.test(ql)) scores.set(intent, (scores.get(intent) || 0) + 2 * weight);
    }
  }
  return Array.from(scores.entries())
    .map(([intent, score]) => ({ intent, score }))
    .sort((a, b) => b.score - a.score);
}

// ═════════════════════════════════════════════════════════════════════════
//                         FOLLOW-UP / REFERENCE
// ═════════════════════════════════════════════════════════════════════════

function isFollowUp(ql: string): boolean {
  if (ql.length > 60) return false;
  return (
    /^(tell me more|more|go on|continue|and\??|then\??|why\??|how\??|really\??|ok|okay|sure|got it|hmm|interesting|explain( that| more)?|elaborate|expand|details?)$/.test(ql) ||
    /^(what about|how about|and what about)\b/.test(ql) ||
    /^(yes|no|maybe)\b/.test(ql) && ql.length < 25
  );
}

function expandOnPrevious(history: ChatMessage[], ctx: CoachContext, ql: string): string {
  const lastAi = [...history].reverse().find(m => m.role === "assistant");
  const lastUser = [...history].reverse().find(m => m.role === "user");
  if (!lastAi || !lastUser) {
    return "Sure — what would you like me to dig into? Your skills, gaps, a specific project idea, or career roles?";
  }

  // "what about X" → treat as new question
  const aboutMatch = ql.match(/^(?:what|how) about (.+)/);
  if (aboutMatch) {
    return composeReply(aboutMatch[1], { ...ctx, history });
  }

  // "why" → give reasoning for previous answer
  if (/^why/.test(ql)) {
    return reasonFor(lastAi.content, ctx);
  }

  // "more" / "elaborate" → deepen previous topic
  const intents = detectIntents(lastUser.content.toLowerCase());
  if (intents.length) {
    const deeper = composeReply(lastUser.content, { ...ctx, history });
    // Make it feel like a continuation
    return `Sure — to add to that:\n\n${deeper}`;
  }

  return "Could you give me a bit more detail on what you'd like to explore? For example: a specific skill, role, or next step?";
}

function reasonFor(prevAnswer: string, ctx: CoachContext): string {
  const role = ctx.state.selectedCareer?.name || "your target role";
  const score = ctx.state.readinessScore;
  if (/internship|ready|apply/i.test(prevAnswer)) {
    return `Because readiness combines two things: how many of the **${role}** core skills you have *verified* (not just listed), and the depth of usage shown in your projects. At **${score}%**, the gap is mostly in fewer-than-required core skills — so building one focused project closes the gap quickly.`;
  }
  if (/learn|focus|gap/i.test(prevAnswer)) {
    const top = ctx.state.gaps[0]?.skill;
    return top
      ? `Because **${top}** appears in nearly every ${role} job description and unlocks several adjacent skills. Filling it has the highest leverage for your time.`
      : `Because the recommendations are ranked by impact-per-hour: each suggested skill either appears in many ${role} job posts or unblocks 2–3 other skills you'd otherwise have to learn separately.`;
  }
  return `The reasoning comes from comparing your verified skill profile against ${role} requirements and current market signals — that's what drives every recommendation you see.`;
}

// ═════════════════════════════════════════════════════════════════════════
//                      OPEN-DOMAIN / GENERIC HANDLERS
// ═════════════════════════════════════════════════════════════════════════

function handleGeneric(q: string, ql: string, ctx: CoachContext): string | null {
  // Greetings
  if (/^(hi|hey|hello|yo|hola|namaste|sup|good (morning|afternoon|evening))\b/.test(ql)) {
    const name = ctx.user?.name?.split(" ")[0];
    const greetings = [
      `Hey${name ? ` ${name}` : ""}! 👋 What's on your mind today?`,
      `Hi${name ? ` ${name}` : ""}! Ready to dig into your career plan, or do you have a different question?`,
      `Hello! I can help with skills, projects, interviews, or just general questions — what would you like to talk about?`,
    ];
    return pick(greetings);
  }

  // Thanks
  if (/^(thanks|thank you|thx|ty|cool|nice|awesome|great)\b/.test(ql) && ql.length < 30) {
    return pick([
      "Anytime! 🙌 What's the next thing you want to tackle?",
      "Glad that helped. Anything else you'd like to explore?",
      "You got it. Ping me whenever you want to dig deeper.",
    ]);
  }

  // Bye
  if (/^(bye|goodbye|see ya|cya|later)\b/.test(ql)) {
    return pick([
      "Catch you later — keep building! 🚀",
      "See you! Remember: small daily progress > big sporadic effort.",
      "Bye! Come back anytime you want to recheck your roadmap.",
    ]);
  }

  // How are you
  if (/\bhow are you\b|\bhow's it going\b|\bhow r u\b/.test(ql)) {
    return "I'm doing great, thanks for asking! More importantly — how are *you* feeling about your progress lately?";
  }

  // Time / date
  if (/\bwhat (time|date) is it\b|\bcurrent (time|date)\b/.test(ql)) {
    const now = new Date();
    return `It's ${now.toLocaleString()} on your device. Setting a daily 30-minute learning slot at the same time works wonders, by the way.`;
  }

  // Simple math
  const math = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*([+\-*/x])\s*(-?\d+(?:\.\d+)?)\s*=?\s*\??\s*$/);
  if (math) {
    const a = parseFloat(math[1]);
    const b = parseFloat(math[3]);
    let r: number | string = "?";
    switch (math[2]) {
      case "+": r = a + b; break;
      case "-": r = a - b; break;
      case "*": case "x": r = a * b; break;
      case "/": r = b === 0 ? "undefined (division by zero)" : a / b; break;
    }
    return `${a} ${math[2]} ${b} = **${r}**`;
  }

  // Joke
  if (/\b(joke|funny|make me laugh)\b/.test(ql)) {
    return pick([
      "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
      "I'd tell you a UDP joke, but you might not get it. 📡",
      "There are 10 types of people: those who understand binary, and those who don't.",
    ]);
  }

  // Empty/very short
  if (q.length < 2) {
    return "I'm listening — type your question and I'll do my best!";
  }

  return null;
}

function openDomainAnswer(q: string, ctx: CoachContext): string {
  // No specific intent detected — give a thoughtful, conversational reply
  // that invites the user to clarify, while still being useful.
  const role = ctx.state.selectedCareer?.name;
  const fallbacks = [
    `That's an interesting one. I can take a stab at it, but I'm best when the question is concrete — for example: "How do I learn ${ctx.state.gaps[0]?.skill || "SQL"}?", "Which role suits me?", or "Give me a project for ${role || "my goal"}". What's the story behind your question?`,
    `Good question. Could you tell me a bit more about *why* you're asking? Context helps me give a sharper answer than a generic one.`,
    `I can help with that. To make sure I answer the right thing — are you asking from a learning angle, a career angle, or a project angle?`,
    `Hmm, let me think. Could you rephrase or give an example of what a great answer would look like? I want to be genuinely useful, not generic.`,
  ];
  // Pick based on question length to feel less random
  return fallbacks[q.length % fallbacks.length];
}

// ═════════════════════════════════════════════════════════════════════════
//                    INTENT-SPECIFIC ANSWER GENERATORS
//          Each returns a body string. Openers are added later.
// ═════════════════════════════════════════════════════════════════════════

function answerLearnNext(ctx: CoachContext): string {
  const role = ctx.state.selectedCareer?.name;
  if (!role) {
    return "First, head to **Career** and pick a target role — that anchors every recommendation. Once it's set, I'll point you to the highest-impact skill to learn next.";
  }
  const gaps = ctx.state.gaps.slice(0, 3).map(g => g.skill);
  if (gaps.length === 0) {
    const futures = ctx.state.futureSkills.slice(0, 3);
    return `You're well-aligned with **${role}** already. To stay ahead, pick up one emerging skill — ${futures.join(", ") || "something adjacent to your core stack"} — and ship a project that uses it alongside your strongest existing skill.`;
  }
  const lines = gaps.map((g, i) => `${i + 1}. **${g}** — high leverage; appears in most ${role} requirements.`);
  return `Based on your **${role}** goal, here's the order I'd tackle things:\n\n${lines.join("\n")}\n\nStart with **${gaps[0]}**: do a 30-minute crash tutorial today, then build a tiny project using it within the week. Verify it via the Skill Interview when you feel comfortable.`;
}

function answerReady(ctx: CoachContext): string {
  const score = ctx.state.readinessScore;
  const role = ctx.state.selectedCareer?.name || "your goal";
  const topGaps = ctx.state.gaps.slice(0, 2).map(g => g.skill);
  if (score >= 80) return `Yes — at **${score}%** readiness you're in solid shape for ${role} roles. Apply now. While you wait for callbacks, polish: ${topGaps.join(", ") || "interview answers and one signature project"}.`;
  if (score >= 60) return `You're at **${score}%** — good enough to start applying for internships and junior ${role} roles. To improve odds at top companies, close these first: ${topGaps.join(", ") || "your top 2 gaps"}. Aim for 75%+ before targeting selective programs.`;
  if (score >= 40) return `You're at **${score}%** — early but recoverable. Spend 4–6 weeks focused on ${topGaps.join(" and ") || "your top gaps"}, then re-verify through the interview. You could be ready for internship season after that.`;
  return `Your readiness is **${score}%**, which means we're at the foundation stage. Don't worry — that's normal early on. Pick the top gap (${topGaps[0] || "core fundamentals"}), dedicate 1 hour/day for 30 days, and you'll see the score climb meaningfully.`;
}

function answerRoleFit(ctx: CoachContext): string {
  const matches = ctx.state.jobMatches.slice(0, 3);
  if (matches.length === 0) {
    return "I don't have role-match data yet. Verify a few skills via the **Interview** page, then I can rank the top-3 roles that fit your profile with match scores.";
  }
  const lines = matches.map((m, i) => `${i + 1}. **${m.roleName}** — ${m.matchPercent}% match (${m.matchedSkills.length} matched, ${m.missingSkills.length} missing)`);
  const best = matches[0];
  return `Here are your top role matches right now:\n\n${lines.join("\n")}\n\n**${best.roleName}** is your strongest fit. ${best.missingSkills.length > 0 ? `To push it higher, focus on: ${best.missingSkills.slice(0, 3).join(", ")}.` : "You're well-aligned — start applying."}`;
}

function answerSkills(ctx: CoachContext): string {
  const strong = ctx.state.skills.filter(s => s.verification === "Strong").map(s => s.name);
  const basic = ctx.state.skills.filter(s => s.verification === "Basic").map(s => s.name);
  if (strong.length === 0 && basic.length === 0) {
    return "You haven't verified any skills yet. The **Interview** page asks one beginner-friendly question per skill — takes ~5 minutes and unlocks accurate guidance from then on.";
  }
  let out = "";
  if (strong.length) out += `**Strong (verified):** ${strong.slice(0, 6).join(", ")}${strong.length > 6 ? ` (+${strong.length - 6} more)` : ""}\n`;
  if (basic.length) out += `**Basic:** ${basic.slice(0, 6).join(", ")}${basic.length > 6 ? ` (+${basic.length - 6} more)` : ""}\n`;
  out += `\nLead with your strong skills on your resume bullets and LinkedIn headline — they're your differentiators.`;
  return out;
}

function answerGaps(ctx: CoachContext): string {
  const gaps = ctx.state.gaps;
  const role = ctx.state.selectedCareer?.name || "your goal";
  if (gaps.length === 0) {
    return `No major gaps detected for ${role} 🎯. Now it's about depth: build one substantial project that combines 3–4 of your strongest skills. That's what differentiates you in interviews.`;
  }
  const lines = gaps.slice(0, 5).map((g, i) => `${i + 1}. **${g.skill}**${g.priority ? ` — ${g.priority} priority` : ""}`);
  return `Your top gaps for **${role}**:\n\n${lines.join("\n")}\n\nThe **Roadmap** breaks each one into weekly milestones. Tackle them in order — earlier gaps usually unblock later ones.`;
}

function answerProjects(ctx: CoachContext): string {
  const projects = ctx.state.projectIdeas.slice(0, 3);
  if (projects.length === 0) {
    return "Once you've picked a career goal and verified some skills, I'll generate 3–4 portfolio projects matched to your gaps — each with tech stack and difficulty. Head to **Career** first if you haven't.";
  }
  const lines = projects.map((p, i) => `${i + 1}. **${p.title}** _(${p.difficulty})_ — ${p.description}\n   Stack: ${p.techStack.join(", ")}`);
  return `Here are project ideas tuned to your profile:\n\n${lines.join("\n\n")}\n\nPick whichever excites you most — momentum matters more than the "perfect" choice.`;
}

function answerResume(ctx: CoachContext): string {
  const ats = ctx.state.atsScore;
  if (!ats) return "Upload your resume on the **Resume** page — I'll score it on ATS-readiness (keywords, format, skill density) and give you specific fixes.";
  let out = `Your resume's ATS score is **${ats.score}/100**.\n\nBreakdown:\n• Keyword match: ${ats.keywordScore}/100\n• Formatting: ${ats.formattingScore}/100\n• Skill relevance: ${ats.relevanceScore}/100`;
  if (ats.tips.length) out += `\n\n**Top fixes:**\n${ats.tips.slice(0, 3).map(t => `• ${t}`).join("\n")}`;
  return out;
}

function answerLinkedIn(ctx: CoachContext): string {
  if (ctx.state.linkedin?.valid) {
    const skillsCount = ctx.state.linkedin.skills.length;
    const role = ctx.state.selectedCareer?.name;
    return `I've merged ${skillsCount} skills from your LinkedIn into your profile. Two quick wins: (1) make your **headline** explicitly mention "${role || "your target role"}", and (2) add your strongest project to the **Featured** section — it's the first thing recruiters click.`;
  }
  return "Paste your LinkedIn profile text on the **LinkedIn** page — I'll extract your experience and skills and merge them with your resume + GitHub data for a richer profile.";
}

function answerGitHub(ctx: CoachContext): string {
  const ps = ctx.state.portfolioStrength;
  if (!ps) return "Connect your GitHub username on the **GitHub** page. I'll go beyond a tech-stack list — I evaluate repo quality, README depth, project diversity, and consistency to give you a Portfolio Strength score.";
  let out = `Your GitHub Portfolio Strength is **${ps.score}/100**.\n\nBreakdown:\n• Repo quality: ${ps.repoQuality}/100\n• README depth: ${ps.readmeQuality}/100\n• Diversity: ${ps.diversity}/100\n• Consistency: ${ps.consistency}/100`;
  if (ps.feedback.length) out += `\n\n**To improve:**\n${ps.feedback.slice(0, 3).map(f => `• ${f}`).join("\n")}`;
  return out;
}

function answerMarket(ctx: CoachContext): string {
  const high = ctx.state.marketDemand.filter(m => m.demand === "High").slice(0, 4).map(m => m.skill);
  const low = ctx.state.marketDemand.filter(m => m.demand === "Low").slice(0, 2).map(m => m.skill);
  if (!high.length && !low.length) return "Add a few skills via Resume or GitHub first — then I can map each one to current market demand (High 🔥 / Medium ⚡ / Low 📉).";
  let out = "";
  if (high.length) out += `🔥 **High demand in your stack:** ${high.join(", ")}\n`;
  if (low.length) out += `📉 **Lower demand (de-emphasize):** ${low.join(", ")}\n`;
  out += `\nLean into your high-demand skills in resume bullets and project pitches — that's where recruiters scan first.`;
  return out;
}

function answerFuture(ctx: CoachContext): string {
  const futures = ctx.state.futureSkills.slice(0, 5);
  if (!futures.length) return "Pick a career goal first — then I'll predict 5 emerging skills for that role over the next 12–18 months.";
  return `Top emerging skills for **${ctx.state.selectedCareer?.name}** (next 12–18 months):\n\n${futures.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nYou don't need all of them — picking 1–2 to learn alongside your core stack gives you a real edge.`;
}

function answerRoadmap(ctx: CoachContext): string {
  const steps = ctx.state.roadmap.slice(0, 4);
  if (!steps.length) return "Your roadmap will appear once you've selected a career and verified some skills. Visit **Career** → **Interview** → **Dashboard**.";
  const lines = steps.map(s => `**Step ${s.step}** _(${s.durationWeeks}w)_: ${s.title} — ${s.description}`);
  return `Your next ${steps.length} steps:\n\n${lines.join("\n\n")}\n\nFull plan with resources is on the **Dashboard → Roadmap** section.`;
}

function answerScore(ctx: CoachContext): string {
  const s = ctx.state.readinessScore;
  const cat = ctx.state.readinessCategory || "in progress";
  const bar = "▓".repeat(Math.round(s / 5)) + "░".repeat(20 - Math.round(s / 5));
  return `Your career readiness is **${s}%** (${cat}).\n\n\`${bar}\`\n\nThis combines verified skill coverage and depth-of-usage from your projects. Each Strong-verified skill that closes a gap typically adds 5–10 points.`;
}

function answerCompanies(ctx: CoachContext): string {
  const role = ctx.state.selectedCareer?.name || "your target role";
  const score = ctx.state.readinessScore;
  if (score >= 75) {
    return `At your level, target a mix:\n• **Top product companies** (FAANG-tier): apply, but expect rigorous interviews — start prep 6–8 weeks ahead.\n• **High-growth startups**: faster process, more ownership, great learning.\n• **Tier-2 product cos**: high acceptance rate at your skill level — good for first job.\n\nFor ${role}, prioritize companies where the role title actually matches — generic "Software Engineer" listings often don't use your specialized skills.`;
  }
  return `For ${role} at **${score}%** readiness, I'd target:\n• **Early-stage startups** (10–50 people): they need generalists and you'll learn fast.\n• **Internships at any size** (paid or unpaid): the title matters less than the experience.\n• **Open-source contributions**: doubles as resume + network.\n\nAvoid spending months on FAANG prep right now — get one job under your belt first.`;
}

function answerSalary(ctx: CoachContext): string {
  const role = ctx.state.selectedCareer?.name;
  return `Salary depends heavily on location, company stage, and your interview performance — I can't quote exact numbers reliably. What I *can* say: for **${role || "tech roles"}**, the strongest lever on offers is verifiable project work + clear communication in interviews. A candidate with 1 great shipped project routinely out-earns one with 5 half-finished ones. Levels.fyi and Glassdoor are good real-data references.`;
}

function answerInterviewPrep(ctx: CoachContext): string {
  const role = ctx.state.selectedCareer?.name || "your target role";
  return `For **${role}** interviews, prep usually has 3 layers:\n\n1. **Fundamentals** — DSA (arrays, strings, hashmaps, trees, basic DP). 30–50 problems on LeetCode covers most.\n2. **Role-specific** — system design basics for backend/full-stack; ML concepts for AI roles; design critiques for UI/UX.\n3. **Behavioral** — 5 stories using the STAR format covering teamwork, conflict, ownership, learning, failure.\n\nStart with #1 (60% of prep time), then #2 (30%), then #3 (10%). Mock interviews on Pramp/Interviewing.io are worth their weight in gold.`;
}

function explainSkill(q: string, ctx: CoachContext): string {
  // Extract the noun phrase after "what is", "explain", "tell me about"
  const m = q.match(/(?:what (?:is|are)|explain|define|tell me about|how does)\s+(?:a\s+|an\s+|the\s+)?([^.?!]+)/i);
  const topic = m?.[1]?.trim().replace(/\?+$/, "") || "that topic";

  // Built-in mini-glossary for common skills
  const glossary: Record<string, string> = {
    "react": "React is a JavaScript library for building user interfaces using reusable components. You declare *what* the UI should look like for a given state, and React handles the DOM updates efficiently.",
    "node.js": "Node.js lets you run JavaScript outside the browser — typically for backend servers, APIs, and CLIs. It's event-driven and non-blocking, which makes it great for I/O-heavy apps.",
    "python": "Python is a general-purpose, readable programming language. It's the default choice for data science, ML, scripting, and backend (via FastAPI/Django).",
    "sql": "SQL (Structured Query Language) is how you talk to relational databases — querying, inserting, updating, joining tables. Core skill for nearly every backend/data role.",
    "rest api": "A REST API exposes data and actions over HTTP using URLs (resources) and verbs (GET/POST/PUT/DELETE). Stateless, predictable, and the most common way services talk to each other.",
    "docker": "Docker packages your app + its dependencies into a portable container so it runs the same way on your laptop, in CI, and in production.",
    "kubernetes": "Kubernetes orchestrates containers across many machines — scheduling, scaling, restarting, and networking them. Standard for large-scale deployments.",
    "git": "Git tracks changes to your code over time and lets multiple people work on the same project without overwriting each other. Branches + pull requests are the everyday workflow.",
    "machine learning": "Machine learning teaches computers to find patterns in data instead of being explicitly programmed. You feed examples in, and the model learns to predict on new examples.",
    "deep learning": "Deep learning is ML with multi-layered neural networks. It powers modern image recognition, language models, and most of what people call 'AI' today.",
    "llm": "An LLM (Large Language Model) is a neural network trained on huge text corpora to predict the next token. Tools like ChatGPT and Gemini are LLMs wrapped in a chat interface.",
    "rag": "RAG (Retrieval-Augmented Generation) gives an LLM access to your own documents at query time — retrieve relevant chunks, then generate an answer grounded in them. Reduces hallucinations.",
    "tailwind": "Tailwind CSS is a utility-first CSS framework — instead of writing custom CSS, you compose styles with small classes like `flex p-4 text-white`. Faster iteration, consistent design.",
    "typescript": "TypeScript is JavaScript with types. The types catch bugs at compile time and make large codebases far easier to navigate.",
    "fastapi": "FastAPI is a modern Python web framework for building APIs quickly, with automatic validation and docs from Python type hints.",
    "mongodb": "MongoDB is a document database — instead of rows in tables, you store flexible JSON-like documents. Great when your schema evolves.",
  };

  const key = topic.toLowerCase();
  const direct = glossary[key] ?? glossary[key.replace(/\.js$/, "").trim()];
  if (direct) {
    return `${direct}\n\nIn the context of **${ctx.state.selectedCareer?.name || "your goal"}**, this is${ctx.state.skills.find(s => s.name.toLowerCase() === key) ? " already in your skill set — focus on going deeper." : " worth at least basic familiarity."}`;
  }

  // Generic explanation scaffold
  return `Here's a quick take on **${topic}**:\n\nIt's a concept/tool you'll see often in tech contexts. To learn it well, I'd suggest: (1) read a 5-minute overview, (2) build the simplest possible example yourself, (3) explain it back in your own words. If you tell me the specific angle you care about (use case, comparison, learning path), I can give a sharper answer.`;
}

function compareRoles(q: string, ctx: CoachContext): string {
  // Try to find two role names mentioned
  const roles = ctx.state.skills.length ? [] : []; // placeholder unused
  void roles;
  const all = ["data scientist", "data analyst", "ml engineer", "ai engineer", "frontend", "backend", "full stack", "devops", "cloud", "cybersecurity", "ui/ux", "product manager", "mobile"];
  const found = all.filter(r => q.toLowerCase().includes(r));
  if (found.length >= 2) {
    return `**${cap(found[0])}** vs **${cap(found[1])}** — quick contrast:\n\n• **Day-to-day**: ${roleDaily(found[0])} vs ${roleDaily(found[1])}\n• **Core skills**: ${roleSkills(found[0])} vs ${roleSkills(found[1])}\n• **Best fit if you like**: ${roleFit(found[0])} vs ${roleFit(found[1])}\n\nGiven your profile, the one closer to **${ctx.state.selectedCareer?.name || "your selected goal"}** is the safer bet — you've already invested in adjacent skills.`;
  }
  return `To compare roles meaningfully, name the two you're weighing — e.g. *"Data Scientist vs ML Engineer"* or *"Frontend vs Full Stack"*. I'll break down day-to-day, skills, and fit.`;
}

function answerMotivation(_ctx: CoachContext): string {
  return pick([
    "Hey — that feeling is more common than people admit, especially in tech where the surface area looks infinite. Here's the truth: nobody knows everything, and the people who *seem* to are just confidently working in their narrow slice. Pick **one** thing this week. Just one. Ship it. Repeat. Momentum beats motivation.",
    "I hear you. When everything feels overwhelming, shrink the goal until it's silly-small — like \"open VS Code and write 10 lines.\" Once you start, continuing is easy. The hard part is always the first 5 minutes. You're doing better than you think.",
    "Let's reframe: feeling stuck usually means you're at the edge of your current skill, not that you're failing. That edge is exactly where growth happens. What's one tiny thing you could finish in the next 30 minutes? Start there, not at the mountain.",
  ]);
}

function answerAboutBot(user: User | null): string {
  return `I'm your AI Career Coach, built into SkillIQ${user?.name ? `, ${user.name.split(" ")[0]}` : ""}. I can answer **any** question — career-related or general — and I'm grounded in *your* live profile: skills, gaps, GitHub, resume, LinkedIn, and target role. Ask me anything from "what should I learn next?" to "explain RAG" to "I feel stuck."`;
}

// ═════════════════════════════════════════════════════════════════════════
//                              HELPERS
// ═════════════════════════════════════════════════════════════════════════

function miniHint(intent: string, ctx: CoachContext): string | null {
  switch (intent) {
    case "projects":  return ctx.state.projectIdeas[0] ? `_PS — if you want a project to apply this to, try "${ctx.state.projectIdeas[0].title}"._` : null;
    case "resume":    return ctx.state.atsScore ? `_PS — your resume's ATS score is ${ctx.state.atsScore.score}/100._` : null;
    case "github":    return ctx.state.portfolioStrength ? `_PS — your GitHub Portfolio Strength is ${ctx.state.portfolioStrength.score}/100._` : null;
    case "market":    return null;
    default:          return null;
  }
}

function varyOpener(body: string, recentAi: string[]): string {
  // Avoid starting with the same opener used recently. Add a varied lead-in
  // ONLY if the body doesn't already start with a personal/conversational word.
  const startsConversational = /^(hey|hi|hello|sure|great|good|got it|okay|alright|absolutely|here|let me|i |you|your|that's|happy|nice)/i.test(body);
  if (startsConversational) return body;

  const openers = [
    "", "", "", // most of the time, no opener (cleaner)
    "Got it — ",
    "Sure thing. ",
    "Alright, ",
    "Here's my take: ",
    "Happy to help. ",
  ];
  // pick one that doesn't match the start of a recent assistant msg
  const fresh = openers.filter(o => !recentAi.some(r => o && r.startsWith(o.trim())));
  const chosen = (fresh.length ? pick(fresh) : "");
  return chosen + body;
}

function rephrase(text: string, _q: string): string {
  // Very light rephrase to break exact duplicates
  return `Let me put it differently: ${text}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cap(s: string): string {
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function roleDaily(role: string): string {
  const m: Record<string, string> = {
    "data scientist": "exploring data, building models, telling stories with numbers",
    "data analyst": "writing SQL, building dashboards, answering business questions",
    "ml engineer": "putting models in production, MLOps, scaling inference",
    "ai engineer": "building LLM-powered apps, RAG, agentic workflows",
    "frontend": "crafting UI, animations, performance, design systems",
    "backend": "designing APIs, databases, business logic, scaling",
    "full stack": "owning a feature end-to-end (UI + API + DB)",
    "devops": "CI/CD, infrastructure-as-code, observability, reliability",
    "cloud": "designing cloud architectures, cost, security, networking",
    "cybersecurity": "threat analysis, pentesting, hardening systems",
    "ui/ux": "user research, wireframes, prototypes, design systems",
    "product manager": "prioritizing roadmap, talking to users, writing specs",
    "mobile": "shipping native/cross-platform apps to App Store / Play Store",
  };
  return m[role] || "varied technical work";
}

function roleSkills(role: string): string {
  const m: Record<string, string> = {
    "data scientist": "Python, stats, ML, SQL, viz",
    "data analyst": "SQL, Excel, BI tools, basic Python",
    "ml engineer": "Python, ML frameworks, Docker, cloud",
    "ai engineer": "Python, LLM APIs, vector DBs, prompt engineering",
    "frontend": "JS/TS, React, CSS, accessibility",
    "backend": "a backend lang, DBs, REST/GraphQL, caching",
    "full stack": "frontend + backend + a touch of DevOps",
    "devops": "Linux, Docker, K8s, Terraform, a cloud",
    "cloud": "deep AWS/GCP/Azure, networking, IAM",
    "cybersecurity": "networking, OS internals, scripting, security tools",
    "ui/ux": "Figma, design principles, user research",
    "product manager": "communication, analytics, prioritization frameworks",
    "mobile": "Swift/Kotlin or React Native/Flutter",
  };
  return m[role] || "varied stack";
}

function roleFit(role: string): string {
  const m: Record<string, string> = {
    "data scientist": "research and ambiguity",
    "data analyst": "answering business questions quickly",
    "ml engineer": "building robust production systems",
    "ai engineer": "the bleeding edge of LLMs/agents",
    "frontend": "visual craft and interaction design",
    "backend": "systems thinking and data modeling",
    "full stack": "ownership and breadth",
    "devops": "automation and reliability",
    "cloud": "architecture and tradeoffs",
    "cybersecurity": "defense, puzzles, and ethics",
    "ui/ux": "empathy and visual communication",
    "product manager": "strategy and people",
    "mobile": "polished consumer experiences",
  };
  return m[role] || "varied work";
}
