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
}
export const bosses: BossDefinition[] = [
  { id: "king-snake", name: "King Snake", worldId: "green-valley", maxHealth: 10, phases: [7, 4], movementSpeed: 78, attackInterval: 5, rewardCoins: 400, rewardXP: 300, petReward: "bee" },
  { id: "candy-monster", name: "Candy Monster", worldId: "candy-world", maxHealth: 12, phases: [8, 4], movementSpeed: 82, attackInterval: 4.6, rewardCoins: 600, rewardXP: 400, petReward: "candy-blob" },
  { id: "kraken", name: "Kraken", worldId: "ocean", maxHealth: 14, phases: [10, 6], movementSpeed: 86, attackInterval: 4.2, rewardCoins: 800, rewardXP: 500, petReward: "baby-octopus" },
];