export function getCplThreshold(tipo: string, currency: string): number {
  if (tipo === "whatsapp") return currency === "COP" ? 12000 : 5;
  if (tipo === "ventas") return currency === "COP" ? 50000 : 20;
  return currency === "COP" ? 25000 : 8; // leads default
}

export function getCostColor(costPerConv: number, conversions: number, tipo: string, currency: string): string {
  if (conversions === 0) return "#52525b";
  const threshold = getCplThreshold(tipo, currency);
  if (costPerConv > threshold) return "#f87171";
  if (costPerConv > threshold * 0.7) return "#fbbf24";
  return "#4ade80";
}

export function getFreqColor(freq: number): string {
  if (freq > 3) return "#f87171";
  if (freq > 2) return "#fbbf24";
  return "#71717a";
}
