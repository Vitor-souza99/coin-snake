export interface Point {
  x: number;
  y: number;
}
export type LanguagePreference = "auto" | "pt-BR" | "en";
export type GameDifficulty = "easy" | "normal" | "hard";
export interface Settings {
  muted: boolean;
  volume: number;
  haptics: boolean;
  leftHanded: boolean;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  cameraMode: "standard" | "panoramic";
  gameDifficulty: GameDifficulty;
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
  saveVersion: 19;
  totalCoins: number;
  bossCoinBalance: number;
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
  hints: { joystick: boolean; turbo: boolean; shrink: boolean; ocean: boolean; oceanCurrent: boolean; pearl: boolean; deepTrench: boolean; desertGust: boolean };
  statistics: GameStatistics;
  missionDate: string;
  dailyMissionIds: string[];
  missions: Record<string, MissionProgress>;
  unlockedPets: string[];
  availablePets: string[];
  selectedPet: string | null;
  cloverGardenProgress: number;
  cloverGardenProgressByOrigin: { "candy-world": number; ocean: number };
  cloverGardenCollected: number[];
  cloverGardenBossesDefeated: string[];
  rewardedShopDate: string;
  bossesDefeated: string[];
  achievements: string[];
  mastery: Record<string, number>;
  worldsUnlocked: string[];
  selectedWorld: string;
  abyssChallengeBest: number;
  abyssChallengeCompleted: boolean;
  abyssSanctuaryProgress: number;
  desertExpeditionCheckpoint: number;
  desertExpeditionActive: boolean;
  desertRelicFound: boolean;
  freezeUnlocked: boolean;
  freezeRewardClaimed: boolean;
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
  coinXP: number;
  bossCoinXP: number;
  coinXPCredited: number;
  bossCoinXPCredited: number;
  portalsUsed: number;
  bossDefeats: number;
  rushMode: boolean;
  rushRemaining: number;
  gameDifficulty: GameDifficulty;
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
    coinXP: 0,
    bossCoinXP: 0,
    coinXPCredited: 0,
    bossCoinXPCredited: 0,
    portalsUsed: 0,
    bossDefeats: 0,
    rushMode: false,
    rushRemaining: 60,
    gameDifficulty: "normal",
  };
}
