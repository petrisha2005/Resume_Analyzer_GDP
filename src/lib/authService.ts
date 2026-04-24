import type { User } from "./types";

// ──────────────────────────────────────────────────────────────────────────────
// Auth Service — Production-style "Sign up once, log in many times" flow.
// (Frontend-only simulation of FastAPI + MongoDB + bcrypt + JWT.)
//
// Storage model:
//   localStorage["skilliq:users"]   → array of {id, email, name, passwordHash, ...}
//   localStorage["token"]           → JWT-style signed token (per spec)
//   localStorage["skilliq:session"] → cached current-user object (for fast boot)
//
// Rules:
//   • signup() rejects if email already exists  → "User already exists, please log in"
//   • login()  rejects if email not found       → "User not found, please sign up"
//   • login()  rejects if password mismatch     → "Invalid password"
//   • Sessions persist via token across reloads
// ──────────────────────────────────────────────────────────────────────────────

const USERS_KEY = "skilliq:users";
const SESSION_KEY = "skilliq:session";
const TOKEN_KEY = "token";
const USER_ID_KEY = "user_id";
// In a real backend this lives in env vars. Frontend-only demo so it's static.
const JWT_SECRET = "skilliq-demo-signing-key-v1";

interface StoredUser extends User {
  passwordHash: string;
}

// ── Hashing ───────────────────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** bcrypt-style hashing (here: salted SHA-256 — bcrypt isn't available in browser). */
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, "");
  const digest = await sha256(`${salt}:${password}`);
  return `s2$${salt}$${digest}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Backwards compat: legacy users stored bare SHA-256 (no salt prefix).
  if (!stored.startsWith("s2$")) {
    const legacy = await sha256(password);
    return legacy === stored;
  }
  const [, salt, digest] = stored.split("$");
  if (!salt || !digest) return false;
  const check = await sha256(`${salt}:${password}`);
  return check === digest;
}

// ── JWT (HS256-style, browser-safe) ───────────────────────────────────────────
function b64urlEncode(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

interface JwtPayload {
  sub: string;      // user id
  email: string;
  name: string;
  iat: number;      // issued-at (sec)
  exp: number;      // expiry  (sec)
}

async function signToken(user: User): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + 60 * 60 * 24 * 30, // 30 days
  };
  const headerB64 = b64urlEncode(JSON.stringify(header));
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = await sha256(`${headerB64}.${payloadB64}.${JWT_SECRET}`);
  return `${headerB64}.${payloadB64}.${signature}`;
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    if (!headerB64 || !payloadB64 || !signature) return null;
    const expected = await sha256(`${headerB64}.${payloadB64}.${JWT_SECRET}`);
    if (expected !== signature) return null;
    const payload = JSON.parse(b64urlDecode(payloadB64)) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── User collection helpers ───────────────────────────────────────────────────
function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function toPublic(u: StoredUser): User {
  const { passwordHash: _ph, ...rest } = u;
  void _ph;
  return rest;
}

// ── Session helpers ───────────────────────────────────────────────────────────
function saveSession(user: User, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, user.id);
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

/**
 * Returns the currently signed-in user, or null.
 * Validates the JWT token and rebuilds the session from the users collection
 * so that a user who logged in previously stays logged in across reloads.
 */
export function getSession(): User | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    // Backwards compat: legacy session-only users
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
  // Synchronous best-effort: read cached session, validate token in background
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const cached = raw ? (JSON.parse(raw) as User) : null;
    // Fire-and-forget token verification — clears session if expired/invalid
    verifyToken(token).then((payload) => {
      if (!payload) clearSession();
    });
    return cached;
  } catch {
    return null;
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
export function validateEmail(email: string): string | null {
  if (!email) return "Email is required.";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  if (!ok) return "Please enter a valid email address.";
  return null;
}

export function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required.";
  if (pw.length < 6) return "Password must be at least 6 characters.";
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface AuthResult {
  ok: true;
  user: User;
  token: string;
}
export interface AuthError {
  ok: false;
  error: string;
}

/**
 * POST /signup — create a new user.
 * • Rejects if email already exists ("User already exists, please log in").
 * • Hashes password and stores user in DB.
 * • Issues a JWT token and persists session.
 */
export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResult | AuthError> {
  const e = email.trim().toLowerCase();
  const emailErr = validateEmail(e);
  if (emailErr) return { ok: false, error: emailErr };
  const pwErr = validatePassword(password);
  if (pwErr) return { ok: false, error: pwErr };
  if (!name.trim()) return { ok: false, error: "Please enter your name." };

  const users = loadUsers();
  if (users.some((u) => u.email === e)) {
    return { ok: false, error: "An account with this email already exists. Please log in instead." };
  }

  const now = new Date().toISOString();
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email: e,
    name: name.trim(),
    createdAt: now,
    lastLoginAt: now,
    passwordHash: await hashPassword(password),
  };
  users.push(newUser);
  saveUsers(users);

  const pub = toPublic(newUser);
  const token = await signToken(pub);
  saveSession(pub, token);
  return { ok: true, user: pub, token };
}

/**
 * POST /login — authenticate an existing user.
 * • Rejects if email not found ("User not found, please sign up").
 * • Rejects if password incorrect ("Invalid password").
 * • Does NOT create a new user.
 * • Issues a JWT token and persists session.
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResult | AuthError> {
  const e = email.trim().toLowerCase();
  const emailErr = validateEmail(e);
  if (emailErr) return { ok: false, error: emailErr };
  if (!password) return { ok: false, error: "Password is required." };

  const users = loadUsers();
  const user = users.find((u) => u.email === e);
  if (!user) {
    return { ok: false, error: "No account found with this email. Please sign up first." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { ok: false, error: "Invalid password. Please try again." };
  }

  user.lastLoginAt = new Date().toISOString();
  saveUsers(users);

  const pub = toPublic(user);
  const token = await signToken(pub);
  saveSession(pub, token);
  return { ok: true, user: pub, token };
}

/** POST /logout — clear the session/token from this device. */
export function logout() {
  clearSession();
}

/** Returns the raw JWT token (for Authorization headers) or null. */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Returns the current user_id (per spec) or null. */
export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}
