import { Preferences } from "@capacitor/preferences";
import { B } from "../data/balance";
import { skins } from "../data/skins";
import { missions } from "../data/missions";
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
    saveVersion: 3,
    totalCoins: 0,
    bestScore: 0,
    selectedSkin: "classic",
    unlockedSkins: ["classic"],
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
    },
    firstLaunch: true,
    tutorialCompleted: false,
    hints: { joystick: false, turbo: false, shrink: false },
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
    missions: {},
    unlockedPets: [],
    selectedPet: null,
    bossesDefeated: [],
    achievements: [],
    mastery: {},
    worldsUnlocked: ["green-valley"],
  };
}
export function validateSave(input: unknown): PlayerProfile {
  const p = defaults(),
    r = record(input);
  if (r.saveVersion !== 1 && r.saveVersion !== 2 && r.saveVersion !== 3) return p;
  p.totalCoins = num(r.totalCoins);
  p.bestScore = num(r.bestScore);
  p.xp = num(r.xp);
  p.playerLevel = 1 + Math.floor(p.xp / B.xp.perLevel);
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
  };
  const stats = record(r.statistics);
  for (const key of Object.keys(p.statistics) as (keyof typeof p.statistics)[])
    p.statistics[key] = num(stats[key], p.statistics[key]);
  p.bestScore = Math.max(p.bestScore, p.statistics.highestScore);
  const isV3 = r.saveVersion === 3;
  p.unlockedPets = isV3 && Array.isArray(r.unlockedPets) ? [...new Set(r.unlockedPets.filter((id): id is string => id === "bee" || id === "candy-blob"))] : [];
  p.selectedPet = typeof r.selectedPet === "string" && p.unlockedPets.includes(r.selectedPet) ? r.selectedPet : null;
  p.bossesDefeated = isV3 && Array.isArray(r.bossesDefeated) ? [...new Set(r.bossesDefeated.filter((id): id is string => id === "king-snake" || id === "candy-monster"))] : [];
  p.achievements = isV3 && Array.isArray(r.achievements) ? [...new Set(r.achievements.filter((id): id is string => typeof id === "string"))] : [];
  const mastery = record(r.mastery);
  p.mastery = Object.fromEntries(skins.map((skin) => [skin.id, isV3 ? num(mastery[skin.id]) : 0]));
  const worldIds = new Set(["green-valley", "candy-world", "ocean"]);
  p.worldsUnlocked = [...new Set(["green-valley", ...(isV3 && Array.isArray(r.worldsUnlocked) ? r.worldsUnlocked.filter((id): id is string => typeof id === "string" && worldIds.has(id)) : [])])];
  p.missionDate =
    typeof r.missionDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.missionDate)
      ? r.missionDate
      : "";
  const progress = record(r.missions);
  for (const m of missions) {
    const entry = record(progress[m.id]);
    p.missions[m.id] = {
      progress: Math.min(m.target, num(entry.progress)),
      claimed: bool(entry.claimed, false) && num(entry.progress) >= m.target,
    };
  }
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
      if(typeof version==='number'&&version>3){this.incompatibleVersion=true;this.error='Save de uma versão mais nova: gravação desativada para preservar seus dados.';return;}
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
}
export const save = new SaveSystem();
