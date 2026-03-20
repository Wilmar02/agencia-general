export const C = {
  bg: "#0f1117",
  card: "#16161e",
  cardHover: "#1a1a26",
  border: "#1c1c28",
  text: "#e4e4e7",
  textSec: "#71717a",
  textMuted: "#52525b",
  white: "#fff",
  blue: "#2563eb",
  blueLight: "#3b82f6",
  green: "#4ade80",
  greenSolid: "#22c55e",
  red: "#f87171",
  redSolid: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  purple: "#a855f7",
  pink: "#fca5a5",
} as const;

export const tipoLabel: Record<string, string> = {
  leads: "Leads",
  whatsapp: "Chats",
  ventas: "Ventas",
};

export const tipoColor: Record<string, string> = {
  leads: "#3b82f6",
  whatsapp: "#22c55e",
  ventas: "#a855f7",
};

export const platformColor: Record<string, string> = {
  meta: "#3b82f6",
  google: "#eab308",
};
