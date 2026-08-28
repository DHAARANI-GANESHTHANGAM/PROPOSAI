import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/auth";

/**
 * Sequential ramp for an ordered scale (Excellent -> Challenging), not a
 * categorical palette: the ratings have an inherent order, so one hue getting
 * lighter reads correctly where four unrelated hues would not. Every bar is
 * also directly labelled, so colour never carries the meaning on its own.
 */
const RATING_RAMP = {
  Excellent:   "#6366f1",
  Strong:      "#818cf8",
  Moderate:    "#a5b4fc",
  Challenging: "#c7d2fe",
};

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch("/api/history/stats");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Could not load your dashboard (${res.status})`);
        }
        setStats(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const card = {
    background: "#111118", border: "1px solid #1e1e2e",
    borderRadius: "12px", padding: "20px",
  };

  const StatTile = ({ label, value, sub }) => (
    <div style={{ ...card, background: "#0d0d14" }}>
      <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px",
        textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
      <div style={{ fontSize: "30px", fontWeight: "700", color: "#fff",
        lineHeight: 1.1 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: "12px", color: "#444", marginTop: "6px",
          lineHeight: 1.5 }}>{sub}</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: "980px" }}>
        <div style={{ textAlign: "center", padding: "80px 0",
          color: "#444", fontSize: "14px" }}>Loading your dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ maxWidth: "980px" }}>
        <div style={{ background: "#1a0d0d", border: "1px solid #3a1a1a",
          borderRadius: "8px", padding: "12px 16px",
          color: "#ef4444", fontSize: "13px" }}>⚠️ {error}</div>
      </div>
    );
  }

  const empty = !stats || stats.total === 0;
  const maxCount = Math.max(1, ...(stats?.ratings || []).map((r) => r.count));

  return (
    <div className="page" style={{ maxWidth: "980px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#fff",
          marginBottom: "6px" }}>Dashboard</h1>
        <p style={{ color: "#555", fontSize: "14px" }}>
          How your proposals are doing
        </p>
      </div>

      {empty ? (
        <div style={{ ...card, textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "40px", marginBottom: "14px" }}>📊</div>
          <p style={{ color: "#ccc", fontSize: "15px", marginBottom: "6px" }}>
            Nothing to show yet
          </p>
          <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.6 }}>
            Generate a proposal and save it — your numbers appear here.
          </p>
          <button onClick={() => navigate("/")} style={{
            marginTop: "20px", padding: "10px 24px", background: "#6366f1",
            border: "none", borderRadius: "8px", color: "#fff",
            fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}>
            Generate one →
          </button>
        </div>
      ) : (
        <>
          {/* KPI row — headline numbers are stat tiles, not a chart */}
          <div className="stats-grid" style={{ marginBottom: "16px" }}>
            <StatTile label="Proposals saved" value={stats.total} />
            <StatTile label="This month" value={stats.this_month} />
            <StatTile
              label="Avg win score"
              value={stats.average_score === null ? "—" : stats.average_score}
              sub={
                stats.average_score === null
                  ? "No scored proposals yet"
                  : `AI estimate across ${stats.scored_count} proposal${stats.scored_count === 1 ? "" : "s"}`
              }
            />
            <StatTile
              label="Strong bids"
              value={stats.strong_count}
              sub="Rated Excellent or Strong"
            />
          </div>

          <p style={{ color: "#3a3a4a", fontSize: "11.5px", lineHeight: 1.6,
            marginBottom: "28px" }}>
            Win score is the AI's estimate of how competitive a bid looks before
            you send it — not a record of what you actually won.
          </p>

          <div className="dash-split" style={{ display: "grid", gap: "16px" }}>
            {/* Ordered scale — sequential ramp, direct labels on every bar */}
            <div style={card}>
              <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#fff",
                marginBottom: "18px" }}>Win score ratings</h2>

              {stats.ratings.every((r) => r.count === 0) ? (
                <p style={{ color: "#444", fontSize: "13px" }}>
                  No rated proposals yet.
                </p>
              ) : (
                stats.ratings.map(({ rating, count }) => (
                  <div key={rating} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "baseline", marginBottom: "6px" }}>
                      <span style={{ color: "#9a9ab0", fontSize: "13px" }}>{rating}</span>
                      <span style={{ color: "#fff", fontSize: "13px",
                        fontWeight: "600" }}>{count}</span>
                    </div>
                    <div style={{ background: "#0d0d14", borderRadius: "4px",
                      height: "8px", overflow: "hidden" }}>
                      <div style={{
                        width: `${(count / maxCount) * 100}%`,
                        height: "100%",
                        background: RATING_RAMP[rating],
                        borderRadius: "4px",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent proposals */}
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "baseline", marginBottom: "18px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                  Recent proposals
                </h2>
                <button onClick={() => navigate("/history")} style={{
                  background: "none", border: "none", padding: 0,
                  color: "#6366f1", fontSize: "12px", fontFamily: "inherit",
                  cursor: "pointer" }}>
                  View all →
                </button>
              </div>

              {stats.recent.map((item) => (
                <div key={item.id} style={{ display: "flex", gap: "12px",
                  justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderTop: "1px solid #1a1a26" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#ccc", fontSize: "13px",
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ color: "#444", fontSize: "11.5px", marginTop: "2px" }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : ""}
                    </div>
                  </div>
                  {item.score !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px",
                      flexShrink: 0 }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%",
                        background: RATING_RAMP[item.rating] || "#2e2e45" }} />
                      <span style={{ color: "#fff", fontSize: "13px",
                        fontWeight: "600" }}>{item.score}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
