export type SkinRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
export type SkinUnlockType =
  | "FREE"
  | "COINS"
  | "PLAYER_LEVEL"
  | "BOSS_REWARD"
  | "MASTERY"
  | "ACHIEVEMENT"
  | "PREMIUM"
  | "EVENT";
export type SkinEffect = "none" | "sparkle" | "fire" | "rainbow" | "ocean" | "frost" | "ancient" | "void" | "celestial" | "inferno";
export interface SkinDefinition {
  id: string;
  name: string;
  description: string;
  rarity: SkinRarity;
  family: string;
  unlockType: SkinUnlockType;
  coinPrice: number | null;
  futureProductId?: string;
  color: number;
  dark: number;
  detail: string;
  visualConfig: { effect: SkinEffect; glow: number; animation: "none" | "pulse" | "float" | "orbit" };
  headConfig: { horns: boolean; ears: boolean; crown: boolean; eyes: number };
  bodyConfig: { pattern: "scales" | "plates" | "spots" | "stars" | "stripes" | "waves" | "plain"; accent: number };
  trailConfig: { enabled: boolean; color: number; width: number };
  particleConfig: { enabled: boolean; color: number; rate: number; max: number };
  turboEffect: SkinEffect;
  entranceEffect: SkinEffect;
  victoryEffect: SkinEffect;
  previewConfig: { segments: number; speed: number; showTurbo: boolean; showVictory: boolean };
  worldId?: string;
  bossRewardId?: string;
  requirementValue?: number;
  available: boolean;
}

const skin = (
  id: string, name: string, rarity: SkinRarity, unlockType: SkinUnlockType,
  coinPrice: number | null, color: number, dark: number, detail: string,
  options: Partial<SkinDefinition> = {},
): SkinDefinition => ({
  id, name, description: `${name} — visual cosmético, sem vantagens de gameplay.`,
  rarity, family: "snake", unlockType, coinPrice, color, dark, detail,
  visualConfig: { effect: "none", glow: 0, animation: "none" },
  headConfig: { horns: false, ears: false, crown: false, eyes: 0x173a35 },
  bodyConfig: { pattern: "plain", accent: dark },
  trailConfig: { enabled: false, color, width: 2 },
  particleConfig: { enabled: false, color, rate: 0, max: 0 },
  turboEffect: "none", entranceEffect: "none", victoryEffect: "none",
  previewConfig: { segments: 11, speed: 0.7, showTurbo: false, showVictory: false },
  available: true, ...options,
});

const catalog: SkinDefinition[] = [
  skin("classic", "Classic Snake", "COMMON", "FREE", 0, 0x8ade62, 0x3a9253, "classic"),
  skin("green", "Green Snake", "COMMON", "FREE", 0, 0x4cb66a, 0x267344, "scales", { bodyConfig: { pattern: "scales", accent: 0xc5ef8a } }),
  skin("cat", "Cat Snake", "RARE", "COINS", 500, 0xffbc85, 0xcf795d, "cat", { headConfig: { horns: false, ears: true, crown: false, eyes: 0x173a35 }, bodyConfig: { pattern: "spots", accent: 0xffefd2 } }),
  skin("frajola-cat", "Gato Frajola", "RARE", "COINS", 1000, 0xf4f1e8, 0x222b2a, "frajola-cat", { headConfig: { horns: false, ears: true, crown: false, eyes: 0x173a35 }, bodyConfig: { pattern: "spots", accent: 0x222b2a } }),
  skin("giraffe", "Girafa", "RARE", "COINS", 2000, 0xf1bd4b, 0x9f572b, "giraffe", { headConfig: { horns: true, ears: true, crown: false, eyes: 0x49301e }, bodyConfig: { pattern: "spots", accent: 0x9f572b } }),
  skin("capybara", "Capivara", "RARE", "COINS", 3000, 0xa97950, 0x66432f, "capybara", { headConfig: { horns: false, ears: true, crown: false, eyes: 0x382719 }, bodyConfig: { pattern: "plain", accent: 0xd4ae7c } }),
  skin("robot", "Robot Snake", "RARE", "COINS", 1000, 0x8ed8ea, 0x44899f, "robot", { bodyConfig: { pattern: "plates", accent: 0xe5fbff } }),
  skin("dino", "Dino Snake", "RARE", "COINS", 2000, 0x92cf64, 0x568340, "dino", { headConfig: { horns: true, ears: false, crown: false, eyes: 0x173a35 }, bodyConfig: { pattern: "plates", accent: 0xcaf28a } }),
  skin("sakura", "Sakura Bloom", "RARE", "COINS", 1500, 0xff91b8, 0xb84978, "sakura", { bodyConfig: { pattern: "spots", accent: 0xffe0ee }, headConfig: { horns: false, ears: true, crown: false, eyes: 0x6d284f } }),
  skin("storm", "Storm Chaser", "EPIC", "COINS", 3000, 0x7188c9, 0x34416e, "storm", { bodyConfig: { pattern: "waves", accent: 0xd0e7ff }, headConfig: { horns: true, ears: false, crown: false, eyes: 0xffe68a }, trailConfig: { enabled: true, color: 0x9fc8ff, width: 3 } }),
  skin("magma", "Magma Core", "EPIC", "COINS", 4500, 0xf36b3f, 0x792b2b, "magma", { bodyConfig: { pattern: "plates", accent: 0xffd15c }, headConfig: { horns: true, ears: false, crown: false, eyes: 0xfff1a3 }, trailConfig: { enabled: true, color: 0xff8548, width: 4 }, particleConfig: { enabled: true, color: 0xffb34d, rate: 12, max: 18 }, visualConfig: { effect: "fire", glow: 0.3, animation: "pulse" } }),
  skin("prism", "Prism Dream", "LEGENDARY", "COINS", 7000, 0x77e4dc, 0x426bb0, "prism", { bodyConfig: { pattern: "stripes", accent: 0xff9de2 }, headConfig: { horns: false, ears: false, crown: true, eyes: 0xfff5b5 }, trailConfig: { enabled: true, color: 0xb99cff, width: 5 }, particleConfig: { enabled: true, color: 0xb8fff1, rate: 16, max: 22 }, visualConfig: { effect: "rainbow", glow: 0.35, animation: "orbit" } }),
  skin("king-snake", "King Snake Skin", "EPIC", "BOSS_REWARD", null, 0xe5bd43, 0x815c22, "king-snake", { description: "Recompensa por derrotar King Snake.", bossRewardId: "king-snake", headConfig: { horns: true, ears: false, crown: true, eyes: 0xffef9c }, bodyConfig: { pattern: "scales", accent: 0xffe58a }, visualConfig: { effect: "sparkle", glow: 0.35, animation: "pulse" } }),
  skin("ghost", "Ghost Snake", "EPIC", "BOSS_REWARD", null, 0xc4f4f1, 0x629baf, "ghost", { description: "Recompensa por derrotar Kraken.", bossRewardId: "kraken", bodyConfig: { pattern: "waves", accent: 0xffffff }, trailConfig: { enabled: true, color: 0xa8fff4, width: 3 }, particleConfig: { enabled: true, color: 0xc5fff6, rate: 18, max: 24 }, visualConfig: { effect: "sparkle", glow: 0.35, animation: "float" } }),
  skin("desert-scorpion", "Desert Scorpion Snake", "LEGENDARY", "BOSS_REWARD", null, 0xe4a348, 0x713b28, "desert-scorpion", { description: "Recompensa por derrotar o Escorpião-Rei.", bossRewardId: "scorpion-king", worldId: "desert", headConfig: { horns: true, ears: false, crown: false, eyes: 0xffed9b }, bodyConfig: { pattern: "plates", accent: 0xffd783 }, trailConfig: { enabled: true, color: 0xffb44d, width: 4 }, particleConfig: { enabled: true, color: 0xffca68, rate: 12, max: 18 }, visualConfig: { effect: "ancient", glow: 0.35, animation: "pulse" } }),
  skin("royal-spider", "Aranha Real", "LEGENDARY", "BOSS_REWARD", null, 0xb98bd5, 0x4a345f, "royal-spider", { description: "Recompensa por derrotar a Aranha Real no Covil da Aranha.", bossRewardId: "spider-queen", worldId: "spider-lair", headConfig: { horns: false, ears: false, crown: true, eyes: 0xff8eae }, bodyConfig: { pattern: "spots", accent: 0xe6c7ff }, trailConfig: { enabled: true, color: 0xc393eb, width: 4 }, particleConfig: { enabled: true, color: 0xe0b8ff, rate: 12, max: 18 }, visualConfig: { effect: "sparkle", glow: 0.35, animation: "pulse" } }),
  skin("abyssal-serpent", "Serpente Abissal", "MYTHIC", "ACHIEVEMENT", null, 0x183e50, 0x10172e, "abyssal-serpent", { description: "Uma guardiã das ruínas silenciosas. Recompensa por sobreviver ao desafio do Abismo Mudo.", bodyConfig: { pattern: "scales", accent: 0x53c8bd }, headConfig: { horns: true, ears: false, crown: false, eyes: 0x9affed }, trailConfig: { enabled: true, color: 0x397f91, width: 2 }, particleConfig: { enabled: true, color: 0x65d9d1, rate: 5, max: 7 }, visualConfig: { effect: "void", glow: 0.18, animation: "pulse" }, previewConfig: { segments: 12, speed: 0.52, showTurbo: true, showVictory: true } }),
  skin("dragon", "Dragon Snake", "EPIC", "COINS", 5000, 0xc49bff, 0x835db6, "dragon", { family: "dragon", headConfig: { horns: true, ears: false, crown: false, eyes: 0xffdf74 }, bodyConfig: { pattern: "scales", accent: 0xffe3a5 }, trailConfig: { enabled: true, color: 0xc99cff, width: 3 }, particleConfig: { enabled: true, color: 0xe6c9ff, rate: 14, max: 20 }, visualConfig: { effect: "sparkle", glow: 0.25, animation: "pulse" } }),
  skin("candy-dragon", "Candy Dragon", "EPIC", "BOSS_REWARD", null, 0xff83c8, 0xb43d88, "candy-dragon", { family: "dragon", description: "Recompensa por derrotar Candy Monster.", bossRewardId: "candy-monster", worldId: "candy-world", bodyConfig: { pattern: "stripes", accent: 0xffe39c }, trailConfig: { enabled: true, color: 0xffa4df, width: 3 }, particleConfig: { enabled: true, color: 0xffc5e8, rate: 16, max: 20 } }),
  skin("fire-dragon", "Fire Dragon", "LEGENDARY", "PREMIUM", null, 0xff5738, 0x9f241e, "fire-dragon", { family: "dragon", futureProductId: "coinsnake.skin.fire_dragon", description: "Escamas rubras, olhos de brasa e rastros de fogo. Cosmética premium, sem bônus.", headConfig: { horns: true, ears: false, crown: false, eyes: 0xffe36c }, bodyConfig: { pattern: "scales", accent: 0xffc047 }, trailConfig: { enabled: true, color: 0xff6a28, width: 5 }, particleConfig: { enabled: true, color: 0xff8b32, rate: 24, max: 32 }, visualConfig: { effect: "fire", glow: 0.65, animation: "pulse" }, turboEffect: "fire", entranceEffect: "fire", victoryEffect: "fire", previewConfig: { segments: 12, speed: 0.55, showTurbo: true, showVictory: true } }),
  skin("rainbow", "Rainbow Serpent", "LEGENDARY", "PREMIUM", null, 0xff78b9, 0x8152c7, "rainbow", { futureProductId: "coinsnake.skin.rainbow_serpent", bodyConfig: { pattern: "stripes", accent: 0x72e5dc }, trailConfig: { enabled: true, color: 0xff9ae6, width: 5 }, particleConfig: { enabled: true, color: 0xffd679, rate: 20, max: 26 }, visualConfig: { effect: "rainbow", glow: 0.55, animation: "orbit" }, turboEffect: "rainbow", entranceEffect: "rainbow", victoryEffect: "rainbow", previewConfig: { segments: 12, speed: 0.55, showTurbo: true, showVictory: true } }),
  skin("leviathan", "Leviathan", "LEGENDARY", "PREMIUM", null, 0x319eb3, 0x174c77, "leviathan", { futureProductId: "coinsnake.skin.leviathan", bodyConfig: { pattern: "waves", accent: 0x9df4e8 }, trailConfig: { enabled: true, color: 0x47d8ed, width: 5 }, particleConfig: { enabled: true, color: 0x75e8fa, rate: 20, max: 26 }, visualConfig: { effect: "ocean", glow: 0.55, animation: "float" }, turboEffect: "ocean", entranceEffect: "ocean", victoryEffect: "ocean", previewConfig: { segments: 12, speed: 0.55, showTurbo: true, showVictory: true } }),
  skin("frost-wyvern", "Frost Wyvern", "LEGENDARY", "PREMIUM", null, 0x9deaff, 0x397aa7, "frost-wyvern", { futureProductId: "coinsnake.skin.frost_wyvern", headConfig: { horns: true, ears: false, crown: false, eyes: 0xeaffff }, bodyConfig: { pattern: "plates", accent: 0xffffff }, trailConfig: { enabled: true, color: 0xa9efff, width: 5 }, particleConfig: { enabled: true, color: 0xcaf8ff, rate: 20, max: 26 }, visualConfig: { effect: "frost", glow: 0.55, animation: "pulse" }, turboEffect: "frost", entranceEffect: "frost", victoryEffect: "frost", previewConfig: { segments: 12, speed: 0.55, showTurbo: true, showVictory: true } }),
  skin("ancient-dragon", "Ancient Dragon", "MYTHIC", "PREMIUM", null, 0xf3c85b, 0x81513a, "ancient-dragon", { family: "dragon", futureProductId: "coinsnake.skin.ancient_dragon", description: "Uma criatura ancestral envolvida em energia primordial.", headConfig: { horns: true, ears: false, crown: true, eyes: 0xffffff }, bodyConfig: { pattern: "scales", accent: 0xfff0a1 }, trailConfig: { enabled: true, color: 0xffd66d, width: 6 }, particleConfig: { enabled: true, color: 0xffe9a0, rate: 24, max: 32 }, visualConfig: { effect: "ancient", glow: 0.8, animation: "orbit" }, turboEffect: "ancient", entranceEffect: "ancient", victoryEffect: "ancient", previewConfig: { segments: 13, speed: 0.48, showTurbo: true, showVictory: true } }),
  skin("void-serpent", "Void Serpent", "MYTHIC", "PREMIUM", null, 0x49346e, 0x171226, "void-serpent", { futureProductId: "coinsnake.skin.void_serpent", description: "Uma serpente cósmica que carrega estrelas no vazio.", headConfig: { horns: true, ears: false, crown: false, eyes: 0xf4c5ff }, bodyConfig: { pattern: "stars", accent: 0xb889ff }, trailConfig: { enabled: true, color: 0x9c5cff, width: 6 }, particleConfig: { enabled: true, color: 0xc59aff, rate: 24, max: 32 }, visualConfig: { effect: "void", glow: 0.75, animation: "orbit" }, turboEffect: "void", entranceEffect: "void", victoryEffect: "void", previewConfig: { segments: 13, speed: 0.48, showTurbo: true, showVictory: true } }),
  skin("celestial-dragon", "Celestial Dragon", "MYTHIC", "PREMIUM", null, 0xf7f3dc, 0x789ac3, "celestial-dragon", { family: "dragon", futureProductId: "coinsnake.skin.celestial_dragon", description: "Um dragão celeste guiado por estrelas e luz serena.", headConfig: { horns: true, ears: false, crown: true, eyes: 0x72caff }, bodyConfig: { pattern: "stars", accent: 0xffd875 }, trailConfig: { enabled: true, color: 0x8ddfff, width: 6 }, particleConfig: { enabled: true, color: 0xfff1b0, rate: 24, max: 32 }, visualConfig: { effect: "celestial", glow: 0.8, animation: "orbit" }, turboEffect: "celestial", entranceEffect: "celestial", victoryEffect: "celestial", previewConfig: { segments: 13, speed: 0.48, showTurbo: true, showVictory: true } }),
  skin("inferno-titan", "Inferno Titan", "MYTHIC", "PREMIUM", null, 0xd93627, 0x541d2e, "inferno-titan", { futureProductId: "coinsnake.skin.inferno_titan", headConfig: { horns: true, ears: false, crown: true, eyes: 0xfff07d }, bodyConfig: { pattern: "plates", accent: 0xffb633 }, trailConfig: { enabled: true, color: 0xff4828, width: 6 }, particleConfig: { enabled: true, color: 0xffa329, rate: 24, max: 32 }, visualConfig: { effect: "inferno", glow: 0.85, animation: "pulse" }, turboEffect: "inferno", entranceEffect: "inferno", victoryEffect: "inferno", previewConfig: { segments: 13, speed: 0.48, showTurbo: true, showVictory: true } }),
];

// Keep legacy skin IDs and published prices intact for existing collections.
catalog.find((entry) => entry.id === "cat")!.coinPrice = 500;
catalog.find((entry) => entry.id === "robot")!.coinPrice = 1000;
catalog.find((entry) => entry.id === "dino")!.coinPrice = 2000;
catalog.find((entry) => entry.id === "dragon")!.coinPrice = 5000;
export const skins = catalog;

export type Skin = SkinDefinition;
export const skinRarities: SkinRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
export const skinUnlockTypes: SkinUnlockType[] = ["FREE", "COINS", "PLAYER_LEVEL", "BOSS_REWARD", "MASTERY", "ACHIEVEMENT", "PREMIUM", "EVENT"];
export const isSkinRarity = (value: unknown): value is SkinRarity => typeof value === "string" && skinRarities.includes(value as SkinRarity);
export const isSkinUnlockType = (value: unknown): value is SkinUnlockType => typeof value === "string" && skinUnlockTypes.includes(value as SkinUnlockType);
export const getSkin = (id: string) => skins.find((entry) => entry.id === id);
export const getBossSkinRewards = (bossId: string) => skins.filter((entry) => entry.bossRewardId === bossId);
export const skinsByFamily = (family: string) => skins.filter((entry) => entry.family === family);
export const getSkinPreviewConfig = (id: string) => getSkin(id)?.previewConfig;
export const isMysterySkin = (skin: SkinDefinition) => skin.id === "abyssal-serpent";
export const skinMysteryClues = {
  subtle: "Uma presença antiga repousa onde as correntes deixam de cantar.",
  clear: "Sobreviva por 90 segundos no Abismo Mudo para descobrir esta skin.",
} as const;
export function skinUnlockStatus(skin: SkinDefinition, profile: { unlockedSkins: string[]; playerLevel: number; bossesDefeated: string[]; mastery: Record<string, number>; achievements: string[] }) {
  if (profile.unlockedSkins.includes(skin.id)) return { unlocked: true, label: "Desbloqueada" };
  switch (skin.unlockType) {
    case "FREE": return { unlocked: true, label: "Grátis" };
    case "PREMIUM": return { unlocked: false, label: "Premium — em breve" };
    case "PLAYER_LEVEL": return { unlocked: profile.playerLevel >= (skin.requirementValue ?? 1), label: `Nível ${skin.requirementValue ?? 1}` };
    case "BOSS_REWARD": return { unlocked: !!skin.bossRewardId && profile.bossesDefeated.includes(skin.bossRewardId), label: `Derrote ${skin.bossRewardId ?? "o chefe indicado"}` };
    case "MASTERY": return { unlocked: (profile.mastery[skin.id] ?? 0) >= 10, label: "Domínio nível 10" };
    case "ACHIEVEMENT": return { unlocked: profile.achievements.includes("boss-hunter"), label: "Derrote qualquer chefe" };
    case "EVENT": return { unlocked: false, label: "Evento futuro" };
    case "COINS": return { unlocked: false, label: `${skin.coinPrice?.toLocaleString("pt-BR")} moedas` };
  }
}