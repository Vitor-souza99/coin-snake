/** A single, cooldown-gated dragon hit; boss-specific exposure is still checked by the scene. */
export const dragonBossDamage = 1;
export const dragonAttackCooldown = 5.5;
export const dragonAttackDuration = 0.42;

export function dragonCanDamageBoss(bossId: string, state: string): boolean {
  if (bossId === "spider-queen") return false;
  if (bossId === "kraken") return state === "EXPOSED";
  if (bossId === "king-snake" || bossId === "scorpion-king") return state === "STUNNED";
  return state === "ATTACK_MODE";
}