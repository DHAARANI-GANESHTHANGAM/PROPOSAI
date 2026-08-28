// Auth against the MongoDB-backed FastAPI backend (replaces Supabase Auth).

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "proposai_token";

export const getToken   = () => localStorage.getItem(TOKEN_KEY);
export const setToken   = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function readError(res, fallback) {
  const body = await res.json().catch(() => ({}));
  // FastAPI validation errors arrive as a list of {msg, loc}
  if (Array.isArray(body.detail)) {
    return body.detail.map((d) => d.msg).join(", ");
  }
  return body.detail || fallback;
}

async function postJson(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, `Request failed (${res.status})`));
  return res.json();
}

/**
 * Step 1 of both flows. Neither returns a session — they return
 * { otp_required, purpose, email, message } and the code goes out by email.
 * Sign-up creates no account until the code is verified.
 */
export const signup = (email, password) =>
  postJson("/api/auth/signup", { email, password });
export const login = (email, password) =>
  postJson("/api/auth/login", { email, password });

/** Step 2: the code is exchanged for the JWT. */
async function completeChallenge(path, email, code) {
  const data = await postJson(path, { email, code });
  setToken(data.access_token);
  return data.user;
}

export const verifySignup = (email, code) =>
  completeChallenge("/api/auth/signup/verify", email, code);
export const verifyLogin = (email, code) =>
  completeChallenge("/api/auth/login/verify", email, code);

/** purpose is "signup" or "login" — the backend rate-limits this. */
export const resendOtp = (email, purpose) =>
  postJson("/api/auth/otp/resend", { email, purpose });

/**
 * Asks for a reset link. Resolves the same way whether or not the address is
 * registered — the backend deliberately won't say, so neither can we.
 */
export const requestPasswordReset = (email) =>
  postJson("/api/auth/forgot-password", { email });

/** Is this reset link still good? Lets the page fail fast on a dead link. */
export const checkResetToken = (token) =>
  postJson("/api/auth/reset-password/check", { token });

/**
 * Sets the new password. The backend invalidates every token issued before
 * this moment, so drop the one in this browser too.
 */
export async function resetPassword(token, password) {
  const data = await postJson("/api/auth/reset-password", { token, password });
  clearToken();
  return data;
}

/** Restores the session on page load. Returns null if the token is missing/expired. */
export async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    return (await res.json()).user;
  } catch {
    // Backend unreachable — don't discard the token, it may still be valid.
    return null;
  }
}

export function logout() {
  clearToken();
  window.location.href = "/";
}

/**
 * Changes the password for the signed-in user. The backend signs out every
 * other session and hands back a fresh token for this one, so the current
 * device isn't kicked to the login screen.
 */
export async function changePassword(currentPassword, newPassword) {
  const res = await authFetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    throw new Error(await readError(res, `Could not change your password (${res.status})`));
  }

  const data = await res.json();
  if (data.access_token) setToken(data.access_token);
  return data;
}

/** The signed-in user's company profile, saved server-side. */
export async function getCompanyProfile() {
  const res = await authFetch("/api/profile");
  if (!res.ok) {
    throw new Error(await readError(res, `Could not load your profile (${res.status})`));
  }
  return (await res.json()).profile;
}

export async function saveCompanyProfile(profile) {
  const res = await authFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    throw new Error(await readError(res, `Could not save your profile (${res.status})`));
  }
  return (await res.json()).profile;
}

/** fetch() with the Bearer token attached; bounces to login on 401. */
export async function authFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/";
    throw new Error("Session expired. Please sign in again.");
  }
  return res;
}
