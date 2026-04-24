import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { getQuestionForSkill, evaluateAnswer } from "../lib/interviewEngine";
import type { InterviewQA } from "../lib/types";

interface ChatMessage {
  role: "ai" | "user" | "system";
  text: string;
  verdict?: string;
}

export default function Interview() {
  const { skills, selectedCareer, updateSkillVerification, setInterviews, interviews } = useApp();
  const navigate = useNavigate();

  // Pick skills to interview: required role skills the user has, plus their top resume skills
  const skillsToTest = useMemo(() => {
    if (!selectedCareer) return [];
    const present = new Set(skills.map((s) => s.name.toLowerCase()));
    const targets: string[] = [];
    for (const r of selectedCareer.requiredSkills) {
      if (present.has(r.toLowerCase())) targets.push(r);
    }
    // Add a few more strong personal skills
    for (const s of skills) {
      if (!targets.includes(s.name) && targets.length < 6 && s.depth > 0) {
        targets.push(s.name);
      }
    }
    return targets.slice(0, 6);
  }, [skills, selectedCareer]);

  const [idx, setIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<InterviewQA[]>(interviews);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with first question
  useEffect(() => {
    if (skillsToTest.length === 0) return;
    setMessages([
      { role: "system", text: `Hi! I'll ask you ${skillsToTest.length} simple questions to verify your skills. Answer naturally — like you're chatting with a friend.` },
      { role: "ai", text: `Question 1 of ${skillsToTest.length} — about **${skillsToTest[0]}**:\n\n${getQuestionForSkill(skillsToTest[0])}` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsToTest.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function submitAnswer() {
    const text = input.trim();
    if (!text || thinking || done) return;
    const skill = skillsToTest[idx];
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const evalResult = evaluateAnswer(skill, text);
      const verdictEmoji = evalResult.verdict === "Strong" ? "✔" : evalResult.verdict === "Basic" ? "⚠️" : "❌";
      setMessages((m) => [...m, {
        role: "ai",
        text: `${verdictEmoji} **${evalResult.verdict}** on ${skill}.\n\n${evalResult.feedback}`,
        verdict: evalResult.verdict,
      }]);

      updateSkillVerification(skill, evalResult.verdict);
      const newResults = [...results, { skill, question: getQuestionForSkill(skill), answer: text, verdict: evalResult.verdict, feedback: evalResult.feedback }];
      setResults(newResults);
      setInterviews(newResults);

      const next = idx + 1;
      if (next < skillsToTest.length) {
        setTimeout(() => {
          setMessages((m) => [...m, {
            role: "ai",
            text: `Question ${next + 1} of ${skillsToTest.length} — about **${skillsToTest[next]}**:\n\n${getQuestionForSkill(skillsToTest[next])}`,
          }]);
          setIdx(next);
          setThinking(false);
        }, 600);
      } else {
        setMessages((m) => [...m, { role: "system", text: "🎉 Interview complete! Heading to your dashboard..." }]);
        setDone(true);
        setThinking(false);
      }
    }, 900);
  }

  function skipQuestion() {
    if (thinking || done) return;
    const skill = skillsToTest[idx];
    setMessages((m) => [...m, { role: "user", text: "(skipped)" }, { role: "ai", text: `❌ Marked as **Weak** on ${skill}. We'll add it to your roadmap.`, verdict: "Weak" }]);
    updateSkillVerification(skill, "Weak");
    const newResults = [...results, { skill, question: getQuestionForSkill(skill), answer: "(skipped)", verdict: "Weak" as const, feedback: "Skipped — needs practice." }];
    setResults(newResults);
    setInterviews(newResults);

    const next = idx + 1;
    if (next < skillsToTest.length) {
      setTimeout(() => {
        setMessages((m) => [...m, { role: "ai", text: `Question ${next + 1} of ${skillsToTest.length} — about **${skillsToTest[next]}**:\n\n${getQuestionForSkill(skillsToTest[next])}` }]);
        setIdx(next);
      }, 400);
    } else {
      setMessages((m) => [...m, { role: "system", text: "Interview complete!" }]);
      setDone(true);
    }
  }

  if (!selectedCareer) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <div className="font-semibold text-lg">Pick a career role first</div>
        <div className="text-white/60 mt-2">We need a target role to know which skills to verify.</div>
        <button className="btn-primary mt-4" onClick={() => navigate("/career")}>Choose a role</button>
      </div>
    );
  }

  if (skillsToTest.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">📄</div>
        <div className="font-semibold text-lg">No skills detected yet</div>
        <div className="text-white/60 mt-2">Upload your resume or connect GitHub so we know what to ask about.</div>
        <button className="btn-primary mt-4" onClick={() => navigate("/upload")}>Upload Resume</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">🗣️ AI Skill Verification</h1>
      <p className="text-white/60 mb-4">Simple, real-world questions. No tricks.</p>

      <div className="card overflow-hidden flex flex-col" style={{ height: "65vh" }}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-white/50">Verifying for: </span>
            <span className="font-semibold">{selectedCareer.name}</span>
          </div>
          <div className="text-xs text-white/50">{Math.min(idx + 1, skillsToTest.length)} / {skillsToTest.length}</div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {thinking && (
            <div className="flex gap-1.5 ml-2">
              <div className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
              <div className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
              <div className="w-2 h-2 rounded-full bg-white/40 typing-dot" />
            </div>
          )}
        </div>

        <div className="border-t border-white/5 p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            disabled={done || thinking}
            placeholder={done ? "Interview complete" : "Type your answer..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:opacity-50"
          />
          {!done ? (
            <>
              <button onClick={skipQuestion} disabled={thinking} className="btn-ghost text-sm">Skip</button>
              <button onClick={submitAnswer} disabled={!input.trim() || thinking} className="btn-primary text-sm">Send</button>
            </>
          ) : (
            <button onClick={() => navigate("/dashboard")} className="btn-primary text-sm">Go to Dashboard →</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "system") {
    return <div className="text-center text-xs text-white/40 py-1">{msg.text}</div>;
  }
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
            : "bg-white/5 border border-white/10"
        }`}
      >
        {renderInline(msg.text)}
      </div>
    </div>
  );
}

function renderInline(text: string) {
  // very small **bold** parser
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
