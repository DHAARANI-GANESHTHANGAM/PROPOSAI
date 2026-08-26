import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchMe } from "./utils/auth";
import { initTheme } from "./utils/theme";
import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Response from "./pages/Response";
import History from "./pages/History";
import Sidebar from "./components/Sidebar";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";

// Paint the saved theme before React renders, so there's no flash of the
// wrong background on reload.
initTheme();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    // Restore the session from the stored JWT (verified server-side).
    fetchMe()
      .then((user) => setSession(user ? { user } : null))
      .finally(() => setLoading(false));
  }, []);

  // Stop the page behind the mobile drawer from scrolling while it's open.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          color: "var(--brand)",
          fontSize: "14px",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "16px",
            height: "16px",
            border: "2px solid var(--border-strong)",
            borderTopColor: "var(--brand)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        Loading…
      </div>
    );

  if (!session) return <Landing />;

  return (
    <Router>
      <div className="app-shell">
        <Sidebar
          session={session}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />

        {navOpen && (
          <div
            className="sidebar-scrim"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Phone-only top bar; index.css hides it from 900px up. */}
        <header className="app-topbar">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            style={{
              background: "transparent",
              border: "1px solid #1e1e2e",
              borderRadius: "8px",
              color: "#ccc",
              fontSize: "16px",
              lineHeight: 1,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            &#9776;
          </button>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff",
            letterSpacing: "-0.3px" }}>
            Propos<span style={{ color: "#6366f1" }}>AI</span>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/response" element={<Response />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
