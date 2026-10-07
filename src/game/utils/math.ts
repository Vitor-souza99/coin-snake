import type { Point } from "../types/game";
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function turnToward(angle: number, target: number, max: number): number {
  const delta = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
  return angle + clamp(delta, -max, max);
}
export function weighted<T extends { weight: number }>(
  items: readonly T[],
  rng = Math.random,
): T {
  let n = rng() * items.reduce((s, item) => s + item.weight, 0);
  for (const item of items) {
    n -= item.weight;
    if (n < 0) return item;
  }
  return items[items.length - 1];
}
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
