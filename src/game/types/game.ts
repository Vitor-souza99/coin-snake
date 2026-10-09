export interface Point {
  x: number;
  y: number;
}
export type LanguagePreference = "auto" | "pt-BR" | "en";
export interface Settings {
  muted: boolean;
  volume: number;
  haptics: boolean;
  leftHanded: boolean;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  cameraMode: "standard" | "panoramic";
  speedPreference: "low" | "medium" | "high" | "very-high";
  orientation: "auto" | "portrait" | "landscape";
  language: LanguagePreference;
}
export interface GameStatistics {
  totalGames: number;
  totalCoinsCollected: number;
  highestScore: number;
  longestSurvivalTime: number;
  highestCombo: number;
  totalPowerUpsCollected: number;
  shrinkFruitsCollected: number;
  turboUses: number;
  bossesDefeated: number;
  portalsUsed: number;
}
export interface MissionProgress {
  progress: number;
  claimed: boolean;
}
export interface PlayerProfile {
  saveVersion: 9;
  totalCoins: number;
  bestScore: number;
  selectedSkin: string;
  unlockedSkins: string[];
  /** Informational local cache only; not proof of a store purchase. */
  premiumEntitlements: string[];
  xp: number;
  playerLevel: number;
  completedMissions: string[];
  settings: Settings;
  firstLaunch: boolean;
  tutorialCompleted: boolean;
  hints: { joystick: boolean; turbo: boolean; shrink: boolean; ocean: boolean; oceanCurrent: boolean; pearl: boolean; deepTrench: boolean };
  statistics: GameStatistics;
  missionDate: string;
  dailyMissionIds: string[];
  missions: Record<string, MissionProgress>;
  unlockedPets: string[];
  availablePets: string[];
  selectedPet: string | null;
  rewardedShopDate: string;
  bossesDefeated: string[];
  achievements: string[];
  mastery: Record<string, number>;
  worldsUnlocked: string[];
  selectedWorld: string;
}
export interface RunState {
  id: string;
  missionDate: string;
  score: number;
  matchCoins: number;
  maxCombo: number;
  elapsed: number;
  powerups: number;
  shrinkFruits: number;
  turboUses: number;
  golden: number;
  magnet: number;
  revived: boolean;
  creditedCoins: number;
  finished: boolean;
  reported: { coins: number; powerups: number; golden: number; magnet: number };
  missionFinalized: boolean;
  bossEnergy: number;
  bossCoins: number;
  portalsUsed: number;
  bossDefeats: number;
  rushMode: boolean;
  rushRemaining: number;
}
export function newRun(): RunState {
  return {
    id: crypto.randomUUID(),
    missionDate: "",
    score: 0,
    matchCoins: 0,
    maxCombo: 1,
    elapsed: 0,
    powerups: 0,
    shrinkFruits: 0,
    turboUses: 0,
    golden: 0,
    magnet: 0,
    revived: false,
    creditedCoins: 0,
    finished: false,
    reported: { coins: 0, powerups: 0, golden: 0, magnet: 0 },
    missionFinalized: false,
    bossEnergy: 0,
    bossCoins: 0,
    portalsUsed: 0,
    bossDefeats: 0,
    rushMode: false,
    rushRemaining: 60,
  };
}
