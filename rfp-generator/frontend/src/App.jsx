import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchMe } from "./utils/auth";
import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Response from "./pages/Response";
import History from "./pages/History";
import Auth from "./pages/Auth";
import Sidebar from "./components/Sidebar";
import Profile from "./pages/Profile";  
import Landing from "./pages/Landing";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore the session from the stored JWT (verified server-side).
    fetchMe()
      .then((user) => setSession(user ? { user } : null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#6366f1", fontSize: "14px" }}>Loading...</div>
    </div>
  );

  if (!session) return <Landing />;
  return (
    <Router>
      <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0f" }}>
        <Sidebar session={session}/>
        <main style={{ flex: 1, marginLeft: "240px" }}>
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/response" element={<Response />} />
            <Route path="/history"  element={<History />} />
            <Route path="*"         element={<Navigate to="/" />} />
            <Route path="/profile" element={<Profile />} />   
          </Routes>
        </main>
      </div>
    </Router>
  );
}