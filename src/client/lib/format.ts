export function fmt(v: number, cur = "COP"): string {
  if (cur === "USD") return `US$${v.toFixed(2)}`;
  return `$${Math.round(v).toLocaleString("es-CO")}`;
}

export function fmtK(v: number, cur = "COP"): string {
  if (cur === "USD") return `US$${v.toFixed(2)}`;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v).toLocaleString("es-CO")}`;
}

export function fmtMoney(v: number, cur: string): string {
  if (cur === "USD") return `US$${v.toFixed(2)}`;
  return `$${Math.round(v).toLocaleString("es-CO")}`;
}

export function fmtPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${Math.round(val)}%`;
}

export function fmtReach(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export function fmtCurrency(v: number, currency: string): string {
  const s = currency === "USD" ? "US$" : "$";
  return currency === "USD" ? `${s}${v.toFixed(2)}` : `${s}${Math.round(v).toLocaleString("es-CO")}`;
}
