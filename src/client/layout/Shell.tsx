import { NavLink, Outlet } from "react-router-dom";
import { C } from "../lib/theme.js";

const navItems = [
  { to: "/", label: "Ads" },
  { to: "/billing", label: "Facturacion" },
];

export default function Shell() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.white }}>Agencia General</span>
          <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} style={({ isActive }) => ({
                padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                textDecoration: "none",
                background: isActive ? C.blue : "transparent",
                color: isActive ? C.white : C.textSec,
              })}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
        {/* Right side slot filled by child pages via context or props */}
        <div id="nav-right" />
      </nav>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px" }}>
        <Outlet />
      </div>
    </div>
  );
}
