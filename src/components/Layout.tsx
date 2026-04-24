import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import FloatingChatbot from "./FloatingChatbot";

const NAV = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/upload", label: "Resume", icon: "📄" },
  { to: "/github", label: "GitHub", icon: "🐙" },
  { to: "/linkedin", label: "LinkedIn", icon: "🔗" },
  { to: "/career", label: "Career", icon: "🎯" },
  { to: "/interview", label: "Interview", icon: "🗣️" },
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/career-chat", label: "Coach", icon: "🤖" },
  { to: "/progress", label: "Progress", icon: "📈" },
  { to: "/skill-tracker", label: "Roadmap", icon: "🧭" },
  { to: "/report", label: "Report", icon: "📥" },
];

export default function Layout() {
  const { resume, github, selectedCareer, skills, user, logout } = useApp();
  const loc = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const progress = [
    !!resume?.valid,
    !!github && !github.error,
    !!selectedCareer,
    skills.some((s) => s.verification !== "Unverified"),
  ];
  const completed = progress.filter(Boolean).length;

  const initials = (user?.name || user?.email || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <header className="glass sticky top-0 z-30 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center font-bold">🧠</div>
            <div>
              <div className="font-bold text-lg leading-tight">SkillIQ</div>
              <div className="text-[11px] text-white/50 leading-tight">AI Skill Intelligence</div>
            </div>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`
                }
                end={n.to === "/"}
              >
                <span className="mr-1.5">{n.icon}</span>{n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-white/60">
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${(completed / 4) * 100}%` }} />
              </div>
              {completed}/4 steps
            </div>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-xs font-bold">
                    {initials}
                  </div>
                  <span className="hidden sm:inline text-sm text-white/80 max-w-[140px] truncate">
                    {user.name || user.email}
                  </span>
                  <span className="text-white/50 text-xs">▾</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 card p-3 shadow-xl z-40">
                    <div className="px-2 pb-3 border-b border-white/10">
                      <div className="font-semibold text-sm truncate">{user.name}</div>
                      <div className="text-xs text-white/60 truncate">{user.email}</div>
                    </div>
                    <div className="pt-2 space-y-1">
                      <button
                        onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-white/5"
                      >
                        📊 My Dashboard
                      </button>
                      <button
                        onClick={() => { navigate("/report"); setMenuOpen(false); }}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-white/5"
                      >
                        📥 My Report
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm text-red-300 hover:bg-red-500/10"
                      >
                        🚪 Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="btn-primary text-sm py-1.5 px-3">
                Log in
              </button>
            )}
          </div>
        </div>

        {/* mobile nav */}
        <div className="md:hidden flex overflow-x-auto px-2 pb-2 gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                  isActive ? "bg-white/10" : "bg-white/5 text-white/70"
                }`
              }
              end={n.to === "/"}
            >
              {n.icon} {n.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main key={loc.pathname} className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-white/40 py-6 border-t border-white/5">
        SkillIQ © 2026 — Built with React, Tailwind, Recharts. Powered by deep skill analysis.
      </footer>

      {/* Click-Activated AI Profile Analyzer — floating chatbot */}
      <FloatingChatbot />
    </div>
  );
}
