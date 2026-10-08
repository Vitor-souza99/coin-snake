import { B } from "../data/balance";

/** XP required to advance from the given level to the next one. */
export function xpForNextLevel(level: number): number {
  const currentLevel = Math.max(1, Math.floor(level));
  return B.xp.firstLevel + (currentLevel - 1) * B.xp.perLevelIncrease;
}

/** Total XP required to reach the given level (level 1 starts at zero XP). */
export function totalXPForLevel(level: number): number {
  const targetLevel = Math.max(1, Math.floor(level));
  const advances = targetLevel - 1;
  return (advances * (2 * B.xp.firstLevel + (advances - 1) * B.xp.perLevelIncrease)) / 2;
}

export function levelForXP(xp: number): number {
  const totalXP = Math.max(0, Math.floor(xp));
  let level = 1;
  let remainingXP = totalXP;
  let cost = xpForNextLevel(level);

  while (remainingXP >= cost) {
    remainingXP -= cost;
    level++;
    cost = xpForNextLevel(level);
  }

  return level;
}

export function xpProgressForLevel(xp: number): { current: number; required: number } {
  const totalXP = Math.max(0, Math.floor(xp));
  const level = levelForXP(totalXP);
  return {
    current: totalXP - totalXPForLevel(level),
    required: xpForNextLevel(level),
  };
}