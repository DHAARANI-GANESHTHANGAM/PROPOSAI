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

  useEffect(() => {
    // Restore the session from the stored JWT (verified server-side).
    fetchMe()
      .then((user) => setSession(user ? { user } : null))
      .finally(() => setLoading(false));
  }, []);

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
      <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0f" }}>
        <Sidebar session={session} />
        <main style={{ flex: 1, marginLeft: "240px" }}>
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
