import { useEffect, useRef, useState } from "react";
import { checkResetToken, resetPassword } from "../utils/auth";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "../utils/validation";

/**
 * The page a reset link lands on: /reset-password?token=…
 *
 * Deliberately router-free — it reads the token straight off the URL and
 * navigates with window.location, because App renders it before the Router
 * mounts (a signed-out visitor otherwise only ever sees the landing page).
 */
export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") || "";

  // checking → form → done, or dead if the link is spent/expired/missing.
  const [stage, setStage] = useState(token ? "checking" : "dead");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [touched, setTouched] = useState({ password: false, confirmation: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef(null);
  const confirmationRef = useRef(null);

  const passwordError = validatePassword(password);
  const confirmationError = validatePasswordConfirmation(password, confirmation);
  const showPasswordError = touched.password && !!passwordError;
  const showConfirmationError = touched.confirmation && !!confirmationError;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    checkResetToken(token)
      .then(({ valid }) => {
        if (!cancelled) setStage(valid ? "form" : "dead");
      })
      .catch(() => {
        // Backend unreachable — let them try anyway rather than claiming the
        // link is dead when we simply couldn't ask.
        if (!cancelled) setStage("form");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (stage === "form") passwordRef.current?.focus();
  }, [stage]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setTouched({ password: true, confirmation: true });
    if (passwordError || confirmationError) {
      (passwordError ? passwordRef : confirmationRef).current?.focus();
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await resetPassword(token, password);
      setStage("done");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const card = {
    width: "100%",
    maxWidth: "420px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "32px",
    boxShadow: "var(--shadow-lg)",
  };

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.8px",
    display: "block",
    marginBottom: "6px",
  };

  const primaryButton = {
    width: "100%",
    padding: "12px",
    background: "var(--brand)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: "0 8px 24px var(--brand-glow)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={card}>
        <div
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.5px",
            marginBottom: "24px",
          }}
        >
          Propos<span style={{ color: "var(--brand)" }}>AI</span>
        </div>

        {stage === "checking" && (
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid var(--border-strong)",
                borderTopColor: "var(--brand)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Checking your link…
          </p>
        )}

        {stage === "dead" && (
          <>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              This link has expired
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13.5px",
                lineHeight: 1.6,
                marginBottom: "22px",
              }}
            >
              Reset links are good for a short window, and each one can only be
              used once. Ask for a fresh link and it'll be in your inbox in a
              moment.
            </p>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="press"
              style={primaryButton}
            >
              Back to sign in
            </button>
          </>
        )}

        {stage === "done" && (
          <>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Password updated
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13.5px",
                lineHeight: 1.6,
                marginBottom: "22px",
              }}
            >
              Everywhere you were signed in has been signed out. Use your new
              password from here.
            </p>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="press"
              style={primaryButton}
            >
              Sign in →
            </button>
          </>
        )}

        {stage === "form" && (
          <>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Choose a new password
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13.5px",
                lineHeight: 1.6,
                marginBottom: "22px",
              }}
            >
              Pick something you haven't used here before.
            </p>

            <form onSubmit={submit} noValidate>
              <label htmlFor="new-password" style={labelStyle}>
                NEW PASSWORD
              </label>
              <input
                id="new-password"
                ref={passwordRef}
                className={`field${showPasswordError ? " is-invalid" : ""}`}
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-invalid={showPasswordError}
                aria-describedby={
                  showPasswordError ? "new-password-error" : "new-password-hint"
                }
                placeholder="••••••••"
                style={{ marginBottom: "6px" }}
              />
              {showPasswordError ? (
                <p id="new-password-error" role="alert" className="field-error">
                  {passwordError}
                </p>
              ) : (
                <p id="new-password-hint" className="field-hint">
                  At least 8 characters.
                </p>
              )}

              <label htmlFor="confirm-password" style={labelStyle}>
                CONFIRM PASSWORD
              </label>
              <input
                id="confirm-password"
                ref={confirmationRef}
                className={`field${showConfirmationError ? " is-invalid" : ""}`}
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  setError("");
                }}
                onBlur={() => setTouched((t) => ({ ...t, confirmation: true }))}
                aria-invalid={showConfirmationError}
                aria-describedby={
                  showConfirmationError ? "confirm-password-error" : undefined
                }
                placeholder="••••••••"
                style={{ marginBottom: showConfirmationError ? "6px" : "20px" }}
              />
              {showConfirmationError && (
                <p id="confirm-password-error" role="alert" className="field-error">
                  {confirmationError}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  style={{
                    color: "var(--danger)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    marginBottom: "14px",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="sheen press"
                style={{
                  ...primaryButton,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Saving…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
