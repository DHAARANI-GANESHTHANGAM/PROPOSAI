import { useState } from "react";
import { login, signup } from "../utils/auth";

export default function Landing() {
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
      // Reload so App re-reads the stored token and mounts the app shell.
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const steps = [
    { icon: "📄", title: "Upload Your RFP",     desc: "Upload any PDF, DOCX, or TXT file — or paste the text directly."        },
    { icon: "🤖", title: "AI Reads & Analyzes", desc: "Our RAG-powered AI reads every section deeply and understands the requirements." },
    { icon: "✍️", title: "Draft is Generated",  desc: "A full professional proposal is written in seconds — personalized to your company." },
    { icon: "📤", title: "Edit & Export",        desc: "Review, edit the draft, check your Win Score, then export as PDF."       },
  ];

  const faqs = [
    { q: "What is an RFP?",
      a: "A Request for Proposal (RFP) is a document that a company publishes when they need a service or product. They invite other businesses to submit proposals explaining how they would deliver the work and at what cost. Winning an RFP means winning a contract." },
    { q: "Why is responding to RFPs hard?",
      a: "Writing a proposal response takes 3–5 hours on average. You need to read the entire RFP carefully, understand what the client wants, then write a professional, personalized response covering multiple sections — all while competing against other companies." },
    { q: "How does RFPAI help?",
      a: "RFPAI reads your RFP document automatically using AI, understands the requirements, and drafts a complete professional proposal response in under 30 seconds. It uses your company profile to personalize every response so it sounds like your team wrote it." },
    { q: "Is my data secure?",
      a: "Yes. Your documents and proposals are stored in your private database. Each user only sees their own data. API keys and sensitive credentials are never exposed to the frontend." },
  ];

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#fff" }}>

      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "20px 60px",
        borderBottom: "1px solid #1e1e2e", position: "sticky",
        top: 0, background: "#0a0a0f", zIndex: 100 }}>
        <div style={{ fontSize: "22px", fontWeight: "700" }}>
          Propos<span style={{ color: "#6366f1" }}>AI</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setTab("login"); document.getElementById("auth").scrollIntoView({ behavior: "smooth" }); }}
            style={{ padding: "8px 20px", background: "transparent",
              border: "1px solid #1e1e2e", borderRadius: "8px",
              color: "#888", fontSize: "13px", cursor: "pointer" }}>
            Sign In
          </button>
          <button onClick={() => { setTab("signup"); document.getElementById("auth").scrollIntoView({ behavior: "smooth" }); }}
            style={{ padding: "8px 20px", background: "#6366f1",
              border: "none", borderRadius: "8px",
              color: "#fff", fontSize: "13px",
              fontWeight: "600", cursor: "pointer" }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ textAlign: "center", padding: "100px 60px 80px" }}>
        <div style={{ display: "inline-block", padding: "6px 16px",
          background: "#13131f", border: "1px solid #2e2e5e",
          borderRadius: "20px", fontSize: "12px", color: "#6366f1",
          marginBottom: "24px" }}>
          ✨ AI-Powered Proposal Generator
        </div>
        <h1 style={{ fontSize: "56px", fontWeight: "700",
          lineHeight: "1.2", marginBottom: "24px",
          letterSpacing: "-1px", maxWidth: "700px", margin: "0 auto 24px" }}>
          Stop Writing Proposals{" "}
          <span style={{ color: "#6366f1" }}>Manually.</span>
        </h1>
        <p style={{ color: "#555", fontSize: "18px", maxWidth: "500px",
          margin: "0 auto 40px", lineHeight: "1.7" }}>
          Upload an RFP document and our AI agent drafts a complete,
          professional proposal response in under 30 seconds.
        </p>
        <div style={{ display: "flex", gap: "12px",
          justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setTab("signup"); document.getElementById("auth").scrollIntoView({ behavior: "smooth" }); }}
            style={{ padding: "14px 32px", background: "#6366f1",
              border: "none", borderRadius: "10px", color: "#fff",
              fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
            Get Started Free →
          </button>
          <button onClick={() => document.getElementById("what-is-rfp").scrollIntoView({ behavior: "smooth" })}
            style={{ padding: "14px 32px", background: "transparent",
              border: "1px solid #1e1e2e", borderRadius: "10px",
              color: "#888", fontSize: "15px", cursor: "pointer" }}>
            What is an RFP?
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "40px", justifyContent: "center",
          marginTop: "60px", flexWrap: "wrap" }}>
          {[
            { value: "30s",  label: "To generate a proposal" },
            { value: "3hrs", label: "Saved per RFP"          },
            { value: "100%", label: "Personalized to you"    },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "700",
                color: "#6366f1" }}>{value}</div>
              <div style={{ fontSize: "13px", color: "#555",
                marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What is an RFP */}
      <div id="what-is-rfp" style={{ padding: "80px 60px",
        background: "#0d0d14", borderTop: "1px solid #1e1e2e",
        borderBottom: "1px solid #1e1e2e" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "700",
            marginBottom: "24px", textAlign: "center" }}>
            What is an <span style={{ color: "#6366f1" }}>RFP?</span>
          </h2>
          <p style={{ color: "#888", fontSize: "16px", lineHeight: "1.9",
            marginBottom: "24px", textAlign: "center" }}>
            A <strong style={{ color: "#fff" }}>Request for Proposal (RFP)</strong> is
            a document published by a company or government when they need
            a service or product. They invite businesses to submit proposals
            explaining how they would deliver the work — and at what cost.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px", marginTop: "40px" }}>
            {[
              { icon: "🏛️", title: "Who publishes RFPs?", desc: "Government agencies, hospitals, banks, large corporations — any organization that needs to hire a vendor fairly and transparently." },
              { icon: "💼", title: "Who responds to RFPs?", desc: "Software companies, consulting firms, agencies, and freelancers who want to win the contract and deliver the project." },
              { icon: "🏆", title: "What happens if you win?", desc: "You get the contract! Winning an RFP means guaranteed revenue, long-term partnerships, and business growth." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: "#111118",
                border: "1px solid #1e1e2e", borderRadius: "12px",
                padding: "24px" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
                <h3 style={{ fontSize: "15px", fontWeight: "600",
                  marginBottom: "8px", color: "#fff" }}>{title}</h3>
                <p style={{ color: "#555", fontSize: "13px",
                  lineHeight: "1.7" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ padding: "80px 60px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "700",
            marginBottom: "8px", textAlign: "center" }}>
            How It <span style={{ color: "#6366f1" }}>Works</span>
          </h2>
          <p style={{ color: "#555", textAlign: "center",
            marginBottom: "48px", fontSize: "15px" }}>
            From document to proposal in 4 simple steps
          </p>
          <div style={{ display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px" }}>
            {steps.map(({ icon, title, desc }, i) => (
              <div key={title} style={{ background: "#111118",
                border: "1px solid #1e1e2e", borderRadius: "12px",
                padding: "24px", position: "relative" }}>
                <div style={{ position: "absolute", top: "16px", right: "16px",
                  fontSize: "11px", color: "#333", fontWeight: "700" }}>
                  0{i + 1}
                </div>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
                <h3 style={{ fontSize: "14px", fontWeight: "600",
                  marginBottom: "8px", color: "#fff" }}>{title}</h3>
                <p style={{ color: "#555", fontSize: "13px",
                  lineHeight: "1.7" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: "80px 60px", background: "#0d0d14",
        borderTop: "1px solid #1e1e2e" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "700",
            marginBottom: "48px", textAlign: "center" }}>
            Frequently Asked <span style={{ color: "#6366f1" }}>Questions</span>
          </h2>
          {faqs.map(({ q, a }) => (
            <div key={q} style={{ marginBottom: "24px",
              background: "#111118", border: "1px solid #1e1e2e",
              borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600",
                color: "#fff", marginBottom: "12px" }}>{q}</h3>
              <p style={{ color: "#666", fontSize: "14px",
                lineHeight: "1.8" }}>{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Auth Section */}
      <div id="auth" style={{ padding: "80px 60px",
        borderTop: "1px solid #1e1e2e" }}>
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700",
            textAlign: "center", marginBottom: "8px" }}>
            {tab === "login" ? "Welcome Back" : "Get Started Free"}
          </h2>
          <p style={{ color: "#555", textAlign: "center",
            fontSize: "14px", marginBottom: "32px" }}>
            {tab === "login" ? "Sign in to your account" : "Create your free account today"}
          </p>

          {/* Tab Switcher */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "24px",
            background: "#0d0d14", padding: "4px", borderRadius: "8px",
            border: "1px solid #1e1e2e" }}>
            {["login", "signup"].map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "8px", borderRadius: "6px",
                  border: "none", cursor: "pointer", fontSize: "13px",
                  fontWeight: "500",
                  background: tab === t ? "#6366f1" : "transparent",
                  color: tab === t ? "#fff" : "#555" }}>
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Inputs */}
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

          {error   && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
          {success && <p style={{ color: "#22c55e", fontSize: "13px", marginBottom: "16px" }}>{success}</p>}

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

      {/* Footer */}
      <div style={{ padding: "24px 60px", borderTop: "1px solid #1e1e2e",
        display: "flex", justifyContent: "space-between",
        alignItems: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: "700" }}>
          Propos<span style={{ color: "#6366f1" }}>AI</span>
        </div>
        <div style={{ color: "#333", fontSize: "12px" }}>
          © 2026 PrposAI. All rights reserved.
        </div>
      </div>

    </div>
  );
}