import { useEffect, useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import {
  generateCoachReply, loadChatHistory, saveChatHistory,
  clearChatHistory, newMessage, scanUserProfile,
} from "../lib/chatService";
import type { ChatMessage } from "../lib/types";

/** Click-Activated AI Profile Analyzer Chatbot.
 *  Default state: small floating button (bottom-right).
 *  On click: opens chat window + runs immediate profile scan.
 *  After scan: switches to free-form ChatGPT mode. */

const ACTION_BUTTONS = [
  { label: "🔍 Scan Full Profile",    action: "scan" },
  { label: "⚠️ Check Missing Sections", action: "missing" },
  { label: "📄 Evaluate Resume",      action: "resume" },
  { label: "💻 Evaluate GitHub",      action: "github" },
  { label: "🔗 Evaluate LinkedIn",    action: "linkedin" },
  { label: "🎤 Interview Readiness",   action: "interview" },
  { label: "💡 Improvement Suggestions", action: "suggestions" },
];

export default function FloatingChatbot() {
  const ctx = useApp();
  const { user } = ctx;

  const [open, setOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history when opening
  useEffect(() => {
    if (!user || !open) return;
    const loaded = loadChatHistory(`floating:${user.id}`);
    if (loaded.length === 0) {
      // First open — run the profile scan immediately
      performScan();
    } else {
      setChatHistory(loaded);
      setScanned(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory, busy]);

  // ── Profile Scan (runs on first activation) ─────────────────────────
  async function performScan() {
    setBusy(true);
    setScanned(false);

    // Build scan messages
    const scanMsgs: ChatMessage[] = [];
    scanMsgs.push(newMessage("assistant", "🤖 **AI Profile Analyzer Activated**\n\nScanning your profile..."));

    // Simulate step-by-step scanning
    await delay(400);

    const profile = scanUserProfile({ user, state: ctx, history: [] });

    // Build structured result
    let result = "📊 **Profile Scan Results**\n\n";
    result += `📄 Resume: **${profile.resume}**\n`;
    result += `💻 GitHub: **${profile.github}**\n`;
    result += `🔗 LinkedIn: **${profile.linkedin}**\n`;
    result += `🎤 Interview: **${profile.interview}**\n`;
    result += `🧠 Skills: **${profile.skills}**\n`;
    result += `🎯 Career Goal: **${profile.careerGoal}**\n`;
    result += `📈 Readiness: **${profile.readinessScore}%** (${profile.readinessCategory})\n`;

    if (profile.topGaps.length > 0) {
      result += `\n⚠️ Top gaps: ${profile.topGaps.join(", ")}`;
    }

    result += `\n\n${profile.message}`;
    result += `\n\n_You can now ask me anything — career advice, skills, projects, or general questions._`;

    scanMsgs.push(newMessage("assistant", result));
    setChatHistory(scanMsgs);
    saveChatHistory(`floating:${user?.id}`, scanMsgs);
    setScanned(true);
    setBusy(false);
  }

  // ── Send message (free chat mode) ───────────────────────────────────
  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || !user) return;

    const priorHistory = chatHistory;
    const userMsg = newMessage("user", q);
    const afterUser = [...priorHistory, userMsg];
    setChatHistory(afterUser);
    saveChatHistory(`floating:${user.id}`, afterUser);
    setInput("");
    setBusy(true);

    try {
      // Handle action button shortcuts
      if (q.startsWith("action:")) {
        const action = q.replace("action:", "");
        const reply = handleQuickAction(action, ctx);
        const aiMsg = newMessage("assistant", reply);
        const finalHist = [...afterUser, aiMsg];
        setChatHistory(finalHist);
        saveChatHistory(`floating:${user.id}`, finalHist);
        setBusy(false);
        return;
      }

      const reply = await generateCoachReply(q, {
        user,
        state: ctx,
        history: priorHistory,
      });
      const aiMsg = newMessage("assistant", reply);
      const finalHist = [...afterUser, aiMsg];
      setChatHistory(finalHist);
      saveChatHistory(`floating:${user.id}`, finalHist);
    } catch (err) {
      const errMsg = newMessage("assistant", "⚠️ Something went wrong. Try rephrasing?");
      setChatHistory([...afterUser, errMsg]);
      saveChatHistory(`floating:${user.id}`, [...afterUser, errMsg]);
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (!confirm("Clear chat history?")) return;
    clearChatHistory(`floating:${user?.id}`);
    setChatHistory([]);
    setScanned(false);
  }

  function close() {
    setOpen(false);
    setChatHistory([]);
    setScanned(false);
  }

  if (!user) return null; // hidden for guests

  return (
    <>
      {/* Floating button (always visible when closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <span className="text-lg">🧠</span>
          AI Profile Analyzer
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[92vw] h-[520px] max-h-[80vh] rounded-2xl border border-white/10 bg-[#0f1328] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-sm">🧠</div>
              <div>
                <div className="text-sm font-semibold">AI Profile Analyzer</div>
                <div className="text-[10px] text-white/50">Click-activated · Context-aware</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatHistory.length > 0 && (
                <button onClick={clear} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 text-xs" title="Clear history">🗑️</button>
              )}
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 text-xs" title="Close">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatHistory.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                    : "bg-white/5 border border-white/10 text-white/90"
                }`}>
                  {renderMarkdown(m.content)}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick action buttons */}
          {scanned && chatHistory.length > 0 && (
            <div className="px-3 pb-1 flex flex-wrap gap-1 overflow-x-auto">
              {ACTION_BUTTONS.map((btn) => (
                <button
                  key={btn.action}
                  onClick={() => send(`action:${btn.action}`)}
                  className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 whitespace-nowrap transition"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 p-3 border-t border-white/10"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault(); send(input);
                }
              }}
              rows={1}
              placeholder="Ask anything..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 resize-none"
            />
            <button type="submit" className="btn-primary text-xs py-2 px-3" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// ── Quick Action Handler ──────────────────────────────────────────────
function handleQuickAction(action: string, ctx: ReturnType<typeof useApp>): string {
  const state = ctx;
  const profile = scanUserProfile({ user: state.user, state, history: [] });

  switch (action) {
    case "scan":
      return `**Full Profile Scan**\n\n📄 Resume: ${profile.resume}\n💻 GitHub: ${profile.github}\n🔗 LinkedIn: ${profile.linkedin}\n🎤 Interview: ${profile.interview}\n🧠 Skills: ${profile.skills}\n🎯 Career Goal: ${profile.careerGoal}\n📈 Readiness: ${profile.readinessScore}%\n\n${profile.message}`;

    case "missing":
      return `**Missing Sections:**\n\n${!state.resume?.valid ? "⚠️ Resume not uploaded — upload a resume to start skill analysis.\n" : ""}${!state.github || state.github.error ? "⚠️ GitHub not connected — connect your GitHub for portfolio evaluation.\n" : ""}${!state.linkedin?.valid ? "⚠️ LinkedIn not analyzed — paste your profile to merge experience.\n" : ""}${state.interviews.length === 0 ? "⚠️ Interview not completed — verify your skills with quick questions.\n" : ""}${state.skills.length === 0 ? "⚠️ No skills detected — upload your resume first.\n" : ""}${!state.selectedCareer ? "⚠️ Career goal not set — pick a role on the Career page.\n" : ""}` || "✅ All sections complete!";

    case "resume":
      return state.resume?.valid
        ? `📄 **Resume Analysis**\n\nYour resume is uploaded with **${state.resume.skills.length} skills detected**, **${state.resume.tools.length} tools**, and **${state.resume.experience.length} experience roles**.\n\nATS Score: ${state.atsScore ? `${state.atsScore.score}/100 — ${state.atsScore.tips[0] || "Review on the Dashboard page"}` : "Upload your resume to get an ATS score."}`
        : "📄 **Resume not uploaded.**\n\nHead to the **Resume** page and upload your PDF/DOCX resume. We'll extract skills, tools, projects, and roles automatically.";

    case "github":
      return state.github && !state.github.error
        ? `💻 **GitHub Analysis**\n\nUsername: @${state.github.username}\nRepos: ${state.github.totalRepos}\nTop languages: ${state.github.topLanguages.slice(0, 3).map((l) => l.name).join(", ")}\nPortfolio Strength: ${state.portfolioStrength ? `${state.portfolioStrength.score}/100` : "Not evaluated yet"}\n\n${state.portfolioStrength?.feedback[0] || ""}`
        : "💻 **GitHub not connected.**\n\nGo to the **GitHub** page and enter your username. We'll deep-analyze your repos, READMEs, and project structure.";

    case "linkedin":
      return state.linkedin?.valid
        ? `🔗 **LinkedIn Analysis**\n\nProfile detected with **${state.linkedin.skills.length} skills**, **${state.linkedin.experience.length} experience entries**, and **${state.linkedin.roles.length} roles**.\n\nHeadline: ${state.linkedin.headline || "Not detected"}`
        : "🔗 **LinkedIn not analyzed.**\n\nPaste your LinkedIn profile text on the **LinkedIn** page to merge skills and experience into your profile.";

    case "interview":
      return state.interviews.length > 0
        ? `🎤 **Interview Readiness**\n\n${state.interviews.length} skills verified:\n${state.interviews.map((iv) => `• ${iv.skill} — **${iv.verdict}**`).join("\n")}\n\nReadiness: **${state.readinessScore}%** (${state.readinessCategory || "in progress"})`
        : "🎤 **Interview not completed.**\n\nGo to the **Interview** page. You'll answer one simple question per skill — it takes ~5 minutes and unlocks verified skill data.";

    case "suggestions":
      return `💡 **Improvement Suggestions**\n\n${!state.resume?.valid ? "• Upload your resume to start skill extraction.\n" : ""}${!state.github || state.github.error ? "• Connect your GitHub profile to improve portfolio evaluation.\n" : ""}${!state.linkedin?.valid ? "• Add your LinkedIn profile to merge professional data.\n" : ""}${state.interviews.length === 0 ? "• Complete the skill interview to verify your expertise.\n" : ""}${!state.selectedCareer ? "• Select a career goal on the Career page for tailored guidance.\n" : state.gaps.length > 0 ? `• Focus on closing your top skill gap: **${state.gaps[0].skill}**\n` : "• Build one strong portfolio project showcasing your best skills.\n"}${state.readinessScore < 50 && state.selectedCareer ? "• Your readiness is below 50% — focus on the roadmap steps in your Dashboard.\n" : ""}${state.readinessScore >= 70 && state.selectedCareer ? "• Your readiness is strong — start applying and practicing mock interviews.\n" : ""}`;

    default:
      return "How can I help you? Try asking about your skills, gaps, career path, or next steps.";
  }
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
