import { useState } from "react";
import { login, signup } from "../utils/auth";

export default function Auth() {
  const [tab, setTab]         = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
        setSuccess("Account created! Signing you in...");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🤖</div>
          <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: "700" }}>
            Propos<span style={{ color: "#6366f1" }}>AI</span>
          </h1>
          <p style={{ color: "#555", fontSize: "13px", marginTop: "4px" }}>
            AI-Powered Proposal Generator
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#111118", border: "1px solid #1e1e2e",
          borderRadius: "16px", padding: "32px" }}>

          {/* Tab Switcher */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "24px",
            background: "#0d0d14", padding: "4px", borderRadius: "8px" }}>
            {["login", "signup"].map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "8px", borderRadius: "6px",
                  border: "none", cursor: "pointer", fontSize: "13px",
                  fontWeight: "500", textTransform: "capitalize",
                  background: tab === t ? "#6366f1" : "transparent",
                  color: tab === t ? "#fff" : "#555",
                  transition: "all 0.15s" }}>
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: "#555", fontSize: "12px",
              display: "block", marginBottom: "6px" }}>EMAIL</label>
            <input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "10px 14px",
                background: "#0d0d14", border: "1px solid #1e1e2e",
                borderRadius: "8px", color: "#fff", fontSize: "14px",
                outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ color: "#555", fontSize: "12px",
              display: "block", marginBottom: "6px" }}>PASSWORD</label>
            <input type="password" value={password}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px",
                background: "#0d0d14", border: "1px solid #1e1e2e",
                borderRadius: "8px", color: "#fff", fontSize: "14px",
                outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Messages */}
          {error   && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
          {success && <p style={{ color: "#22c55e", fontSize: "13px", marginBottom: "16px" }}>{success}</p>}

          {/* Button */}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "12px", background: "#6366f1",
            border: "none", borderRadius: "8px", color: "#fff",
            fontSize: "14px", fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1 }}>
            {loading ? "Please wait..." : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}