import type { Point } from "../types/game";

export const spiderlingCoinRadius = 185;
export const spiderlingCoinSpeed = 220;

const excludedCoinKinds = new Set(["mythic", "candy_coin", "pearl_coin"]);

/** Moves an eligible coin toward the snake while the Spiderling is equipped. */
export function attractSpiderlingCoin(
  coin: Point & { kind: { id: string } },
  snake: Point,
  dt: number,
): boolean {
  if (excludedCoinKinds.has(coin.kind.id) || dt <= 0) return false;

  const dx = snake.x - coin.x;
  const dy = snake.y - coin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1 || distance > spiderlingCoinRadius) return false;

  const move = Math.min(distance, spiderlingCoinSpeed * dt);
  coin.x += (dx / distance) * move;
  coin.y += (dy / distance) * move;
  return true;
}