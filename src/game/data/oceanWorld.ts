import type { Point } from "../types/game";

export type OceanRegionId = "coral_lagoon" | "coral_reef" | "current_channel" | "bubble_garden" | "deep_trench" | "kraken_arena";
export type CurrentType = "SOFT" | "STRONG" | "RAPID";
export interface OceanRegion extends Point { id: OceanRegionId; width: number; height: number }
export interface CurrentZone { type: CurrentType; x: number; y: number; width: number; height: number; direction: Point; force: number; visualIntensity: number }
export interface CoralObstacle extends Point { radius: number; kind: "smallCoral" | "mediumCoral" | "largeCoral" | "coralRock" }

export const oceanWorldConfig = {
  currentForceSoft: 12,
  currentForceStrong: 25,
  currentForceRapid: 36,
  maxEffectiveSpeed: 350,
  currentZones: { soft: 3, strong: 2, rapid: 1, safeSpawnRadius: 210 },
  bubbleSpawnRate: 0.22,
  bonusBubbleChance: 0.32,
  bubbleCooldown: 9,
  maxBonusBubbles: 3,
  bubbleLifetime: 12,
  pearlCoinChance: 0.08,
  pearlCooldown: 42,
  pearlValue: 30,
  pearlScore: 1500,
  pearlDeepBonus: 0.035,
  deepTrenchRareCoinBonus: 0.04,
  coralDensity: 14,
  shrinkFruitBonusChance: 0.3,
  obstacleClearance: 92,
  safeSpawnDistance: 230,
  tutorialRadius: 150,
  krakenArena: { x: 0.78, y: 0.74, radius: 0.11 },
} as const;

export function oceanRegions(left: number, top: number, right: number, bottom: number): OceanRegion[] {
  const width = right - left, height = bottom - top;
  return [
    { id: "coral_lagoon", x: left + width * 0.5, y: top + height * 0.5, width: width * 0.32, height: height * 0.28 },
    { id: "coral_reef", x: left + width * 0.2, y: top + height * 0.22, width: width * 0.34, height: height * 0.34 },
    { id: "current_channel", x: left + width * 0.72, y: top + height * 0.22, width: width * 0.38, height: height * 0.17 },
    { id: "bubble_garden", x: left + width * 0.2, y: top + height * 0.72, width: width * 0.36, height: height * 0.28 },
    { id: "deep_trench", x: left + width * 0.5, y: top + height * 0.88, width: width * 0.72, height: height * 0.2 },
    { id: "kraken_arena", x: left + width * oceanWorldConfig.krakenArena.x, y: top + height * oceanWorldConfig.krakenArena.y, width: width * 0.3, height: height * 0.3 },
  ];
}

export function oceanCurrentZones(left: number, top: number, right: number, bottom: number, spawn: Point): CurrentZone[] {
  const w = right - left, h = bottom - top, c = oceanWorldConfig;
  const candidates: CurrentZone[] = [
    { type: "SOFT", x: left + w * 0.65, y: top + h * 0.21, width: w * 0.42, height: h * 0.09, direction: { x: 1, y: 0 }, force: c.currentForceSoft, visualIntensity: 0.28 },
    { type: "SOFT", x: left + w * 0.22, y: top + h * 0.54, width: w * 0.12, height: h * 0.44, direction: { x: 0, y: 1 }, force: c.currentForceSoft, visualIntensity: 0.25 },
    { type: "SOFT", x: left + w * 0.7, y: top + h * 0.54, width: w * 0.38, height: h * 0.08, direction: { x: -0.8, y: 0.6 }, force: c.currentForceSoft, visualIntensity: 0.28 },
    { type: "STRONG", x: left + w * 0.48, y: top + h * 0.36, width: w * 0.4, height: h * 0.08, direction: { x: 1, y: 0 }, force: c.currentForceStrong, visualIntensity: 0.5 },
    { type: "STRONG", x: left + w * 0.5, y: top + h * 0.88, width: w * 0.58, height: h * 0.07, direction: { x: 0.7, y: -0.7 }, force: c.currentForceStrong, visualIntensity: 0.55 },
    { type: "RAPID", x: left + w * 0.69, y: top + h * 0.87, width: w * 0.2, height: h * 0.07, direction: { x: -1, y: 0 }, force: c.currentForceRapid, visualIntensity: 0.7 },
  ];
  return candidates.filter((zone) => Math.hypot(zone.x - spawn.x, zone.y - spawn.y) > c.currentZones.safeSpawnRadius);
}

export function currentForceAt(point: Point, zones: CurrentZone[]): Point {
  return zones.reduce((force, zone) => point.x >= zone.x - zone.width / 2 && point.x <= zone.x + zone.width / 2 && point.y >= zone.y - zone.height / 2 && point.y <= zone.y + zone.height / 2
    ? { x: force.x + zone.direction.x * zone.force, y: force.y + zone.direction.y * zone.force } : force, { x: 0, y: 0 });
}

export function oceanMovement(input: Point, force: Point, maxSpeed: number): Point {
  const x = input.x + force.x, y = input.y + force.y, speed = Math.hypot(x, y);
  return speed > maxSpeed ? { x: x / speed * maxSpeed, y: y / speed * maxSpeed } : { x, y };
}

export function isSafeOceanSpawn(point: Point, spawn: Point, obstacles: CoralObstacle[], zones: CurrentZone[], radius = oceanWorldConfig.obstacleClearance): boolean {
  return Math.hypot(point.x - spawn.x, point.y - spawn.y) >= oceanWorldConfig.safeSpawnDistance &&
    !obstacles.some((obstacle) => Math.hypot(point.x - obstacle.x, point.y - obstacle.y) < radius + obstacle.radius) &&
    !zones.some((zone) => zone.type !== "SOFT" && point.x >= zone.x - zone.width / 2 && point.x <= zone.x + zone.width / 2 && point.y >= zone.y - zone.height / 2 && point.y <= zone.y + zone.height / 2);
}

export function pearlCoinSpawnAllowed(worldId: string, random: number, chance: number = oceanWorldConfig.pearlCoinChance, inDeepTrench = false): boolean {
  return worldId === "ocean" && random < Math.min(1, chance + (inDeepTrench ? oceanWorldConfig.pearlDeepBonus : 0));
}

export function bonusBubbleReward(random: number): { coins: number; turbo: number; blue: boolean } {
  return { coins: 1 + Math.floor(random * 3), turbo: random > 0.55 ? 5 : 0, blue: random > 0.94 };
}

export function deepTrenchCoinChance(baseChance: number, inDeepTrench: boolean): number {
  return Math.min(1, baseChance + (inDeepTrench ? oceanWorldConfig.deepTrenchRareCoinBonus : 0));
}

/** Keeps a point outside the Kraken arena and reports crossings. */
export function containKrakenArenaPoint(point: Point, center: Point, radius: number, clearance: number): Point | null {
  const dx = point.x - center.x, dy = point.y - center.y;
  const distance = Math.hypot(dx, dy), limit = radius + clearance;
  if (distance >= limit) return null;
  const scale = limit / (distance || 1);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/** Prevents portals or other objects from spawning within the Kraken arena and its clearance margin. */
export function isOutsideKrakenArena(point: Point, center: Point, radius: number, clearance = 0): boolean {
  return Math.hypot(point.x - center.x, point.y - center.y) >= radius + clearance;
}

/** Keeps a Kraken attack target near the snake and inside the map's visible bounds. */
export function krakenAttackTarget(point: Point, bounds: { left: number; top: number; right: number; bottom: number }, clearance: number): Point {
  return {
    x: Math.max(bounds.left + clearance, Math.min(bounds.right - clearance, point.x)),
    y: Math.max(bounds.top + clearance, Math.min(bounds.bottom - clearance, point.y)),
  };
}