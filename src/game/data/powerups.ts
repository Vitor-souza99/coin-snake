export const powerups = [
  { id: "magnet", name: "ÍMÃ", symbol: "M", color: 0xee83a2, weight: 40 },
  { id: "shield", name: "ESCUDO", symbol: "S", color: 0x70cfff, weight: 35 },
  { id: "turbo", name: "TURBO", symbol: "T", color: 0xffb85c, weight: 25 },
  { id: "precision", name: "FREIO PRECISO", symbol: "↓", color: 0x65c8ff, weight: 18 },
  { id: "lucky-star", name: "ESTRELA DA SORTE", symbol: "★", color: 0xffd447, weight: 14 },
  { id: "ghost", name: "FANTASMA", symbol: "G", color: 0x8be9ff, weight: 10 },
  { id: "life", name: "VIDA EXTRA", symbol: "♥", color: 0xff5b78, weight: 1 },
] as const;
export type PowerKind = (typeof powerups)[number]["id"];
