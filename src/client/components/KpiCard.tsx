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
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.white }}>{value}</span>
        {change && <span style={{ fontSize: 12, fontWeight: 500, color: changeColor }}>{change}</span>}
      </div>
    </div>
  );
}
