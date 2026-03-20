import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, XCircle, AlertOctagon, Info, Lightbulb } from "lucide-react";

const C = {
  bg: "#0a0a0f",
  card: "#12121a",
  cardHover: "#1a1a2e",
  border: "#1e1e2e",
  text: "#e2e2e2",
  textSec: "#8888a0",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  purple: "#a855f7",
  yellow: "#eab308",
} as const;

interface Alert {
  account: string;
  accountId: number;
  type: string;
  message: string;
  severity: "critical" | "high" | "medium" | "info";
  suggestion: string;
}

const severityConfig = {
  critical: { color: C.red, bg: "#ef444418", icon: XCircle, label: "Critico" },
  high: { color: C.orange, bg: "#f9731618", icon: AlertOctagon, label: "Alto" },
  medium: { color: C.yellow, bg: "#eab30818", icon: AlertTriangle, label: "Medio" },
  info: { color: C.blue, bg: "#3b82f618", icon: Info, label: "Info" },
};

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [expanded, setExpanded] = useState(false);

  const criticalHigh = alerts.filter(a => a.severity === "critical" || a.severity === "high");
  if (criticalHigh.length === 0) return null;

  const hasCritical = alerts.some(a => a.severity === "critical");
  const bannerColor = hasCritical ? C.red : C.orange;
  const bannerBg = hasCritical ? "#ef444412" : "#f9731612";

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Banner Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: bannerBg,
          border: `1px solid ${bannerColor}40`,
          borderRadius: expanded ? "10px 10px 0 0" : 10,
          color: bannerColor,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {criticalHigh.length} cuenta{criticalHigh.length !== 1 ? "s" : ""} necesita{criticalHigh.length !== 1 ? "n" : ""} atencion
          </span>
          <span style={{ fontSize: 12, color: C.textSec, fontWeight: 400 }}>
            ({alerts.length} alerta{alerts.length !== 1 ? "s" : ""} total)
          </span>
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Expanded Alerts List */}
      {expanded && (
        <div style={{
          border: `1px solid ${bannerColor}40`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          background: C.card,
          overflow: "hidden",
        }}>
          {alerts.map((alert, i) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <div
                key={`${alert.accountId}-${alert.type}-${i}`}
                style={{
                  padding: "14px 18px",
                  borderBottom: i < alerts.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: config.bg,
                  color: config.color,
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{alert.account}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "1px 7px",
                      borderRadius: 4,
                      background: config.bg,
                      color: config.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                      {config.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>
                    {alert.message}
                  </p>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <Lightbulb size={13} style={{ color: C.yellow, flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}>
                      {alert.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
