import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/auth";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  // Deleting is irreversible, so both delete actions ask once inline rather
  // than firing on the first click. A native confirm() would block the page.
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await authFetch("/api/history");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Could not load history (${res.status})`);
        }
        const data = await res.json();
        setHistory(data.history);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const loadResponse = (item) => {
    // Prefer the edited draft the user saved, falling back to the original
    localStorage.setItem("rfp_result", JSON.stringify({
      ...item,
      drafted_response: item.edited || item.drafted_response,
    }));
    navigate("/response");
  };

  const deleteItem = async (id) => {
    setError("");
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Could not delete this response (${res.status})`);
      }
      // Drop it locally rather than refetching the whole list.
      setHistory((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  const clearHistory = async () => {
    setError("");
    setClearing(true);
    try {
      const res = await authFetch("/api/history", { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not clear history (${res.status})`);
      setHistory([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  };

  const dangerButton = {
    padding: "8px 14px", background: "#1a0d0d",
    border: "1px solid #3a1a1a", borderRadius: "6px",
    color: "#ef4444", fontSize: "13px", fontFamily: "inherit",
    cursor: "pointer",
  };

  const quietButton = {
    padding: "8px 14px", background: "transparent",
    border: "1px solid #2e2e3e", borderRadius: "6px",
    color: "#888", fontSize: "13px", fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <div className="page" style={{ maxWidth: "860px" }}>
      <div className="head-row" style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700",
            color: "#fff", marginBottom: "6px" }}>History</h1>
          <p style={{ color: "#555", fontSize: "14px" }}>
            Your previously generated RFP responses
          </p>
        </div>

        {history.length > 0 && (
          confirmingClear ? (
            <div className="btn-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>
                Delete all {history.length}?
              </span>
              <button onClick={clearHistory} disabled={clearing} style={dangerButton}>
                {clearing ? "Deleting…" : "Yes, delete all"}
              </button>
              <button onClick={() => setConfirmingClear(false)} disabled={clearing}
                style={quietButton}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingClear(true)} style={dangerButton}>
              Clear All
            </button>
          )
        )}
      </div>

      {error && (
        <div style={{ background: "#1a0d0d", border: "1px solid #3a1a1a",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
          color: "#ef4444", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0",
          color: "#444", fontSize: "14px" }}>
          Loading your history...
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📁</div>
          <p style={{ color: "#444", fontSize: "15px" }}>No history yet</p>
          <p style={{ color: "#333", fontSize: "13px", marginTop: "4px" }}>
            Generate a response and click Save to see it here
          </p>
          <button onClick={() => navigate("/")} style={{
            marginTop: "20px", padding: "10px 24px",
            background: "#6366f1", border: "none", borderRadius: "8px",
            color: "#fff", fontSize: "13px", cursor: "pointer",
          }}>Generate Now →</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {history.map((item, i) => (
            <div key={item.id} className="head-row" style={{ background: "#111118",
              border: "1px solid #1e1e2e", borderRadius: "12px",
              padding: "20px", display: "flex", gap: "12px",
              justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: "14px",
                  fontWeight: "500", marginBottom: "4px" }}>
                  {item.filename || `RFP Response #${history.length - i}`}
                </div>
                <div style={{ color: "#444", fontSize: "12px" }}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : ""}
                </div>
              </div>

              <div className="btn-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {confirmingId === item.id ? (
                  <>
                    <span style={{ color: "#888", fontSize: "13px" }}>Delete?</span>
                    <button onClick={() => deleteItem(item.id)}
                      disabled={deletingId === item.id} style={dangerButton}>
                      {deletingId === item.id ? "Deleting…" : "Yes"}
                    </button>
                    <button onClick={() => setConfirmingId(null)}
                      disabled={deletingId === item.id} style={quietButton}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => loadResponse(item)} style={{
                      padding: "8px 16px", background: "#1e1e2e",
                      border: "1px solid #2e2e3e", borderRadius: "6px",
                      color: "#6366f1", fontSize: "13px", fontFamily: "inherit",
                      fontWeight: "500", cursor: "pointer",
                    }}>View →</button>
                    <button onClick={() => { setError(""); setConfirmingId(item.id); }}
                      aria-label={`Delete ${item.filename || "this response"}`}
                      title="Delete"
                      style={dangerButton}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
