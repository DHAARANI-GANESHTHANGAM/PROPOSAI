import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#111118", border: "1px solid #1e1e2e",
    borderRadius: "12px", padding: "24px", ...style,
  }}>
    {children}
  </div>
);

export default function Home() {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState("upload");
  const [pastedText, setPasted] = useState("");
  const navigate                = useNavigate();

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true); setError("");
    try {
      const companyProfile = localStorage.getItem("company_profile");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profile", JSON.stringify(
        companyProfile ? JSON.parse(companyProfile) : {}
      ));
      const res = await axios.post(`${API_URL}/api/generate`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // const formData = new FormData();
      // formData.append("file", file);
      // const res = await axios.post(`${API_URL}/api/generate`, formData, {
      //   headers: { "Content-Type": "multipart/form-data" },
      // });
      localStorage.setItem("rfp_result", JSON.stringify(res.data));
      navigate("/response");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }, [navigate]);

  const handlePasteSubmit = async () => {
    if (!pastedText || pastedText.length < 50) {
      setError("Please paste more RFP content."); return;
    }
    setLoading(true); setError("");
    try {
      // const res = await axios.post(`${API_URL}/api/generate-text`, { text: pastedText });
      const companyProfile = localStorage.getItem("company_profile");
      const res = await axios.post(`${API_URL}/api/generate-text`, {
        text: pastedText,
        profile: companyProfile ? JSON.parse(companyProfile) : {}
      });
      localStorage.setItem("rfp_result", JSON.stringify(res.data));
      navigate("/response");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"], },maxFiles: 1,
  });

  return (
    <div className="page" style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#fff",
          letterSpacing: "-0.5px", marginBottom: "8px" }}>
          Generate Proposal
        </h1>
        <p style={{ color: "#555", fontSize: "15px" }}>
          Upload your RFP and ProposAI will draft a winning proposal in seconds.
        </p>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: "32px" }}>
        {[
          // { label: "AI Sections", value: "3", sub: "Executive, Technical, Timeline" },
          // { label: "Processing Time", value: "~20s", sub: "Using Gemini + RAG" },
          // { label: "Export Format", value: "PDF", sub: "Editable before export" },
          { label: "Time Saved", value: "3hrs", sub: "vs writing manually" },
          { label: "Proposal Sections", value: "4", sub: "Ready to edit and export" },
          { label: "File Formats", value: "4+", sub: "PDF, DOCX, DOC, TXT" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "#0d0d14",
            border: "1px solid #1e1e2e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px",
              textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#6366f1" }}>{value}</div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "4px" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="tab-bar" style={{ display: "flex", gap: "4px", marginBottom: "16px",
        background: "#0d0d14", padding: "4px", borderRadius: "8px",
        border: "1px solid #1e1e2e", width: "fit-content" }}>
        {["upload", "paste"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "6px", border: "none",
            cursor: "pointer", fontSize: "13px", fontWeight: "500",
            background: tab === t ? "#6366f1" : "transparent",
            color: tab === t ? "#fff" : "#555",
            transition: "all 0.15s",
          }}>
            {t === "upload" ? "📄 Upload Document" : "✏️ Paste Text"}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      {tab === "upload" && (
        <Card>
          <div {...getRootProps()} className="dropzone" style={{
            border: `2px dashed ${isDragActive ? "#6366f1" : "#1e1e2e"}`,
            borderRadius: "10px", textAlign: "center",
            cursor: "pointer", background: isDragActive ? "#13131f" : "transparent",
            transition: "all 0.2s",
          }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
            <p style={{ color: "#ccc", fontSize: "16px", marginBottom: "4px" }}>
              {isDragActive ? "Drop it here..." : "Drag & drop your RFP Document"}
            </p>
            <p style={{ color: "#444", fontSize: "10px" }}>
              Supports PDF, DOCX, DOC, TX</p>
            <div style={{ marginTop: "20px", display: "inline-block",
              padding: "8px 20px", background: "#6366f1", borderRadius: "6px",
              color: "#fff", fontSize: "13px", fontWeight: "500" }}>
              Browse Files
            </div>
          </div>
        </Card>
      )}

      {/* Paste Area */}
      {tab === "paste" && (
        <Card>
          <textarea value={pastedText} onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste your RFP text here..."
            style={{ width: "100%", height: "200px", background: "#0d0d14",
              border: "1px solid #1e1e2e", borderRadius: "8px", padding: "16px",
              color: "#ccc", fontSize: "14px", resize: "none",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          <button onClick={handlePasteSubmit} disabled={loading} style={{
            marginTop: "12px", width: "100%", padding: "12px",
            background: loading ? "#333" : "#6366f1", border: "none",
            borderRadius: "8px", color: "#fff", fontSize: "14px",
            fontWeight: "600", cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "⚙️ Generating..." : "Generate Response →"}
          </button>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "#6366f1", marginBottom: "8px" }}>
            ⚙️ AI agent is processing your RFP...
          </div>
          <div style={{ background: "#1e1e2e", borderRadius: "4px", height: "4px", overflow: "hidden" }}>
            <div style={{ background: "#6366f1", height: "100%", width: "60%",
              animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
          <p style={{ color: "#444", fontSize: "12px", marginTop: "8px" }}>
            This takes 15–30 seconds
          </p>
        </div>
      )}

      {error && <p style={{ color: "#ef4444", marginTop: "12px", fontSize: "13px" }}>{error}</p>}
    </div>
  );
}