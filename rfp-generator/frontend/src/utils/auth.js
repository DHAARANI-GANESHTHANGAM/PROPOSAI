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

async function submitCredentials(path, email, password) {
  const res = await fetch(`${API_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res, `Request failed (${res.status})`));

  const data = await res.json();
  setToken(data.access_token);
  return data.user;
}

export const signup = (email, password) => submitCredentials("signup", email, password);
export const login  = (email, password) => submitCredentials("login", email, password);

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
