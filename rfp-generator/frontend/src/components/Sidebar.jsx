import { NavLink } from "react-router-dom";
import { logout } from "../utils/auth";

const links = [
  { to: "/",        icon: "⚡", label: "Generate" },
  { to: "/profile", icon: "🏢", label: "Company Profile" },
  { to: "/history", icon: "📁", label: "History"  },
];

export default function Sidebar({session}) {

  const handleLogout = () => {
    logout();
  };
  return (
    <aside style={{
      position: "fixed", top: 0, left: 0,
      width: "240px", height: "100vh",
      background: "#111118",
      borderRight: "1px solid #1e1e2e",
      display: "flex", flexDirection: "column",
      padding: "24px 16px", zIndex: 100,
    }}>

      {/* Logo */}
      <div style={{ marginBottom: "40px", padding: "0 8px" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", letterSpacing: "-0.5px" }}>
          Propos<span style={{ color: "#6366f1" }}>AI</span>
        </div>
        <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>
          Proposal Generator
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#444", fontWeight: "600",
          letterSpacing: "1px", marginBottom: "8px", paddingLeft: "8px" }}>
          MENU
        </div>
        {links.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 12px", borderRadius: "8px", marginBottom: "4px",
            textDecoration: "none", fontSize: "14px", fontWeight: "500",
            color: isActive ? "#fff" : "#888",
            background: isActive ? "#1e1e2e" : "transparent",
            borderLeft: isActive ? "2px solid #6366f1" : "2px solid transparent",
            transition: "all 0.15s",
          })}>
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

           {/* User Info */}
      <div style={{ marginBottom: "12px", padding: "12px",
        background: "#0d0d14", borderRadius: "8px",
        border: "1px solid #1e1e2e" }}>
        <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>
          Logged in as
        </div>
        <div style={{ fontSize: "12px", color: "#888",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session?.user?.email}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} style={{
        width: "100%", padding: "10px", background: "#1a0d0d",
        border: "1px solid #3a1a1a", borderRadius: "8px",
        color: "#ef4444", fontSize: "13px", fontWeight: "500",
        cursor: "pointer" }}>
        Sign Out
      </button>
    </aside>
  );
}