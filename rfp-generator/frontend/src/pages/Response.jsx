import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { authFetch, getCompanyProfile } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Response() {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const [rfpText, setRfpText]           = useState("");
  const [result, setResult]             = useState(null);
  const [edited, setEdited]             = useState("");
  const [tab, setTab]                   = useState("response");
  const [saved, setSaved]               = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState("");
  const [winScore, setWinScore]         = useState(null);
  const [exporting, setExporting]       = useState(false);
  const [companyName, setCompanyName]   = useState("");
  const navigate                        = useNavigate();

  useEffect(() => {
    const data = localStorage.getItem("rfp_result");
    if (!data) { navigate("/"); return; }
    const parsed = JSON.parse(data);
    setResult(parsed);
    setEdited(parsed.drafted_response);
    if (parsed.win_score) setWinScore(parsed.win_score);
    if (parsed.rfp_text) setRfpText(parsed.rfp_text);
  }, [navigate]);

  useEffect(() => {
    // Only for naming and titling the export; a failure here is harmless.
    getCompanyProfile()
      .then((profile) => setCompanyName(profile?.companyName || ""))
      .catch(() => {});
  }, []);

  const exportDocx = async () => {
    if (exporting) return;
    setExporting(true);
    setSaveError("");
    try {
      const res = await authFetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: edited,
          company_name: companyName,
          source_filename: result?.filename || "",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Could not build the Word file (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stem = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      link.href = url;
      link.download = stem ? `${stem}-proposal.docx` : "proposal.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(edited, 180), 15, 20);
    doc.save("proposai-response.pdf");
  };

  const saveToHistory = async () => {
    if (saving || saved) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await authFetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfp_summary: result.rfp_summary || "",
          drafted_response: result.drafted_response || "",
          sections: result.sections || {},
          win_score: result.win_score || {},
          filename: result.filename || null,
          rfp_text: rfpText || null,
          edited,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Save failed (${res.status})`);
      }
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);
    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          rfp_text: result.rfp_summary
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 429
            ? "You've asked a lot of questions this hour. Please try again later."
            : body.detail || `Something went wrong (${res.status}).`
        );
      }

      const data = await res.json();
      setChatMessages(prev => [...prev,
        { role: "assistant", content: data.answer }
      ]);
    } catch (err) {
      setChatMessages(prev => [...prev,
        { role: "assistant", content: err.message || "Sorry, something went wrong. Please try again." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (!result) return null;

  const tabs = ["summary", "response", "sections", "win score", "chat"];

  return (
    <div className="page" style={{ maxWidth: "900px" }}>

      {/* Header */}
      <div className="head-row" style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "16px", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#fff",
            marginBottom: "6px" }}>Your Proposal Response</h1>
          <p style={{ color: "#555", fontSize: "14px" }}>
            Review, edit, and export your AI-drafted proposal
          </p>
        </div>
        <div className="btn-row" style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/")} style={{
            padding: "9px 16px", background: "#111118",
            border: "1px solid #1e1e2e", borderRadius: "8px",
            color: "#888", fontSize: "13px", cursor: "pointer" }}>
            ← New RFP
          </button>
          <button onClick={saveToHistory} disabled={saving || saved} style={{
            padding: "9px 16px",
            background: saved ? "#1a2e1a" : "#111118",
            border: `1px solid ${saved ? "#22c55e" : "#1e1e2e"}`,
            borderRadius: "8px",
            color: saved ? "#22c55e" : "#888",
            fontSize: "13px",
            cursor: saving || saved ? "default" : "pointer",
            opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : saved ? "✅ Saved" : "💾 Save"}
          </button>
          <button onClick={exportDocx} disabled={exporting} style={{
            padding: "9px 16px", background: "#111118",
            border: "1px solid #2e2e3e", borderRadius: "8px",
            color: exporting ? "#555" : "#ccc", fontSize: "13px",
            fontWeight: "500", fontFamily: "inherit",
            cursor: exporting ? "default" : "pointer" }}>
            {exporting ? "Building…" : "📝 Export Word"}
          </button>
          <button onClick={exportPDF} style={{
            padding: "9px 16px", background: "#6366f1",
            border: "none", borderRadius: "8px",
            color: "#fff", fontSize: "13px",
            fontWeight: "600", cursor: "pointer" }}>
            ⬇️ Export PDF
          </button>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div style={{ background: "#1a0d0d", border: "1px solid #3a1a1a",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
          color: "#ef4444", fontSize: "13px" }}>
          ⚠️ {saveError}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ display: "flex", gap: "4px", marginBottom: "20px",
        background: "#0d0d14", padding: "4px", borderRadius: "8px",
        border: "1px solid #1e1e2e", width: "fit-content" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", borderRadius: "6px", border: "none",
            cursor: "pointer", fontSize: "13px", fontWeight: "500",
            background: tab === t ? "#6366f1" : "transparent",
            color: tab === t ? "#fff" : "#555",
            textTransform: "capitalize", transition: "all 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {tab === "summary" && (
        <div style={{ background: "#111118", border: "1px solid #1e1e2e",
          borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ color: "#6366f1", fontSize: "13px", fontWeight: "600",
            letterSpacing: "1px", marginBottom: "16px" }}>RFP ANALYSIS</h3>
          <pre style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.8",
            whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {result.rfp_summary}
          </pre>
        </div>
      )}

      {/* Response Tab */}
      {tab === "response" && (
        <div>
          <p style={{ color: "#555", fontSize: "13px", marginBottom: "12px" }}>
            ✏️ Edit the draft below before exporting
          </p>
          <textarea value={edited}
            className="editor-area"
            onChange={(e) => { setEdited(e.target.value); setSaved(false); }}
            style={{ width: "100%",
              background: "#111118", border: "1px solid #1e1e2e",
              borderRadius: "12px", padding: "24px", color: "#ccc",
              fontSize: "14px", lineHeight: "1.8", resize: "none",
              outline: "none", fontFamily: "monospace",
              boxSizing: "border-box" }} />
        </div>
      )}

      {/* Sections Tab */}
      {tab === "sections" && result.sections && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {Object.entries(result.sections).map(([key, value]) => (
            <div key={key} style={{ background: "#111118",
              border: "1px solid #1e1e2e", borderRadius: "12px",
              padding: "24px" }}>
              <h3 style={{ color: "#6366f1", fontSize: "12px", fontWeight: "600",
                letterSpacing: "1px", marginBottom: "12px",
                textTransform: "uppercase" }}>
                {key.replace(/_/g, " ")}
              </h3>
              <p style={{ color: "#aaa", fontSize: "14px",
                lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Win Score Tab */}
      {tab === "win score" && winScore && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Score Card */}
          <div style={{ background: "#111118", border: "1px solid #1e1e2e",
            borderRadius: "12px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#555",
              letterSpacing: "1px", marginBottom: "12px" }}>WIN PROBABILITY</div>
            <div style={{ fontSize: "72px", fontWeight: "700",
              color: parseInt(winScore.SCORE) >= 70 ? "#22c55e" :
                     parseInt(winScore.SCORE) >= 50 ? "#f59e0b" : "#ef4444" }}>
              {winScore.SCORE}
            </div>
            <div style={{ fontSize: "14px", color: "#555",
              marginBottom: "8px" }}>out of 100</div>
            <div style={{ display: "inline-block", padding: "6px 20px",
              borderRadius: "20px", fontSize: "13px", fontWeight: "600",
              background: parseInt(winScore.SCORE) >= 70 ? "#14532d" :
                          parseInt(winScore.SCORE) >= 50 ? "#451a03" : "#450a0a",
              color: parseInt(winScore.SCORE) >= 70 ? "#22c55e" :
                     parseInt(winScore.SCORE) >= 50 ? "#f59e0b" : "#ef4444" }}>
              {winScore.RATING}
            </div>
          </div>

          {/* Strengths */}
          <div style={{ background: "#111118", border: "1px solid #1e1e2e",
            borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: "#22c55e", fontSize: "13px", fontWeight: "600",
              letterSpacing: "1px", marginBottom: "16px" }}>✅ STRENGTHS</h3>
            {[winScore.STRENGTH_1, winScore.STRENGTH_2, winScore.STRENGTH_3]
              .filter(Boolean).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "10px",
                marginBottom: "12px", alignItems: "flex-start" }}>
                <span style={{ color: "#22c55e", fontSize: "16px" }}>→</span>
                <p style={{ color: "#aaa", fontSize: "14px",
                  lineHeight: "1.6", margin: 0 }}>{s}</p>
              </div>
            ))}
          </div>

          {/* Challenges */}
          <div style={{ background: "#111118", border: "1px solid #1e1e2e",
            borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: "#f59e0b", fontSize: "13px", fontWeight: "600",
              letterSpacing: "1px", marginBottom: "16px" }}>⚠️ CHALLENGES</h3>
            {[winScore.CHALLENGE_1, winScore.CHALLENGE_2]
              .filter(Boolean).map((c, i) => (
              <div key={i} style={{ display: "flex", gap: "10px",
                marginBottom: "12px", alignItems: "flex-start" }}>
                <span style={{ color: "#f59e0b", fontSize: "16px" }}>→</span>
                <p style={{ color: "#aaa", fontSize: "14px",
                  lineHeight: "1.6", margin: 0 }}>{c}</p>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          {winScore.RECOMMENDATION && (
            <div style={{ background: "#13131f", border: "1px solid #2e2e5e",
              borderRadius: "12px", padding: "20px",
              display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "20px" }}>💡</span>
              <p style={{ color: "#8888cc", fontSize: "14px",
                lineHeight: "1.6", margin: 0 }}>
                <strong style={{ color: "#6366f1" }}>Recommendation: </strong>
                {winScore.RECOMMENDATION}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="chat-col" style={{ display: "flex", flexDirection: "column" }}>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px",
            display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* Welcome Message */}
            {chatMessages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>💬</div>
                <p style={{ color: "#555", fontSize: "14px" }}>
                  Ask anything about your RFP document
                </p>
                <div style={{ display: "flex", flexWrap: "wrap",
                  gap: "8px", justifyContent: "center", marginTop: "20px" }}>
                  {[
                    "What is the budget?",
                    "Who is the client?",
                    "What is the deadline?",
                    "What are the technical requirements?",
                  ].map((q) => (
                    <button key={q} onClick={() => setChatInput(q)}
                      style={{ padding: "8px 14px", background: "#111118",
                        border: "1px solid #1e1e2e", borderRadius: "20px",
                        color: "#888", fontSize: "12px", cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%", padding: "12px 16px",
                  borderRadius: msg.role === "user"
                    ? "12px 12px 0 12px"
                    : "12px 12px 12px 0",
                  background: msg.role === "user" ? "#6366f1" : "#111118",
                  border: msg.role === "user" ? "none" : "1px solid #1e1e2e",
                  fontSize: "14px", lineHeight: "1.6",
                  color: msg.role === "user" ? "#fff" : "#ccc" }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "12px 16px", background: "#111118",
                  border: "1px solid #1e1e2e", borderRadius: "12px 12px 12px 0",
                  color: "#555", fontSize: "14px" }}>
                  Thinking...
                </div>
              </div>
            )}

          </div> {/* End Messages Area */}

          {/* Input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              placeholder="Ask anything about your RFP..."
              style={{ flex: 1, padding: "12px 16px",
                background: "#111118", border: "1px solid #1e1e2e",
                borderRadius: "8px", color: "#fff", fontSize: "14px",
                outline: "none" }} />
            <button onClick={handleChat} disabled={chatLoading}
              style={{ padding: "12px 20px", background: "#6366f1",
                border: "none", borderRadius: "8px", color: "#fff",
                fontSize: "14px", cursor: "pointer", fontWeight: "600" }}>
              Send
            </button>
          </div>

        </div> 
      )}

    </div>
  );
}