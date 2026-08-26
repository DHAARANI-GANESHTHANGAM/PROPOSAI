import { useEffect, useRef, useState } from "react";
import { login, signup } from "../utils/auth";
import {
  validateEmail,
  validatePassword,
  suggestEmailFix,
} from "../utils/validation";

/**
 * The single sign-in / sign-up surface for the whole marketing page.
 * Previously this form existed twice — inline at the bottom of Landing
 * and again in a page component nothing ever routed to.
 *
 * @param {"login"|"signup"} mode   which tab opens first
 * @param {() => void}       onClose
 */
export default function AuthModal({ mode = "login", onClose }) {
  const [tab, setTab] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // A field's message stays hidden until it has been blurred or the form has
  // been submitted, so nobody gets scolded halfway through typing. After that
  // it updates live as they fix it.
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const emailSuggestion = emailError ? "" : suggestEmailFix(email);
  const showEmailError = touched.email && !!emailError;
  const showPasswordError = touched.password && !!passwordError;

  useEffect(() => setTab(mode), [mode]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !loading && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [loading, onClose]);

  const switchTab = (next) => {
    setTab(next);
    setError("");
    setSuccess("");
    setTouched({ email: false, password: false });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Nothing leaves the browser until both fields pass. Reveal every message
    // at once and put the cursor in the first field that needs work.
    setTouched({ email: true, password: true });
    if (emailError || passwordError) {
      (emailError ? emailRef : passwordRef).current?.focus();
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    const cleanEmail = email.trim();
    try {
      if (tab === "login") {
        await login(cleanEmail, password);
      } else {
        await signup(cleanEmail, password);
        setSuccess("Account created — signing you in…");
      }
      // Reload so App re-reads the stored token and mounts the app shell.
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "var(--scrim)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "scrim-in 0.25s ease both",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? "Sign in" : "Create an account"}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "var(--shadow-lg)",
          animation: "modal-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          style={{
            float: "right",
            width: "30px",
            height: "30px",
            marginTop: "-8px",
            marginRight: "-8px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text-faint)",
            fontSize: "16px",
            lineHeight: 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          className="press"
        >
          ×
        </button>

        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.3px",
          }}
        >
          {tab === "login" ? "Welcome back" : "Create your free account"}
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "13.5px",
            marginTop: "6px",
            marginBottom: "22px",
          }}
        >
          {tab === "login"
            ? "Pick up where you left off."
            : "No card required. Start drafting in a minute."}
        </p>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "20px",
            background: "var(--bg-alt)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          {[
            ["login", "Sign In"],
            ["signup", "Sign Up"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "inherit",
                background: tab === key ? "var(--brand)" : "transparent",
                color: tab === key ? "#fff" : "var(--text-muted)",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate>
          <label
            htmlFor="auth-email"
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.8px",
              display: "block",
              marginBottom: "6px",
            }}
          >
            EMAIL
          </label>
          <input
            id="auth-email"
            ref={emailRef}
            className={`field${showEmailError ? " is-invalid" : ""}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={showEmailError}
            aria-describedby={showEmailError ? "auth-email-error" : undefined}
            placeholder="you@example.com"
            style={{
              marginBottom: showEmailError || emailSuggestion ? "6px" : "16px",
            }}
          />

          {showEmailError && (
            <p id="auth-email-error" role="alert" className="field-error">
              {emailError}
            </p>
          )}

          {/* Non-blocking nudge for the usual domain typos. */}
          {emailSuggestion && !showEmailError && (
            <p className="field-hint">
              Did you mean{" "}
              <button
                type="button"
                className="field-hint-fix"
                onClick={() => {
                  setEmail(emailSuggestion);
                  emailRef.current?.focus();
                }}
              >
                {emailSuggestion}
              </button>
              ?
            </p>
          )}

          <label
            htmlFor="auth-password"
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.8px",
              display: "block",
              marginBottom: "6px",
            }}
          >
            PASSWORD
          </label>
          <input
            id="auth-password"
            ref={passwordRef}
            className={`field${showPasswordError ? " is-invalid" : ""}`}
            type="password"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            aria-invalid={showPasswordError}
            aria-describedby={
              showPasswordError
                ? "auth-password-error"
                : tab === "signup"
                ? "auth-password-hint"
                : undefined
            }
            placeholder="••••••••"
            style={{
              marginBottom:
                showPasswordError || tab === "signup" ? "6px" : "20px",
            }}
          />

          {showPasswordError ? (
            <p id="auth-password-error" role="alert" className="field-error">
              {passwordError}
            </p>
          ) : tab === "signup" ? (
            <p id="auth-password-hint" className="field-hint">
              At least 8 characters.
            </p>
          ) : null}

          {error && (
            <p
              role="alert"
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              {error}
            </p>
          )}
          {success && (
            <p
              style={{
                color: "var(--success)",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="sheen press"
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--brand)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: `0 8px 24px var(--brand-glow)`,
            }}
          >
            {loading && (
              <span
                aria-hidden="true"
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            )}
            {loading
              ? "Please wait…"
              : tab === "login"
              ? "Sign In →"
              : "Create Account →"}
          </button>
        </form>

        <p
          style={{
            color: "var(--text-faint)",
            fontSize: "12px",
            textAlign: "center",
            marginTop: "18px",
          }}
        >
          {tab === "login" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchTab(tab === "login" ? "signup" : "login")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--brand-soft)",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {tab === "login" ? "Create an account" : "Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
}
