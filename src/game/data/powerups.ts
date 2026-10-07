export const powerups = [
  { id: "magnet", name: "ÍMÃ", symbol: "M", color: 0xee83a2, weight: 40 },
  { id: "shield", name: "ESCUDO", symbol: "S", color: 0x70cfff, weight: 35 },
  { id: "turbo", name: "TURBO", symbol: "T", color: 0xffb85c, weight: 25 },
  { id: "life", name: "VIDA EXTRA", symbol: "♥", color: 0xff5b78, weight: 1 },
] as const;
export type PowerKind = (typeof powerups)[number]["id"];
