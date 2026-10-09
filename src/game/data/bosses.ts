export interface BossDefinition {
  id: string;
  name: string;
  worldId: string;
  entryHint: string;
  maxHealth: number;
  phases: readonly number[];
  movementSpeed: number;
  attackInterval: number;
  rewardCoins: number;
  rewardXP: number;
  petReward?: string;
  additionalPetRewards?: string[];
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
  { id: "king-snake", name: "King Snake", worldId: "green-valley", entryHint: "Desvie da linha vermelha da investida real: se ela atingir você sem aura, perderá uma vida; com aura, ela será consumida para bloquear o golpe. Quando o King Snake bater na arena e ficar atordoado, pegue a coroa e encoste nele com a aura ativa para causar dano. Sem aura, o contato não causa dano; aguarde a próxima abertura e pegue outra coroa.", maxHealth: 6, phases: [4, 2], movementSpeed: 50, attackInterval: 6, rewardCoins: 400, rewardXP: 300, petReward: "bee", additionalPetRewards: ["firefly"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1.3, attackCooldown: 6, stunDuration: 3.5 } },
  { id: "candy-monster", name: "Candy Monster", worldId: "candy-world", entryHint: "Pegue Boss Coins até carregar a aura. Quando ela surgir, colete-a para fazer o Candy Monster fugir e persiga-o para acertá-lo. Desvie dos círculos: o golpe reduz seu corpo ou tira uma vida se atingir a cabeça. Com 2 HP, ele fica mais rápido e o golpe de área aumenta.", maxHealth: 6, phases: [4, 2], movementSpeed: 65, attackInterval: 4.5, rewardCoins: 600, rewardXP: 400, petReward: "candy-blob", additionalPetRewards: ["snow-pup"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 8, auraMaxHits: 1, telegraphDuration: 0.8, attackCooldown: 4.5, stunDuration: 0 } },
  { id: "kraken", name: "Kraken", worldId: "ocean", entryHint: "Saia dos círculos que anunciam os tentáculos. Quando o Kraken errar o golpe, aproveite a janela vulnerável: colete a pérola de ataque e use a aura para atingi-lo.", maxHealth: 10, phases: [6, 3], movementSpeed: 0, attackInterval: 4.2, rewardCoins: 800, rewardXP: 500, petReward: "baby-octopus", additionalPetRewards: ["tiny-dragon"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 0.9, attackCooldown: 4.2, stunDuration: 0 } },
];