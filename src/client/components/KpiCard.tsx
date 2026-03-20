import { C } from "../lib/theme.js";

interface Props {
  label: string;
  value: string;
  change?: string;
  invertColor?: boolean;
}

export default function KpiCard({ label, value, change, invertColor }: Props) {
  const isNeg = change?.startsWith("-");
  const isGood = invertColor ? isNeg : !isNeg;
  const changeColor = !change ? C.textMuted : isGood ? C.green : C.red;

  return (
    <div style={{
      background: C.card,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 10, color: C.textSec, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.white, letterSpacing: "-0.02em" }}>{value}</span>
        {change && <span style={{ fontSize: 12, fontWeight: 600, color: changeColor }}>{change}</span>}
      </div>
    </div>
  );
}
