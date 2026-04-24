import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { login, signup } from "../lib/authService";

type Mode = "login" | "signup";

export default function Login() {
  const { setUser, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const redirectTo = location.state?.from || "/upload";

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    // Already logged in — bounce away
    setTimeout(() => navigate(redirectTo, { replace: true }), 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login(email, password)
          : await signup(name, email, password);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUser(result.user);
      navigate(redirectTo, { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-2xl">
              🧠
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-4">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {mode === "login"
              ? "Log in to continue your skill journey."
              : "Start your AI-powered career analysis."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Full name</label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Email address</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                className="input pr-20"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Confirm password</label>
              <input
                className="input"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && (
            <div className="text-sm bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>

          <div className="text-center text-sm text-white/60 pt-2">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-indigo-300 hover:text-indigo-200 font-medium"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-indigo-300 hover:text-indigo-200 font-medium"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </form>

        <p className="text-center text-xs text-white/40 mt-4">
          Your account is stored securely on this device.
        </p>
      </div>
    </div>
  );
}
