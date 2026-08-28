import { useEffect, useRef, useState } from "react";
import {
  login,
  signup,
  requestPasswordReset,
  verifyLogin,
  verifySignup,
  resendOtp,
} from "../utils/auth";
import {
  validateEmail,
  validatePassword,
  validateOtpCode,
  suggestEmailFix,
} from "../utils/validation";

const labelStyle = {
  color: "var(--text-muted)",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.8px",
  display: "block",
  marginBottom: "6px",
};

const linkButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  fontFamily: "inherit",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--brand-soft)",
  cursor: "pointer",
};

/**
 * The single sign-in / sign-up / forgot-password surface for the whole
 * marketing page.
 *
 * Three views share one modal: "credentials" (the login and signup tabs),
 * "forgot" (email only) and "sent" (the confirmation after a reset link goes
 * out).
 *
 * @param {"login"|"signup"} mode   which tab opens first
 * @param {() => void}       onClose
 */
export default function AuthModal({ mode = "login", onClose }) {
  const [tab, setTab] = useState(mode);
  const [view, setView] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState("");
  // A field's message stays hidden until it has been blurred or the form has
  // been submitted, so nobody gets scolded halfway through typing. After that
  // it updates live as they fix it.
  const [touched, setTouched] = useState({ email: false, password: false });
  // The one-time code step. `otpPurpose` decides which verify endpoint runs.
  const [otpCode, setOtpCode] = useState("");
  const [otpPurpose, setOtpPurpose] = useState(null);
  const [otpTouched, setOtpTouched] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const otpRef = useRef(null);

  const forgotView = view === "forgot";
  const otpView = view === "otp";
  const otpError = validateOtpCode(otpCode);
  const showOtpError = otpTouched && !!otpError;
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const emailSuggestion = emailError ? "" : suggestEmailFix(email);
  const showEmailError = touched.email && !!emailError;
  const showPasswordError = !forgotView && touched.password && !!passwordError;

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

  // Ticks the "Resend in Ns" counter down to zero.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
    setNotice("");
    setTouched({ email: false, password: false });
    setOtpTouched(false);
  };

  const switchTab = (next) => {
    setTab(next);
    setView("credentials");
    resetMessages();
  };

  const openForgot = () => {
    setView("forgot");
    setPassword("");
    resetMessages();
    // Focus lands after the field re-renders without the password input.
    setTimeout(() => emailRef.current?.focus(), 0);
  };

  const backToSignIn = () => {
    setTab("login");
    setView("credentials");
    setOtpCode("");
    setOtpPurpose(null);
    setPassword("");
    setResendIn(0);
    resetMessages();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Nothing leaves the browser until the fields in play pass. Reveal every
    // message at once and put the cursor in the first one that needs work.
    setTouched({ email: true, password: !forgotView });
    if (emailError || (!forgotView && passwordError)) {
      (emailError ? emailRef : passwordRef).current?.focus();
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    const cleanEmail = email.trim();

    try {
      if (forgotView) {
        const { message } = await requestPasswordReset(cleanEmail);
        setNotice(message);
        setView("sent");
        setLoading(false);
        return;
      }

      // Neither step returns a session: both email a code and wait for it.
      const { message } = tab === "login"
        ? await login(cleanEmail, password)
        : await signup(cleanEmail, password);

      setNotice(message);
      setOtpPurpose(tab === "login" ? "login" : "signup");
      setOtpCode("");
      setOtpTouched(false);
      setResendIn(30);
      setView("otp");
      setLoading(false);
      setTimeout(() => otpRef.current?.focus(), 0);
      return;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    if (loading) return;

    setOtpTouched(true);
    if (otpError) {
      otpRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");
    const cleanEmail = email.trim();

    try {
      if (otpPurpose === "login") {
        await verifyLogin(cleanEmail, otpCode.trim());
      } else {
        await verifySignup(cleanEmail, otpCode.trim());
      }
      // Reload so App re-reads the stored token and mounts the app shell.
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setOtpCode("");
      setLoading(false);
      otpRef.current?.focus();
    }
  };

  const requestAnotherCode = async () => {
    if (resending || resendIn > 0) return;
    setResending(true);
    setError("");
    try {
      const { message } = await resendOtp(email.trim(), otpPurpose);
      setNotice(message);
      setOtpCode("");
      setOtpTouched(false);
      setResendIn(30);
      otpRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const heading = otpView
    ? "Check your email"
    : forgotView
    ? "Reset your password"
    : view === "sent"
    ? "Check your inbox"
    : tab === "login"
    ? "Welcome back"
    : "Create your free account";

  const subheading = otpView
    ? notice
    : forgotView
    ? "Tell us the address you signed up with and we'll email you a link to set a new password."
    : view === "sent"
    ? ""
    : tab === "login"
    ? "Pick up where you left off."
    : "No card required. Start drafting in a minute.";

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
        aria-label={heading}
        style={{
          width: "100%",
          maxWidth: "420px",
          maxHeight: "calc(100dvh - 40px)",
          overflowY: "auto",
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
          {heading}
        </h2>
        {subheading && (
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "13.5px",
              lineHeight: 1.55,
              marginTop: "6px",
              marginBottom: "22px",
            }}
          >
            {subheading}
          </p>
        )}

        {/* ---------------- One-time code ---------------- */}
        {otpView ? (
          <form onSubmit={submitOtp} noValidate>
            <label htmlFor="auth-otp" style={labelStyle}>
              6-DIGIT CODE
            </label>
            <input
              id="auth-otp"
              ref={otpRef}
              className={`field${showOtpError ? " is-invalid" : ""}`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={otpCode}
              onChange={(e) => {
                // Digits only, so a pasted "123 456" still works.
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              onBlur={() => setOtpTouched(true)}
              aria-invalid={showOtpError}
              aria-describedby={showOtpError ? "auth-otp-error" : undefined}
              placeholder="000000"
              style={{
                marginBottom: showOtpError ? "6px" : "16px",
                fontSize: "22px",
                letterSpacing: "8px",
                textAlign: "center",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            />

            {showOtpError && (
              <p id="auth-otp-error" role="alert" className="field-error">
                {otpError}
              </p>
            )}

            {error && (
              <p role="alert" style={{
                color: "var(--danger)", fontSize: "13px", marginBottom: "14px",
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="sheen press"
              style={{
                width: "100%", padding: "12px", background: "var(--brand)",
                border: "none", borderRadius: "10px", color: "#fff",
                fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px",
                boxShadow: `0 8px 24px var(--brand-glow)`,
              }}
            >
              {loading && (
                <span aria-hidden="true" style={{
                  width: "14px", height: "14px",
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
              )}
              {loading
                ? "Verifying…"
                : otpPurpose === "signup"
                ? "Create account →"
                : "Sign In →"}
            </button>

            <p style={{
              color: "var(--text-faint)", fontSize: "12px",
              textAlign: "center", marginTop: "18px", lineHeight: 1.7,
            }}>
              Didn't get it? Check your spam folder.
              <br />
              {resendIn > 0 ? (
                <span>You can ask for a new code in {resendIn}s</span>
              ) : (
                <button type="button" onClick={requestAnotherCode}
                  disabled={resending} style={linkButtonStyle}>
                  {resending ? "Sending…" : "Send a new code"}
                </button>
              )}
              <br />
              <button type="button" onClick={backToSignIn} style={{
                ...linkButtonStyle, marginTop: "8px", color: "var(--text-faint)",
              }}>
                ← Start over
              </button>
            </p>
          </form>
        ) : view === "sent" ? (
          <div>
            <div
              style={{
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "18px",
                marginTop: "16px",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "13.5px",
                  lineHeight: 1.6,
                }}
              >
                {notice}
              </p>
              <p
                style={{
                  color: "var(--text-faint)",
                  fontSize: "12.5px",
                  lineHeight: 1.6,
                  marginTop: "10px",
                }}
              >
                Nothing after a minute or two? Check your spam folder, or try
                again with a different address.
              </p>
            </div>
            <button
              type="button"
              onClick={backToSignIn}
              className="press"
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
                cursor: "pointer",
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Tab switcher — not shown while resetting. */}
            {!forgotView && (
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
            )}

            <form onSubmit={submit} noValidate>
              <label htmlFor="auth-email" style={labelStyle}>
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

              {!forgotView && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <label htmlFor="auth-password" style={labelStyle}>
                      PASSWORD
                    </label>
                    {tab === "login" && (
                      <button
                        type="button"
                        onClick={openForgot}
                        style={{ ...linkButtonStyle, marginBottom: "6px" }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    ref={passwordRef}
                    className={`field${showPasswordError ? " is-invalid" : ""}`}
                    type="password"
                    autoComplete={
                      tab === "login" ? "current-password" : "new-password"
                    }
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
                </>
              )}

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
                  : forgotView
                  ? "Send reset link"
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
              {forgotView ? (
                <button type="button" onClick={backToSignIn} style={linkButtonStyle}>
                  ← Back to sign in
                </button>
              ) : (
                <>
                  {tab === "login" ? "New here? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => switchTab(tab === "login" ? "signup" : "login")}
                    style={linkButtonStyle}
                  >
                    {tab === "login" ? "Create an account" : "Sign in instead"}
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
