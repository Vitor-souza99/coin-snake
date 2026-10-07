import type { Point } from "../types/game";

export type CandyRegionId = "candy_plaza" | "lollipop_forest" | "syrup_swamp" | "gummy_garden" | "boss_area";
export interface CandyRegion { id: CandyRegionId; x: number; y: number; width: number; height: number }
export interface StickyZone extends Point { radius: number }

// Frações permitem que o mapa mantenha a mesma leitura em qualquer arena/resolução.
export const candyWorldConfig = {
  plaza: { x: 0.5, y: 0.5, radiusX: 0.17, radiusY: 0.16 },
  sticky: { minRadius: 54, maxRadius: 78, slowMultiplier: 0.75, recoveryDuration: 1.4, maxZones: 4, spawnInterval: 24, initialZones: 2, feedbackCooldown: 5 },
  lollipops: { count: 9, small: 0.72, medium: 1, large: 1.3, clearance: 132 },
  gummies: { count: 4, clearance: 145, hopDistance: 18, hopDuration: 0.7, pauseDuration: 1.8 },
  river: { y: 0.78, halfWidth: 0.035, slowMultiplier: 0.62, bridges: [0.27, 0.73], bridgeHalfWidth: 0.075 },
  candyCoin: { opportunitySeconds: 90, chance: 0.35, value: 25, score: 1000 },
  shrinkFruit: { bonusChance: 0.2, areaRadius: 145 },
} as const;

export const candyRegions = (left: number, top: number, right: number, bottom: number): CandyRegion[] => {
  const width = right - left, height = bottom - top;
  return [
    { id: "candy_plaza", x: left + width * 0.5, y: top + height * 0.5, width: width * 0.34, height: height * 0.32 },
    { id: "lollipop_forest", x: left + width * 0.22, y: top + height * 0.2, width: width * 0.4, height: height * 0.34 },
    { id: "syrup_swamp", x: left + width * 0.78, y: top + height * 0.2, width: width * 0.4, height: height * 0.34 },
    { id: "gummy_garden", x: left + width * 0.22, y: top + height * 0.63, width: width * 0.4, height: height * 0.31 },
    { id: "boss_area", x: left + width * 0.78, y: top + height * 0.63, width: width * 0.36, height: height * 0.31 },
  ];
};

export function stickySpeedMultiplier(current: number, inside: boolean, dt: number): number {
  const target = inside ? candyWorldConfig.sticky.slowMultiplier : 1;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) / candyWorldConfig.sticky.recoveryDuration));
}

export function candyFinalSpeed(base: number, turboMultiplier: number, stickyMultiplier: number): number {
  return base * turboMultiplier * stickyMultiplier;
}

export function inCandyRiver(point: Point, left: number, top: number, right: number, bottom: number): boolean {
  const cfg = candyWorldConfig.river, width = right - left, height = bottom - top;
  if (Math.abs(point.y - (top + height * cfg.y)) > height * cfg.halfWidth) return false;
  return !cfg.bridges.some((x) => Math.abs(point.x - (left + width * x)) <= width * cfg.bridgeHalfWidth);
}

export function candyObstacleSafe(point: Point, snake: Point, boss: Point | undefined, zones: StickyZone[], minDistance: number): boolean {
  return Math.hypot(point.x - snake.x, point.y - snake.y) >= minDistance &&
    (!boss || Math.hypot(point.x - boss.x, point.y - boss.y) >= 170) &&
    !zones.some((zone) => Math.hypot(point.x - zone.x, point.y - zone.y) < zone.radius + 100);
}

export function candyCoinSpawnAllowed(worldId: string, random: number, chance: number): boolean {
  return worldId === "candy-world" && random < chance;
}