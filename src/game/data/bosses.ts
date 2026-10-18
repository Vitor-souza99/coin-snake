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
  { id: "king-snake", name: "King Snake", worldId: "green-valley", entryHint: "Desvie da linha vermelha da investida real: se ela atingir você sem aura, perderá uma vida; com aura, ela será consumida para bloquear o golpe. Quando o King Snake bater na arena e ficar atordoado, pegue a coroa e encoste nele com a aura ativa para causar dano. Sem aura, o contato não causa dano; aguarde a próxima abertura e pegue outra coroa.", maxHealth: 6, phases: [4, 2], movementSpeed: 50, attackInterval: 6, rewardCoins: 400, rewardXP: 300, bossCoinDrop: 10, petReward: "tiny-dragon", additionalPetRewards: ["firefly"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1.3, attackCooldown: 6, stunDuration: 3.5 } },
  { id: "candy-monster", name: "Candy Monster", worldId: "candy-world", entryHint: "Pegue 4 Boss Coins para carregar a aura e coletá-la. Cada batida com aura tira 1 HP. Depois de cada batida, ele pisca e recua por 4 segundos: aproveite para fugir. Desvie dos círculos de ataque; os golpes ficam gradualmente mais frequentes conforme a vida dele diminui.", maxHealth: 6, phases: [4, 2], movementSpeed: 65, attackInterval: 4, rewardCoins: 600, rewardXP: 400, bossCoinDrop: 25, petReward: "bee", additionalPetRewards: ["candy-blob", "snow-pup"], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 8, auraMaxHits: 1, telegraphDuration: 0.8, attackCooldown: 4, stunDuration: 0 } },
  { id: "kraken", name: "Kraken", worldId: "ocean", entryHint: "Saia dos círculos que anunciam os tentáculos: se acertarem sua cabeça, você perde uma vida (escudo e invulnerabilidade protegem). Quando o Kraken errar, colete a pérola azul pulsante e use a aura para atacá-lo. Aos 2 HP, você tem 9 segundos para interromper a cura acertando-o com a aura; se não conseguir, ele recupera até 3 HP. Após interromper ou concluir a cura, você tem 5 segundos para sair do círculo. Ele só tenta curar uma vez.", maxHealth: 8, phases: [6, 3], movementSpeed: 0, attackInterval: 4.2, rewardCoins: 800, rewardXP: 500, bossCoinDrop: 35, petReward: "baby-octopus", additionalPetRewards: [], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 0.9, attackCooldown: 4.2, stunDuration: 0 } },
  { id: "scorpion-king", name: "Escorpião-Rei", worldId: "desert", entryHint: "Desvie do rastro vermelho da investida. Quando ele errar e ficar atordoado, use a aura de ataque para acertá-lo. Aos 5 e 2 HP, escape das poças de veneno. Na fase final, desvie dos saltos: atingir a cabeça com a aura de ataque causa dano; o corpo reduz seu tamanho.", maxHealth: 8, phases: [5, 2], movementSpeed: 58, attackInterval: 4, rewardCoins: 1000, rewardXP: 650, bossCoinDrop: 40, petReward: "scorpionling", additionalPetRewards: [], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1, attackCooldown: 4, stunDuration: 1.8 } },
  { id: "spider-queen", name: "Aranha Real", worldId: "spider-lair", entryHint: "Desvie do fio vermelho e das teias. Colete 4 Boss Coins para ativar a aura roxa; com ela, toque a estalactite no alto e ela cairá sobre a Aranha Real, causando 1 de dano. Quando a chefe chegar a 4 HP, ela espalhará mais teias e cobrirá uma área maior.", maxHealth: 8, phases: [5, 2, 1], movementSpeed: 46, attackInterval: 4.5, rewardCoins: 1200, rewardXP: 800, bossCoinDrop: 45, petReward: "spiderling", additionalPetRewards: [], combat: { attackChargePerBossCoin: 25, hitInvulnerability: 0.8, auraDuration: 4, auraMaxHits: 1, telegraphDuration: 1.1, attackCooldown: 4.5, stunDuration: 2.8 } },
];