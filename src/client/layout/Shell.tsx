import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Receipt, LayoutDashboard } from "lucide-react";
import { C } from "../lib/theme.js";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/billing", label: "Facturacion", icon: Receipt },
];

export default function Shell() {
  const location = useLocation();
  // Hide sidebar on account detail for more space
  const isDetail = location.pathname.startsWith("/account/");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: isDetail ? 60 : 200,
        background: "#0c0c14",
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        flexShrink: 0,
      }}>
        <div style={{
          padding: isDetail ? "20px 10px" : "20px 18px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: isDetail ? "center" : "flex-start",
        }}>
          <BarChart3 size={22} style={{ color: C.blue }} />
          {!isDetail && <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Ads 360</span>}
        </div>
        <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: isDetail ? "10px 0" : "10px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              justifyContent: isDetail ? "center" : "flex-start",
              background: isActive ? C.blue + "18" : "transparent",
              color: isActive ? C.blue : C.textSec,
              transition: "all 0.15s ease",
            })}>
              <item.icon size={18} />
              {!isDetail && item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
