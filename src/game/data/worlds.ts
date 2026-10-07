export interface WorldDefinition {
  id: string;
  name: string;
  unlockLevel: number;
  background: number;
  ground: number;
  accent: number;
  speedMultiplier: number;
  bossId?: string;
  hazard: "none" | "sticky" | "current";
}
export const worlds: WorldDefinition[] = [
  { id: "green-valley", name: "Green Valley", unlockLevel: 1, background: 0xf4f4df, ground: 0xdbe8b9, accent: 0x65a85b, speedMultiplier: 1, hazard: "none" },
  { id: "candy-world", name: "Candy World", unlockLevel: 5, background: 0xffeafa, ground: 0xf7c7ec, accent: 0xcf68b6, speedMultiplier: 0.85, bossId: "candy-monster", hazard: "sticky" },
  { id: "ocean", name: "Ocean", unlockLevel: 10, background: 0xdff6fa, ground: 0x9bdeea, accent: 0x369cb5, speedMultiplier: 1.05, hazard: "current" },
];
export const worldById = (id: string) => worlds.find((world) => world.id === id) ?? worlds[0];
export const availableWorlds = (level: number) => worlds.filter((world) => world.unlockLevel <= level);