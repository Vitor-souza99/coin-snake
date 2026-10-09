import { B } from "../data/balance";
import type { Settings } from "../types/game";
export type SpeedPreference = Settings["speedPreference"];
export const speedPreferenceMultipliers: Record<SpeedPreference, number> = {
  low: 0.8,
  medium: 1,
  high: 1.15,
  "very-high": 1.3,
};
export function difficulty(seconds: number, score: number, length: number, speedPreference: SpeedPreference = "medium") {
  const d = B.difficulty;
  const level = Math.min(
    d.maxLevel,
    Math.floor(
      seconds / d.secondsPerLevel +
        score / d.scorePerLevel +
        Math.max(0, length - B.snake.initial) / d.segmentsPerLevel,
    ),
  );
  const growthSpeed =
    B.snake.speed +
    Math.max(0, length - B.snake.initial) * B.snake.growthSpeedStep;
  const levelSpeed = B.snake.speed + level * d.speedStep;
  return {
    level,
    speed: Math.min(B.snake.maxSpeed, Math.max(growthSpeed, levelSpeed)) * speedPreferenceMultipliers[speedPreference],
    coins: Math.min(d.maxCoins, d.initialCoins + level),
    obstacles: Math.min(d.maxObstacles, d.initialObstacles + level),
  };
}
