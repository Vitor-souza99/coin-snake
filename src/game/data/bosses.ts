export interface BossDefinition {
  id: string;
  name: string;
  worldId: string;
  maxHealth: number;
  phases: readonly number[];
  movementSpeed: number;
  attackInterval: number;
  rewardCoins: number;
  rewardXP: number;
  petReward?: string;
  combat: {
    attackChargePerBossCoin: number;
    hitInvulnerability: number;
    auraDuration: number;
    auraMaxHits: number;
    telegraphDuration: number;
    attackCooldown: number;
    stunDuration: number;
  };
}
export const bosses: BossDefinition[] = [
  { id: "king-snake", name: "King Snake", worldId: "green-valley", maxHealth: 8, phases: [5, 2], movementSpeed: 58, attackInterval: 5, rewardCoins: 400, rewardXP: 300, petReward: "bee", combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1, attackCooldown: 5, stunDuration: 2.5 } },
  { id: "candy-monster", name: "Candy Monster", worldId: "candy-world", maxHealth: 9, phases: [6, 3], movementSpeed: 65, attackInterval: 4.5, rewardCoins: 600, rewardXP: 400, petReward: "candy-blob", combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 8, auraMaxHits: 2, telegraphDuration: 0.8, attackCooldown: 4.5, stunDuration: 0 } },
  { id: "kraken", name: "Kraken", worldId: "ocean", maxHealth: 10, phases: [6, 3], movementSpeed: 0, attackInterval: 4.2, rewardCoins: 800, rewardXP: 500, petReward: "baby-octopus", combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 0.9, attackCooldown: 4.2, stunDuration: 0 } },
];