export type PetRarity = "COMMON" | "RARE" | "EPIC" | "PREMIUM";

export interface PetDefinition {
  id: string;
  name: string;
  symbol: string;
  rarity: PetRarity;
  description: string;
  unlockedBy: string;
  unlockType: "BOSS" | "PREMIUM";
  premiumProductId?: string;
}

export const pets: PetDefinition[] = [
  {
    id: "bee",
    name: "Bee",
    symbol: "🐝",
    rarity: "RARE",
    description: "+3 pontos percentuais na chance de moedas azuis.",
    unlockedBy: "Derrote King Snake.",
    unlockType: "BOSS",
  },
  {
    id: "candy-blob",
    name: "Candy Blob",
    symbol: "🍬",
    rarity: "EPIC",
    description: "+5% de XP ao finalizar uma partida.",
    unlockedBy: "Derrote Candy Monster.",
    unlockType: "BOSS",
  },
  {
    id: "baby-octopus",
    name: "Baby Octopus",
    symbol: "🐙",
    rarity: "EPIC",
    description: "+5% na duração do Ímã (8,4 s em vez de 8 s).",
    unlockedBy: "Derrote Kraken.",
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
  .filter((pet) => pet.unlockType === "BOSS")
  .map((pet) => pet.id);