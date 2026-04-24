import { useEffect, useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import {
  generateCoachReply, loadChatHistory, saveChatHistory,
  clearChatHistory, newMessage,
} from "../lib/chatService";

const SUGGESTIONS = [
  "What should I learn next?",
  "Am I ready for internships?",
  "Which role suits me?",
  "Give me project ideas",
  "How is my resume?",
  "Which of my skills are in high demand?",
];

export default function CareerChat() {
  const ctx = useApp();
  const { user, chatHistory, setChatHistory } = ctx;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history once per user
  useEffect(() => {
    if (!user) return;
    const loaded = loadChatHistory(user.id);
    if (loaded.length === 0) {
      const greet = newMessage(
        "assistant",
        `Hi ${user.name?.split(" ")[0] || "there"}! 👋 I'm your AI career coach. I have full context on your skills, GitHub, and ${ctx.selectedCareer ? `your goal of becoming a **${ctx.selectedCareer.name}**` : "your career goal"}. Ask me anything!`
      );
      setChatHistory([greet]);
      saveChatHistory(user.id, [greet]);
    } else {
      setChatHistory(loaded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;

    // Capture history BEFORE adding the new user message — this is what the
    // AI sees as "prior conversation". Append user message immediately so the
    // UI feels instant; clear the input right away too.
    const priorHistory = chatHistory;
    const userMsg = newMessage("user", q);
    const afterUser = [...priorHistory, userMsg];
    setChatHistory(afterUser);
    saveChatHistory(user?.id, afterUser);
    setInput("");
    setBusy(true);

    try {
      const reply = await generateCoachReply(q, {
        user,
        state: ctx,
        history: priorHistory,  // ← full prior conversation, NOT including new msg
      });
      const aiMsg = newMessage("assistant", reply);
      const finalHist = [...afterUser, aiMsg];
      setChatHistory(finalHist);
      saveChatHistory(user?.id, finalHist);
    } catch (err) {
      const errMsg = newMessage(
        "assistant",
        "⚠️ Something went wrong generating that reply. Could you try rephrasing?"
      );
      const finalHist = [...afterUser, errMsg];
      setChatHistory(finalHist);
      saveChatHistory(user?.id, finalHist);
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (!confirm("Clear chat history?")) return;
    clearChatHistory(user?.id);
    setChatHistory([]);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-white/50">AI Career Coach</div>
          <h1 className="text-3xl font-bold">🤖 Chat with your Coach</h1>
        </div>
        {chatHistory.length > 0 && (
          <button className="btn-secondary text-sm" onClick={clear}>🗑️ Clear</button>
        )}
      </div>

      <div className="card flex flex-col h-[70vh]">
        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatHistory.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
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
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* suggestions */}
        {chatHistory.length <= 1 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 p-4 border-t border-white/10"
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
            placeholder="Ask anything about your career, skills, or next steps..."
            className="input flex-1 resize-none max-h-32"
          />
          <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
            Send →
          </button>
        </form>
      </div>

      <p className="text-xs text-white/40 text-center mt-3">
        Coach uses your live profile context (skills, GitHub, career goal) — answers update as your data changes.
      </p>
    </div>
  );
}

// Lightweight bold-only markdown renderer
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
