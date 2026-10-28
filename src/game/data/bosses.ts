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
  bossCoinDrop: number;
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
  { id: "king-snake", name: "King Snake", worldId: "green-valley", entryHint: "Colete 4 Boss Coins (25/100 por moeda) para carregar a Aura; com 100/100, a coroa aparece para coletar e ativar sua Aura. Desvie da linha vermelha da investida real: se atingir você sem Aura, perderá uma vida; com Aura, ela bloqueia o golpe sem ser consumida. Quando o King Snake bater na arena e ficar atordoado, encoste nele com a Aura ativa para tirar 1 HP. Sem Aura, o contato não causa dano; carregue outra Aura para o próximo ataque.", maxHealth: 4, phases: [3, 2], movementSpeed: 50, attackInterval: 6, rewardCoins: 400, rewardXP: 300, bossCoinDrop: 10, petReward: "tiny-dragon", additionalPetRewards: ["firefly"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1.3, attackCooldown: 6, stunDuration: 3.5 } },
  { id: "candy-monster", name: "Candy Monster", worldId: "candy-world", entryHint: "Pegue 4 Boss Coins para carregar a aura e coletá-la. Cada batida com a aura causa 1 HP de dano. Depois de cada ataque, ele pisca e recua por 4 segundos: aproveite para fugir. Desvie dos círculos de ataque; os golpes ficam gradualmente mais frequentes conforme a vida dele diminui.", maxHealth: 6, phases: [4, 2], movementSpeed: 65, attackInterval: 4, rewardCoins: 600, rewardXP: 400, bossCoinDrop: 25, petReward: "bee", additionalPetRewards: ["candy-blob", "snow-pup"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 8, auraMaxHits: 1, telegraphDuration: 0.8, attackCooldown: 4, stunDuration: 0 } },
  { id: "kraken", name: "Kraken", worldId: "ocean", entryHint: "Colete Boss Coins (25/100 cada) até completar 100/100; então a pérola azul aparece. Colete-a para ativar a aura e atingir o Kraken. Desvie dos círculos dos tentáculos: quando um tentáculo errar, use a aura nele para causar 1 de dano; ele recolhe e o Kraken pisca brevemente. Aos 2 HP, o Kraken tenta curar por 18 segundos: colete Boss Coins até 100/100, pegue a pérola que surge e acerte-o para interromper. Se não interromper, ele recupera 3 HP. Após interromper ou concluir a cura, você tem 5 segundos para sair do círculo. Ele só tenta curar uma vez.", maxHealth: 8, phases: [6, 3], movementSpeed: 0, attackInterval: 4.2, rewardCoins: 800, rewardXP: 500, bossCoinDrop: 4, petReward: "baby-octopus", additionalPetRewards: [], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 0.9, attackCooldown: 4.2, stunDuration: 0 } },
  { id: "scorpion-king", name: "Escorpião-Rei", worldId: "desert", entryHint: "Desvie do rastro vermelho da investida. Quando ele errar e ficar atordoado, use a aura de ataque para acertá-lo. Aos 5 e 2 HP, escape das poças de veneno. Na fase final, desvie dos saltos: atingir a cabeça com a aura de ataque causa dano; o corpo reduz seu tamanho.", maxHealth: 8, phases: [5, 2], movementSpeed: 58, attackInterval: 4, rewardCoins: 1000, rewardXP: 650, bossCoinDrop: 40, petReward: "scorpionling", additionalPetRewards: [], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1, attackCooldown: 4, stunDuration: 1.8 } },
  { id: "spider-queen", name: "Aranha Real", worldId: "spider-lair", entryHint: "Desvie do fio vermelho e das teias. Colete 4 Boss Coins para ativar a aura roxa; com ela, toque a estalactite no alto e ela cairá sobre a Aranha Real, causando 1 de dano. Aos 5 HP, a teia cresce e surge com mais frequência; aos 2 HP, a pressão aumenta novamente e duas teias extras são lançadas.", maxHealth: 8, phases: [5, 2, 1], movementSpeed: 46, attackInterval: 4.5, rewardCoins: 1200, rewardXP: 800, bossCoinDrop: 45, petReward: "spiderling", additionalPetRewards: [], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1.1, attackCooldown: 4.5, stunDuration: 2.8 } },
];