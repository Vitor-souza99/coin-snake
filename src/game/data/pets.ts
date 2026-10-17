export type PetRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "PREMIUM";

export interface PetDefinition {
  id: string;
  name: string;
  symbol: string;
  rarity: PetRarity;
  description: string;
  unlockedBy: string;
  unlockType: "BOSS" | "PREMIUM";
  bossRewardId?: string;
  requiredBossIds?: string[];
  coinPrice?: number;
  premiumProductId?: string;
}

export const pets: PetDefinition[] = [
  {
    id: "scorpionling",
    name: "Escorpiãozinho",
    symbol: "🦂",
    rarity: "EPIC",
    description: "+5% na duração do Turbo.",
    unlockedBy: "Derrote o Escorpião-Rei.",
    unlockType: "BOSS",
    bossRewardId: "scorpion-king",
  },
  {
    id: "spiderling",
    name: "Aranhinha",
    symbol: "🕷️",
    rarity: "LEGENDARY",
    description: "A Aranhinha percorre o mapa e atrai moedas comuns próximas até você.",
    unlockedBy: "Derrote a Aranha Real no Covil da Aranha.",
    unlockType: "BOSS",
    bossRewardId: "spider-queen",
  },
  {
    id: "bee",
    name: "Bee",
    symbol: "🐝",
    rarity: "RARE",
    description: "+3 pontos percentuais na chance de moedas azuis.",
    unlockedBy: "Derrote Candy Monster.",
    unlockType: "BOSS",
    bossRewardId: "candy-monster",
  },
  {
    id: "candy-blob",
    name: "Candy Blob",
    symbol: "🍬",
    rarity: "EPIC",
    description: "+5% de XP ao finalizar uma partida.",
    unlockedBy: "Derrote Candy Monster e adquira por 50 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "candy-monster",
    coinPrice: 50,
  },
  {
    id: "baby-octopus",
    name: "Baby Octopus",
    symbol: "🐙",
    rarity: "EPIC",
    description: "+5% na duração do Ímã (8,4 s em vez de 8 s).",
    unlockedBy: "Derrote Kraken.",
    unlockType: "BOSS",
    bossRewardId: "kraken",
  },
  {
    id: "firefly",
    name: "Vaga-lume",
    symbol: "✨",
    rarity: "RARE",
    description: "+5 pontos percentuais na chance de moedas azuis.",
    unlockedBy: "Derrote King Snake e adquira por 50 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "king-snake",
    coinPrice: 50,
  },
  {
    id: "snow-pup",
    name: "Filhote Boreal",
    symbol: "🐺",
    rarity: "EPIC",
    description: "+5% na duração do Escudo.",
    unlockedBy: "Derrote Candy Monster.",
    unlockType: "BOSS",
    bossRewardId: "candy-monster",
  },
  {
    id: "tiny-dragon",
    name: "Dragãozinho",
    symbol: "🐲",
    rarity: "EPIC",
    description: "+5% na duração do Turbo.",
    unlockedBy: "Derrote King Snake.",
    unlockType: "BOSS",
    bossRewardId: "king-snake",
  },
  {
    id: "tidal-turtle",
    name: "Tartaruga das Marés",
    symbol: "🐢",
    rarity: "EPIC",
    description: "+10% na duração do Fantasma (3,3 s em vez de 3 s).",
    unlockedBy: "Derrote Kraken e adquira por 75 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "kraken",
    coinPrice: 75,
  },
  {
    id: "phoenix",
    name: "Fênix Solar",
    symbol: "🔥",
    rarity: "LEGENDARY",
    description: "+1 vida inicial em cada partida.",
    unlockedBy: "Derrote Kraken e adquira por 125 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "kraken",
    coinPrice: 125,
  },
  {
    id: "celestial-serpent",
    name: "Serpente Celestial",
    symbol: "🐉",
    rarity: "MYTHIC",
    description: "+10% de XP ao finalizar uma partida.",
    unlockedBy: "Derrote os três chefes e adquira por 200 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "kraken",
    coinPrice: 200,
    requiredBossIds: ["king-snake", "candy-monster", "kraken"],
  },
  {
    id: "lucky-leprechaun",
    name: "Trevo da Sorte",
    symbol: "🍀",
    rarity: "MYTHIC",
    description: "Mascote permanente: +2 pontos percentuais na chance de surgir uma vida extra e libera uma vaga para outro mascote.",
    unlockedBy: "Encontre 2 trevos no Jardim Secreto do Candy World com a Serpente Abissal e 2 no Jardim Submerso do Oceano com a Ghost Snake.",
    unlockType: "BOSS",
  },
  {
    id: "crystal-fox",
    name: "Crystal Fox",
    symbol: "🦊",
    rarity: "PREMIUM",
    description: "+5% de pontos ao coletar moedas (não aumenta o saldo).",
    unlockedBy: "Mascote premium — indisponível no momento.",
    unlockType: "PREMIUM",
    premiumProductId: "coinsnake.pet.crystal-fox",
  },
];

export const earnablePetIds = pets
  .filter((pet) => pet.id !== "lucky-leprechaun" && pet.unlockType === "BOSS")
  .map((pet) => pet.id);