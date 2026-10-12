import type { Point } from "../types/game";

export type DesertRegionId = "oasis" | "ruins" | "dune_field" | "scorpion_arena";
export interface DesertRegion extends Point { id: DesertRegionId; width: number; height: number }
export interface SandGust extends Point { width: number; height: number; direction: Point; force: number; phase: number }
export type DesertRouteId = "oasis" | "ruins" | "dunes";

export const desertWorldConfig = {
  gustForce: 28,
  maxEffectiveSpeed: 350,
  oasisSlowMultiplier: 0.92,
  scorpionArena: { x: 0.76, y: 0.72, radius: 0.12 },
  obstacleClearance: 100,
  routes: { rareCoinCount: 3, rareCoinClearance: 105, ruinsObstacleChance: 0.78 },
} as const;

export function desertRegions(left: number, top: number, right: number, bottom: number): DesertRegion[] {
  const width = right - left, height = bottom - top;
  return [
    { id: "oasis", x: left + width * 0.24, y: top + height * 0.72, width: width * 0.28, height: height * 0.22 },
    { id: "ruins", x: left + width * 0.26, y: top + height * 0.25, width: width * 0.32, height: height * 0.28 },
    { id: "dune_field", x: left + width * 0.52, y: top + height * 0.48, width: width * 0.7, height: height * 0.62 },
    { id: "scorpion_arena", x: left + width * desertWorldConfig.scorpionArena.x, y: top + height * desertWorldConfig.scorpionArena.y, width: width * 0.32, height: height * 0.32 },
  ];
}

export function desertGusts(left: number, top: number, right: number, bottom: number): SandGust[] {
  const width = right - left, height = bottom - top, force = desertWorldConfig.gustForce;
  return [
    { x: left + width * 0.64, y: top + height * 0.25, width: width * 0.42, height: height * 0.09, direction: { x: 1, y: 0 }, force, phase: 0 },
    { x: left + width * 0.47, y: top + height * 0.51, width: width * 0.1, height: height * 0.44, direction: { x: 0, y: 1 }, force: force * 0.8, phase: 1.8 },
    { x: left + width * 0.68, y: top + height * 0.88, width: width * 0.46, height: height * 0.08, direction: { x: -1, y: 0 }, force: force * 1.15, phase: 3.4 },
  ];
}

export function desertGustAt(point: Point, elapsed: number, gusts: SandGust[]): Point {
  return gusts.reduce((result, gust) => {
    const inside = point.x >= gust.x - gust.width / 2 && point.x <= gust.x + gust.width / 2 && point.y >= gust.y - gust.height / 2 && point.y <= gust.y + gust.height / 2;
    if (!inside) return result;
    const pulse = 0.7 + (Math.sin(elapsed * 2.4 + gust.phase) + 1) * 0.15;
    return { x: result.x + gust.direction.x * gust.force * pulse, y: result.y + gust.direction.y * gust.force * pulse };
  }, { x: 0, y: 0 });
}

export function desertRouteGustAt(point: Point, elapsed: number, gusts: SandGust[], regions: DesertRegion[]): Point {
  return inDesertOasis(point, regions) ? { x: 0, y: 0 } : desertGustAt(point, elapsed, gusts);
}

export function desertRouteAt(point: Point, regions: DesertRegion[]): DesertRouteId {
  if (inDesertOasis(point, regions)) return "oasis";
  const ruins = regions.find((region) => region.id === "ruins");
  if (ruins && Math.abs(point.x - ruins.x) <= ruins.width / 2 && Math.abs(point.y - ruins.y) <= ruins.height / 2) return "ruins";
  return "dunes";
}

export function desertRareCoinSpots(regions: DesertRegion[], count = desertWorldConfig.routes.rareCoinCount): Point[] {
  const ruins = regions.find((region) => region.id === "ruins");
  if (!ruins || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => ({
    x: ruins.x + ((index + 1) / (count + 1) - 0.5) * ruins.width * 0.72,
    y: ruins.y + (index % 2 ? 1 : -1) * ruins.height * 0.22,
  }));
}

export function containDesertArenaPoint(point: Point, center: Point, radius: number, clearance: number): Point | null {
  const dx = point.x - center.x, dy = point.y - center.y, distance = Math.hypot(dx, dy), limit = radius + clearance;
  if (distance >= limit) return null;
  const scale = limit / (distance || 1);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function inDesertOasis(point: Point, regions: DesertRegion[]): boolean {
  const oasis = regions.find((region) => region.id === "oasis");
  return !!oasis && Math.abs(point.x - oasis.x) <= oasis.width / 2 && Math.abs(point.y - oasis.y) <= oasis.height / 2;
}