export type PetRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "PREMIUM";

export interface PetDefinition {
  id: string;
  name: string;
  mysteryName?: string;
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
    description: "Reduz em 20% o efeito de ventos e lentidão ambiental fora de lutas contra chefes.",
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
    description: "Mantém o bônus de +3 pontos percentuais para moedas azuis e traz pólen, concedendo até 24 XP por partida em pulsos de 8 XP.",
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
    description: "Estende cada Ímã coletado para 12 segundos.",
    unlockedBy: "Derrote Kraken.",
    unlockType: "BOSS",
    bossRewardId: "kraken",
  },
  {
    id: "firefly",
    name: "Vaga-lume",
    symbol: "✨",
    rarity: "RARE",
    description: "Mantém o bônus de +5 pontos percentuais para moedas azuis e atrai moedas azuis próximas até você.",
    unlockedBy: "Derrote King Snake e adquira por 50 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "king-snake",
    coinPrice: 50,
  },
  {
    id: "snow-pup",
    name: "Filhote Boreal",
    symbol: "❄️",
    rarity: "EPIC",
    description: "Seu Escudo bloqueia um golpe extra antes de desaparecer.",
    unlockedBy: "Derrote Candy Monster.",
    unlockType: "BOSS",
    bossRewardId: "candy-monster",
  },
  {
    id: "tiny-dragon",
    name: "Dragãozinho",
    mysteryName: "???",
    symbol: "🐲",
    rarity: "EPIC",
    description: "Uma relíquia misteriosa guarda algo ainda não descoberto.",
    unlockedBy: "Descubra a relíquia secreta no Labirinto do Deserto e adquira por 150 Boss Coins.",
    unlockType: "BOSS",
    bossRewardId: "scorpion-king",
    requiredBossIds: ["scorpion-king"],
    coinPrice: 150,
  },
  {
    id: "tidal-turtle",
    name: "Tartaruga das Marés",
    symbol: "🐢",
    rarity: "EPIC",
    description: "Aumenta o poder Fantasma para 5 segundos e concede um Escudo a cada 45 segundos. O Escudo dura 10 segundos se não bloquear um golpe.",
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
    description: "Uma vez por partida, renasce quando você perder a última vida e devolve 1 vida.",
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
    description: "No Abismo Mudo, percorre o mapa e recolhe fragmentos celestiais; a cada 3, concede 15 XP (até 3 vezes por partida).",
    unlockedBy: "No Abismo Mudo, ative os 3 santuários celestiais para desbloquear este mascote mítico.",
    unlockType: "BOSS",
    bossRewardId: "kraken",
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