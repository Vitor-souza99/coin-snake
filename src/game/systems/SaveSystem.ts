import { Preferences } from "@capacitor/preferences";
import { levelForXP } from "./ExperienceSystem";
import { getBossSkinRewards, skins } from "../data/skins";
import { dailyMissions, missions } from "../data/missions";
import { bosses } from "../data/bosses";
import { earnablePetIds, pets } from "../data/pets";
import type { PlayerProfile } from "../types/game";
const record = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0
    ? Math.min(Math.floor(v), Number.MAX_SAFE_INTEGER)
    : fallback;
const bool = (v: unknown, fallback: boolean) =>
  typeof v === "boolean" ? v : fallback;
export function defaults(): PlayerProfile {
  return {
    saveVersion: 18,
    totalCoins: 0,
    bossCoinBalance: 0,
    bestScore: 0,
    selectedSkin: "classic",
    unlockedSkins: ["classic"],
    premiumEntitlements: [],
    xp: 0,
    playerLevel: 1,
    completedMissions: [],
    settings: {
      muted: false,
      volume: 0.35,
      haptics: true,
      leftHanded: false,
      musicVolume: 0.2,
      sfxVolume: 0.35,
      reducedMotion: false,
      cameraMode: "standard",
      gameDifficulty: "normal",
      orientation: "auto",
      language: "auto",
    },
    firstLaunch: true,
    tutorialCompleted: false,
    hints: { joystick: false, turbo: false, shrink: false, ocean: false, oceanCurrent: false, pearl: false, deepTrench: false, desertGust: false },
    statistics: {
      totalGames: 0,
      totalCoinsCollected: 0,
      highestScore: 0,
      longestSurvivalTime: 0,
      highestCombo: 1,
      totalPowerUpsCollected: 0,
      shrinkFruitsCollected: 0,
      turboUses: 0,
      bossesDefeated: 0,
      portalsUsed: 0,
    },
    missionDate: "",
    dailyMissionIds: [],
    missions: {},
    unlockedPets: [],
    availablePets: [],
    selectedPet: null,
    cloverGardenProgress: 0,
    cloverGardenProgressByOrigin: { "candy-world": 0, ocean: 0 },
    cloverGardenCollected: [],
    cloverGardenBossesDefeated: [],
    rewardedShopDate: "",
    bossesDefeated: [],
    achievements: [],
    mastery: {},
    worldsUnlocked: ["green-valley"],
    selectedWorld: "green-valley",
    abyssChallengeBest: 0,
    abyssChallengeCompleted: false,
    abyssSanctuaryProgress: 0,
    desertExpeditionCheckpoint: 0,
    desertExpeditionActive: false,
    desertRelicFound: false,
  };
}
export function validateSave(input: unknown): PlayerProfile {
  const p = defaults(),
    r = record(input);
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(r.saveVersion as number)) return p;
  p.totalCoins = num(r.totalCoins);
  p.bossCoinBalance = num(r.bossCoinBalance);
  p.bestScore = num(r.bestScore);
  p.xp = num(r.xp);
  p.playerLevel = levelForXP(p.xp);
  const valid = new Set<string>(skins.map((s) => s.id));
  p.unlockedSkins = [
    ...new Set([
      "classic",
      ...(Array.isArray(r.unlockedSkins)
        ? r.unlockedSkins.filter(
            (id): id is string => typeof id === "string" && valid.has(id),
          )
        : []),
    ]),
  ];
  // Previous versions had only earned/coin skins; preserve ownership and never
  // trust a local save to grant premium entitlements.
  p.premiumEntitlements = [];
  p.selectedSkin =
    typeof r.selectedSkin === "string" &&
    p.unlockedSkins.includes(r.selectedSkin)
      ? r.selectedSkin
      : "classic";
  p.completedMissions = Array.isArray(r.completedMissions)
    ? [
        ...new Set(
          r.completedMissions.filter(
            (id): id is string => typeof id === "string",
          ),
        ),
      ].slice(-100)
    : [];
  p.firstLaunch = bool(r.firstLaunch, true);
  p.tutorialCompleted = bool(r.tutorialCompleted, false);
  const s = record(r.settings);
  p.settings.muted = bool(s.muted, false);
  p.settings.haptics = bool(s.haptics, true);
  p.settings.volume =
    typeof s.volume === "number" && Number.isFinite(s.volume)
      ? Math.max(0, Math.min(1, s.volume))
      : 0.35;
  p.settings.leftHanded = bool(s.leftHanded, false);
  p.settings.reducedMotion = bool(s.reducedMotion, false);
  p.settings.cameraMode = s.cameraMode === "panoramic" ? "panoramic" : "standard";
  const currentSettingsSave = [16, 17].includes(r.saveVersion as number);
  p.settings.gameDifficulty = s.gameDifficulty === "easy" || s.gameDifficulty === "hard"
    ? s.gameDifficulty
    : currentSettingsSave && s.gameDifficulty === "normal"
      ? "normal"
      : s.speedPreference === "low"
        ? "easy"
        : s.speedPreference === "high" || s.speedPreference === "very-high"
          ? "hard"
          : "normal";
  p.settings.orientation = s.orientation === "portrait" || s.orientation === "landscape" ? s.orientation : "auto";
  p.settings.language = s.language === "pt-BR" || s.language === "en" ? s.language : "auto";
  const volume = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, Math.min(1, v))
      : fallback;
  p.settings.sfxVolume = volume(s.sfxVolume, p.settings.volume);
  p.settings.musicVolume = volume(s.musicVolume, 0.2);
  const hints = record(r.hints);
  p.hints = {
    joystick: bool(hints.joystick, false),
    turbo: bool(hints.turbo, false),
    shrink: bool(hints.shrink, false),
    ocean: bool(hints.ocean, false),
    oceanCurrent: bool(hints.oceanCurrent, false),
    pearl: bool(hints.pearl, false),
    deepTrench: bool(hints.deepTrench, false),
    desertGust: bool(hints.desertGust, false),
  };
  const stats = record(r.statistics);
  for (const key of Object.keys(p.statistics) as (keyof typeof p.statistics)[])
    p.statistics[key] = num(stats[key], p.statistics[key]);
  p.bestScore = Math.max(p.bestScore, p.statistics.highestScore);
  const isV3 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(r.saveVersion as number);
  const validPetIds = new Set([...earnablePetIds, "lucky-leprechaun"]);
  const savedCloverProgress = Math.min(4, num(r.cloverGardenProgress));
  const cloverByOrigin = record(r.cloverGardenProgressByOrigin);
  const hasSavedOriginProgress = "candy-world" in cloverByOrigin || "ocean" in cloverByOrigin;
  const unifiedCloverProgress = (r.saveVersion === 16 || r.saveVersion === 17 || r.saveVersion === 18) && hasSavedOriginProgress
    ? Math.min(4, num(cloverByOrigin["candy-world"]) + num(cloverByOrigin.ocean))
    : savedCloverProgress;
  const savedCloverByOrigin = { "candy-world": unifiedCloverProgress, ocean: 0 };
  p.cloverGardenProgressByOrigin = savedCloverByOrigin;
  p.cloverGardenProgress = unifiedCloverProgress;
  p.cloverGardenCollected = Array.isArray(r.cloverGardenCollected)
    ? [...new Set(r.cloverGardenCollected.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < 4))].sort((left, right) => left - right).slice(0, unifiedCloverProgress)
    : Array.from({ length: unifiedCloverProgress }, (_, index) => index);
  while (p.cloverGardenCollected.length < unifiedCloverProgress) {
    const nextUncollected = [0, 1, 2, 3].find((index) => !p.cloverGardenCollected.includes(index));
    if (nextUncollected === undefined) break;
    p.cloverGardenCollected.push(nextUncollected);
  }
  const savedGardenBosses = (r.saveVersion === 16 || r.saveVersion === 17 || r.saveVersion === 18) && Array.isArray(r.cloverGardenBossesDefeated) && r.cloverGardenBossesDefeated.some((id) => id === "candy-garden-guardian" || id === "ocean-garden-guardian") ? ["candy-garden-guardian"] : [];
  p.cloverGardenBossesDefeated = [...new Set(savedGardenBosses)];
  const savedPets = isV3 && Array.isArray(r.unlockedPets) ? r.unlockedPets.filter((id): id is string => typeof id === "string" && validPetIds.has(id) && (id !== "lucky-leprechaun" || p.cloverGardenProgress >= 4)) : [];
  p.rewardedShopDate = typeof r.rewardedShopDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.rewardedShopDate) ? r.rewardedShopDate : "";
  const bossIds = new Set(bosses.map((boss) => boss.id));
  p.bossesDefeated = isV3 && Array.isArray(r.bossesDefeated) ? [...new Set(r.bossesDefeated.filter((id): id is string => typeof id === "string" && bossIds.has(id)))] : [];
  const bossWins = new Set(p.bossesDefeated);
  const bossUnlockedPets = earnablePetIds.filter((id) => {
    const pet = pets.find((entry) => entry.id === id);
    return id !== "tiny-dragon" && pet?.bossRewardId && pet.coinPrice === undefined && bossWins.has(pet.bossRewardId)
      && (pet.requiredBossIds ?? []).every((bossId) => bossWins.has(bossId));
  });
  const availableBossPets = earnablePetIds.filter((id) => {
    const pet = pets.find((entry) => entry.id === id);
    if (id === "celestial-serpent") return p.abyssSanctuaryProgress >= 3;
    return pet?.bossRewardId && (id !== "tiny-dragon" || bool(r.desertRelicFound, false)) && bossWins.has(pet.bossRewardId)
      && (pet.requiredBossIds ?? []).every((bossId) => bossWins.has(bossId));
  });
  const savedAvailablePets = isV3 && Array.isArray(r.availablePets) ? r.availablePets.filter((id): id is string => typeof id === "string" && validPetIds.has(id)) : [];
  const savedDragonOffer = bool(r.desertRelicFound, false) && bossWins.has("scorpion-king") && savedAvailablePets.includes("tiny-dragon");
  p.availablePets = [...new Set([...savedAvailablePets.filter((id) => id !== "tiny-dragon"), ...availableBossPets, ...(savedDragonOffer ? ["tiny-dragon"] : [])])];
  // In v8 the firefly was automatically granted with King Snake; preserve that
  // existing ownership when migrating rather than charging players again.
  const ownedBossPets = [...bossUnlockedPets].filter((id) => !pets.find((pet) => pet.id === id)?.coinPrice);
  const canKeepDragon = bool(r.desertRelicFound, false) && bossWins.has("scorpion-king");
  p.unlockedPets = [...new Set([...savedPets.filter((id) => id !== "tiny-dragon" || canKeepDragon), ...ownedBossPets])];
  if ((r.saveVersion as number) <= 8 && bossWins.has("king-snake")) p.unlockedPets.push("firefly");
  const hadDragon = Array.isArray(r.unlockedPets) && r.unlockedPets.includes("tiny-dragon");
  const keepDragon = bool(r.desertRelicFound, false) && bossWins.has("scorpion-king") && p.availablePets.includes("tiny-dragon");
  if (hadDragon && keepDragon && !p.unlockedPets.includes("tiny-dragon")) p.unlockedPets.push("tiny-dragon");
  p.selectedPet = typeof r.selectedPet === "string" && p.unlockedPets.includes(r.selectedPet) ? r.selectedPet : null;
  if (p.cloverGardenProgress >= 4 && !p.unlockedPets.includes("lucky-leprechaun")) p.unlockedPets.push("lucky-leprechaun");
  p.unlockedSkins = [...new Set([...p.unlockedSkins, ...p.bossesDefeated.flatMap((bossId) => getBossSkinRewards(bossId).map((skin) => skin.id))])];
  p.achievements = isV3 && Array.isArray(r.achievements) ? [...new Set(r.achievements.filter((id): id is string => typeof id === "string"))] : [];
  const mastery = record(r.mastery);
  p.mastery = Object.fromEntries(skins.map((skin) => [skin.id, isV3 ? num(mastery[skin.id]) : 0]));
  const worldIds = new Set(["green-valley", "candy-world", "ocean", "silent-abyss", "desert", "spider-lair", "desert-labyrinth"]);
  const legacyWorldAliases: Record<string, string> = { green_valley: "green-valley", candy_world: "candy-world", ocean_world: "ocean", desert_world: "desert" };
  const savedWorlds = isV3 && Array.isArray(r.worldsUnlocked)
    ? r.worldsUnlocked.flatMap((id): string[] => {
        if (typeof id !== "string") return [];
        const canonical = legacyWorldAliases[id] ?? id;
        return worldIds.has(canonical) ? [canonical] : [];
      })
    : [];
  p.worldsUnlocked = [...new Set(["green-valley", ...savedWorlds])];
  p.worldsUnlocked = p.worldsUnlocked.filter((id) => id !== "clover-garden");
  const defeated = new Set(p.bossesDefeated);
  if (p.playerLevel >= 5 && defeated.has("king-snake")) p.worldsUnlocked.push("candy-world");
  if (p.playerLevel >= 10 && defeated.has("candy-monster") && p.worldsUnlocked.includes("candy-world")) p.worldsUnlocked.push("ocean");
  if (defeated.has("kraken") && p.worldsUnlocked.includes("ocean")) p.worldsUnlocked.push("silent-abyss");
  else p.worldsUnlocked = p.worldsUnlocked.filter((id) => id !== "silent-abyss");
  if (defeated.has("scorpion-king")) p.worldsUnlocked.push("spider-lair");
  else p.worldsUnlocked = p.worldsUnlocked.filter((id) => id !== "spider-lair");
  p.worldsUnlocked = p.worldsUnlocked.filter((id) => id !== "desert-labyrinth");
  if (p.playerLevel >= 15 && defeated.has("kraken") && p.worldsUnlocked.includes("ocean")) p.worldsUnlocked.push("desert");
  p.worldsUnlocked = [...new Set(p.worldsUnlocked)];
  p.abyssChallengeBest = num(r.abyssChallengeBest);
  p.abyssChallengeCompleted = bool(r.abyssChallengeCompleted, false);
  p.abyssSanctuaryProgress = Math.min(3, num(r.abyssSanctuaryProgress));
  if (p.abyssSanctuaryProgress >= 3) {
    p.availablePets = [...new Set([...p.availablePets, "celestial-serpent"])];
    if (!p.unlockedPets.includes("celestial-serpent")) p.unlockedPets.push("celestial-serpent");
  }
  if (p.abyssChallengeCompleted) p.unlockedSkins = [...new Set([...p.unlockedSkins, "abyssal-serpent"] )];
  if (p.worldsUnlocked.includes("ocean") && !p.worldsUnlocked.includes("candy-world")) p.worldsUnlocked.push("candy-world");
  p.selectedWorld = typeof r.selectedWorld === "string" && p.worldsUnlocked.includes(legacyWorldAliases[r.selectedWorld] ?? r.selectedWorld)
    ? legacyWorldAliases[r.selectedWorld] ?? r.selectedWorld
    : "green-valley";
  p.missionDate =
    typeof r.missionDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.missionDate)
      ? r.missionDate
      : "";
  const validMissionIds = new Set(missions.map((mission) => mission.id));
  const savedMissionIds = Array.isArray(r.dailyMissionIds)
    ? r.dailyMissionIds.filter((id): id is string => typeof id === "string" && validMissionIds.has(id))
    : [];
  const uniqueSavedMissionIds = [...new Set(savedMissionIds)];
  const hasValidDailySelection = uniqueSavedMissionIds.length === 3
    && new Set(uniqueSavedMissionIds.map((id) => missions.find((mission) => mission.id === id)?.difficulty)).size === 3;
  const legacyFixedSet = ["collector", "scorer", "explorer"];
  p.dailyMissionIds = hasValidDailySelection
    ? uniqueSavedMissionIds
    : r.saveVersion !== 8 && r.saveVersion !== 9
      ? legacyFixedSet
      : p.missionDate
        ? dailyMissions(p.missionDate).map((mission) => mission.id)
        : legacyFixedSet;
  const progress = record(r.missions);
  const selectedSet = new Set(p.dailyMissionIds);
  const legacySet = new Set(legacyFixedSet);
  for (const m of missions) {
    const entry = record(progress[m.id]);
    const preserveLegacy = !hasValidDailySelection && r.saveVersion !== 8 && r.saveVersion !== 9 && legacySet.has(m.id);
    p.missions[m.id] = {
      progress: selectedSet.has(m.id) || preserveLegacy ? Math.min(m.target, num(entry.progress)) : 0,
      claimed: (selectedSet.has(m.id) || preserveLegacy) && bool(entry.claimed, false) && num(entry.progress) >= m.target,
    };
  }
  p.desertRelicFound = bool(r.desertRelicFound, false);
  p.desertExpeditionCheckpoint = p.desertRelicFound ? 3 : Math.min(2, Math.max(0, Math.floor(num(r.desertExpeditionCheckpoint))));
  p.desertExpeditionActive = !p.desertRelicFound && bool(r.desertExpeditionActive, false) && p.bossesDefeated.includes("scorpion-king");
  if (p.desertRelicFound) p.desertExpeditionActive = false;
  if (p.desertRelicFound && p.bossesDefeated.includes("scorpion-king")) p.availablePets = [...new Set([...p.availablePets, "tiny-dragon"])];
  else p.availablePets = p.availablePets.filter((id) => id !== "tiny-dragon");
  if (!p.desertRelicFound && r.saveVersion !== 9) p.unlockedPets = p.unlockedPets.filter((id) => id !== "tiny-dragon");
  p.saveVersion = 18;
  return p;
}
export interface SaveStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
}
const storage: SaveStorage = {
  get: async () => (await Preferences.get({ key: "coin-snake-v1" })).value,
  set: (value) => Preferences.set({ key: "coin-snake-v1", value }),
};
export class SaveSystem {
  profile = defaults();
  error: string | null = null;
  private queue = Promise.resolve();
  private incompatibleVersion=false;
  constructor(private backend: SaveStorage = storage) {}
  async load() {
    try {
      const raw = await this.backend.get();
      const parsed:unknown=raw?JSON.parse(raw):null;
      const version=record(parsed).saveVersion;
      if(typeof version==='number'&&version>16){this.incompatibleVersion=true;this.error='Save de uma versão mais nova: gravação desativada para preservar seus dados.';return;}
      this.profile = validateSave(parsed);
    } catch {
      this.profile = defaults();
      this.error = "Não foi possível ler o progresso.";
    }
  }
  save(): Promise<void> {
    if(this.incompatibleVersion)return Promise.resolve();
    const snapshot = JSON.stringify(this.profile);
    this.queue = this.queue.then(async () => {
      try {
        await this.backend.set(snapshot);
        this.error = null;
      } catch {
        this.error = "Progresso não salvo. Confira o armazenamento.";
      }
    });
    return this.queue;
  }
  reset(): Promise<void> {
    if (this.incompatibleVersion) return Promise.resolve();
    this.profile = defaults();
    this.error = null;
    const snapshot = JSON.stringify(this.profile);
    this.queue = this.queue.then(async () => {
      try {
        await this.backend.set(snapshot);
        this.error = null;
      } catch {
        this.error = "Progresso reiniciado nesta sessão, mas não foi possível salvar a alteração.";
      }
    });
    return this.queue;
  }
}
export const save = new SaveSystem();
