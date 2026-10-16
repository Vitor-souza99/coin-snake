import { B } from "../data/balance";
import type { GameDifficulty } from "../types/game";

export interface DifficultyProfile {
  speedMultiplier: number;
  powerUpIntervalMultiplier: number;
  bossMovementMultiplier: number;
  bossTimingMultiplier: number;
}

export const difficultyProfiles: Record<GameDifficulty, DifficultyProfile> = {
  easy: { speedMultiplier: 0.85, powerUpIntervalMultiplier: 0.8, bossMovementMultiplier: 0.85, bossTimingMultiplier: 1.2 },
  normal: { speedMultiplier: 1, powerUpIntervalMultiplier: 1, bossMovementMultiplier: 1, bossTimingMultiplier: 1 },
  hard: { speedMultiplier: 1.12, powerUpIntervalMultiplier: 1.25, bossMovementMultiplier: 1.15, bossTimingMultiplier: 0.85 },
};

export function difficultyProfile(difficulty: GameDifficulty = "normal"): DifficultyProfile {
  return difficultyProfiles[difficulty];
}

export interface BossDifficultyProfile {
  movementMultiplier: number;
  timingMultiplier: number;
}

export function bossDifficultyProfile(difficulty: GameDifficulty = "normal"): BossDifficultyProfile {
  const profile = difficultyProfile(difficulty);
  return { movementMultiplier: profile.bossMovementMultiplier, timingMultiplier: profile.bossTimingMultiplier };
}

export function bossMovementSpeed(baseSpeed: number, difficulty: GameDifficulty = "normal"): number {
  return baseSpeed * bossDifficultyProfile(difficulty).movementMultiplier;
}

export function bossAttackTiming(baseDuration: number, difficulty: GameDifficulty = "normal", minimum = 0): number {
  return Math.max(minimum, baseDuration * bossDifficultyProfile(difficulty).timingMultiplier);
}

export function powerUpSpawnInterval(difficulty: GameDifficulty = "normal"): number {
  return B.power.interval * difficultyProfile(difficulty).powerUpIntervalMultiplier;
}

/** Give the player enough time to leave a boss attack zone at their current movement speed. */
export function candyTelegraphTiming(baseDuration: number, playerSpeed: number, attackRadius: number): number {
  const minimum = 1.15;
  const maximum = 1.8;
  const safeSpeed = Math.max(1, playerSpeed);
  const escapeDistance = attackRadius + B.snake.radius + 24;
  const escapeWindow = (escapeDistance / safeSpeed) * 1.35;
  return Math.min(maximum, Math.max(minimum, baseDuration, escapeWindow));
}

export function difficulty(seconds: number, score: number, length: number, gameDifficulty: GameDifficulty = "normal") {
  const d = B.difficulty;
  const level = Math.min(
    d.maxLevel,
    Math.floor(
      seconds / d.secondsPerLevel +
        score / d.scorePerLevel +
        Math.max(0, length - B.snake.initial) / d.segmentsPerLevel,
    ),
  );
  const growthSpeed = B.snake.speed + Math.max(0, length - B.snake.initial) * B.snake.growthSpeedStep;
  const levelSpeed = B.snake.speed + level * d.speedStep;
  return {
    level,
    speed: Math.min(B.snake.maxSpeed, Math.max(growthSpeed, levelSpeed)) * difficultyProfile(gameDifficulty).speedMultiplier,
    coins: Math.min(d.maxCoins, d.initialCoins + level),
    obstacles: Math.min(d.maxObstacles, d.initialObstacles + level),
  };
}