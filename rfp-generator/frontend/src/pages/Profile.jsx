import { useState, useEffect } from "react";
import { getCompanyProfile, saveCompanyProfile, changePassword } from "../utils/auth";
import { validatePassword, validatePasswordConfirmation } from "../utils/validation";

const EMPTY_PROFILE = {
  companyName:   "",
  services:      "",
  teamSize:      "",
  location:      "",
  experience:    "",
  speciality:    "",
  website:       "",
};

const LEGACY_KEY = "company_profile";

export default function Profile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [notice, setNotice]   = useState("");

  // Change-password form, kept separate from the profile form above so a
  // failure in one never clears the other.
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [pwTouched, setPwTouched] = useState(false);
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError, setPwError]     = useState("");
  const [pwDone, setPwDone]       = useState(false);

  const nextError    = validatePassword(passwords.next);
  const confirmError = validatePasswordConfirmation(passwords.next, passwords.confirm);
  const currentError = passwords.current ? "" : "Enter your current password.";

  const setPassword = (field, value) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
    setPwError("");
    setPwDone(false);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (pwSaving) return;

    setPwTouched(true);
    if (currentError || nextError || confirmError) return;

    setPwSaving(true);
    setPwError("");
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setPwTouched(false);
      setPwDone(true);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const remote = await getCompanyProfile();
        const remoteIsEmpty = Object.values(remote || {}).every((v) => !v);

        // One-time migration: this profile used to live in localStorage, so
        // anyone who filled it in before keeps it instead of starting over.
        let legacy = null;
        try {
          const raw = localStorage.getItem(LEGACY_KEY);
          if (raw) legacy = JSON.parse(raw);
        } catch {
          legacy = null; // corrupt JSON from an old version — ignore it
        }

        if (remoteIsEmpty && legacy) {
          const merged = { ...EMPTY_PROFILE, ...legacy };
          const stored = await saveCompanyProfile(merged);
          localStorage.removeItem(LEGACY_KEY);
          if (!cancelled) {
            setProfile(stored);
            setNotice("We moved the profile saved in this browser onto your account.");
          }
          return;
        }

        if (!cancelled) setProfile({ ...EMPTY_PROFILE, ...(remote || {}) });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError("");
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const stored = await saveCompanyProfile(profile);
      setProfile({ ...EMPTY_PROFILE, ...stored });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "companyName", label: "Company Name",       placeholder: "e.g. TechCorp Solutions"           },
    { key: "services",    label: "Services Offered",   placeholder: "e.g. Web development, AI, CRM..."  },
    { key: "teamSize",    label: "Team Size",           placeholder: "e.g. 25 employees"                 },
    { key: "location",    label: "Location",            placeholder: "e.g. Dubai, UAE"                   },
    { key: "experience",  label: "Years of Experience", placeholder: "e.g. 8 years"                      },
    { key: "speciality",  label: "Industry Speciality", placeholder: "e.g. Healthcare, Fintech, Retail"  },
    { key: "website",     label: "Website",             placeholder: "e.g. https://techcorp.com"         },
  ];

  return (
    <div className="page" style={{ maxWidth: "700px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700",
          color: "#fff", marginBottom: "8px" }}>
          Company Profile
        </h1>
        <p style={{ color: "#555", fontSize: "14px" }}>
          Fill in your company details. The AI will use this to personalize every RFP response.
        </p>
      </div>

      {/* Info Banner */}
      <div style={{ background: "#13131f", border: "1px solid #2e2e5e",
        borderRadius: "10px", padding: "16px", marginBottom: "28px",
        display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "20px" }}>💡</span>
        <p style={{ color: "#8888cc", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>
          The more detail you add here, the more personalized and professional
          your AI-generated proposals will sound. Saved to your account, so it
          follows you to any device you sign in on.
        </p>
      </div>

      {notice && (
        <div style={{ background: "#0d1a12", border: "1px solid #1a3a24",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
          color: "#22c55e", fontSize: "13px" }}>
          {notice}
        </div>
      )}

      {error && (
        <div style={{ background: "#1a0d0d", border: "1px solid #3a1a1a",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
          color: "#ef4444", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      <div style={{ background: "#111118", border: "1px solid #1e1e2e",
        borderRadius: "12px", padding: "28px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0",
            color: "#444", fontSize: "14px" }}>
            Loading your profile…
          </div>
        ) : (
          <>
            {fields.map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: "20px" }}>
                <label htmlFor={`profile-${key}`} style={{ color: "#555", fontSize: "12px",
                  fontWeight: "600", letterSpacing: "1px", display: "block",
                  marginBottom: "8px" }}>
                  {label.toUpperCase()}
                </label>
                <input
                  id={`profile-${key}`}
                  type="text"
                  maxLength={500}
                  value={profile[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 14px",
                    background: "#0d0d14", border: "1px solid #1e1e2e",
                    borderRadius: "8px", color: "#fff", fontSize: "14px",
                    outline: "none", boxSizing: "border-box",
                    transition: "border 0.15s" }}
                />
              </div>
            ))}

            <button onClick={handleSave} disabled={saving} style={{
              width: "100%", padding: "12px",
              background: saved ? "#14532d" : "#6366f1",
              border: `1px solid ${saved ? "#22c55e" : "transparent"}`,
              borderRadius: "8px", color: saved ? "#22c55e" : "#fff",
              fontSize: "14px", fontWeight: "600", fontFamily: "inherit",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition: "all 0.2s" }}>
              {saving ? "Saving…" : saved ? "✅ Profile Saved!" : "Save Profile"}
            </button>
          </>
        )}
      </div>

      {/* Change password */}
      <div style={{ background: "#111118", border: "1px solid #1e1e2e",
        borderRadius: "12px", padding: "28px", marginTop: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#fff",
          marginBottom: "6px" }}>
          Change password
        </h2>
        <p style={{ color: "#555", fontSize: "13px", lineHeight: 1.6,
          marginBottom: "20px" }}>
          You'll stay signed in here. Every other device is signed out.
        </p>

        <form onSubmit={submitPassword} noValidate>
          {[
            { key: "current", label: "CURRENT PASSWORD", autoComplete: "current-password",
              error: currentError },
            { key: "next",    label: "NEW PASSWORD",     autoComplete: "new-password",
              error: nextError },
            { key: "confirm", label: "CONFIRM NEW PASSWORD", autoComplete: "new-password",
              error: confirmError },
          ].map(({ key, label, autoComplete, error: fieldError }) => {
            const showError = pwTouched && !!fieldError;
            return (
              <div key={key} style={{ marginBottom: showError ? "6px" : "20px" }}>
                <label htmlFor={`pw-${key}`} style={{ color: "#555", fontSize: "12px",
                  fontWeight: "600", letterSpacing: "1px", display: "block",
                  marginBottom: "8px" }}>
                  {label}
                </label>
                <input
                  id={`pw-${key}`}
                  type="password"
                  autoComplete={autoComplete}
                  value={passwords[key]}
                  onChange={(e) => setPassword(key, e.target.value)}
                  onBlur={() => setPwTouched(true)}
                  aria-invalid={showError}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 14px",
                    background: "#0d0d14",
                    border: `1px solid ${showError ? "#ef4444" : "#1e1e2e"}`,
                    borderRadius: "8px", color: "#fff", fontSize: "14px",
                    outline: "none", boxSizing: "border-box" }}
                />
                {showError && (
                  <p role="alert" style={{ color: "#ef4444", fontSize: "12.5px",
                    margin: "6px 0 14px" }}>
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}

          {pwError && (
            <p role="alert" style={{ color: "#ef4444", fontSize: "13px",
              marginBottom: "14px" }}>
              ⚠️ {pwError}
            </p>
          )}
          {pwDone && (
            <p style={{ color: "#22c55e", fontSize: "13px", marginBottom: "14px" }}>
              ✅ Password changed. Other devices have been signed out.
            </p>
          )}

          <button type="submit" disabled={pwSaving} style={{
            width: "100%", padding: "12px", background: "#1e1e2e",
            border: "1px solid #2e2e3e", borderRadius: "8px",
            color: "#fff", fontSize: "14px", fontWeight: "600",
            fontFamily: "inherit",
            cursor: pwSaving ? "not-allowed" : "pointer",
            opacity: pwSaving ? 0.7 : 1 }}>
            {pwSaving ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
