/** Fraction of environmental wind push and slow effects resisted by the Scorpionling. */
export const scorpionlingEnvironmentalResistance = 0.2;

export function scorpionlingWindForce(force: { x: number; y: number }, hasScorpionling: boolean, bossEncounter: boolean) {
  const multiplier = hasScorpionling && !bossEncounter ? 1 - scorpionlingEnvironmentalResistance : 1;
  return { x: force.x * multiplier, y: force.y * multiplier };
}

export function scorpionlingSlowMultiplier(multiplier: number, hasScorpionling: boolean, bossEncounter: boolean) {
  if (!hasScorpionling || bossEncounter || multiplier >= 1) return multiplier;
  return multiplier + (1 - multiplier) * scorpionlingEnvironmentalResistance;
}