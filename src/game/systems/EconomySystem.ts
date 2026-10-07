import { B } from "../data/balance";
import { skins, skinUnlockStatus } from "../data/skins";
import type { PlayerProfile, RunState } from "../types/game";
import { reconcileWorldUnlocks } from "./WorldSystem";
export function addXP(p: PlayerProfile, amount: number) {
  p.xp += Math.max(0, Math.floor(amount));
  p.playerLevel = 1 + Math.floor(p.xp / B.xp.perLevel);
  reconcileWorldUnlocks(p);
}
export function buySkin(p: PlayerProfile, id: string): boolean {
  const skin = skins.find((s) => s.id === id);
  if (!skin || skin.unlockType === "PREMIUM") return false;
  if (skin.unlockType !== "COINS" && skin.unlockType !== "FREE") {
    if (!skinUnlockStatus(skin, p).unlocked) return false;
    p.unlockedSkins.push(id);
    p.selectedSkin = id;
    return true;
  }
  if (!p.unlockedSkins.includes(id)) {
    if (skin.unlockType === "COINS") {
      if (skin.coinPrice === null || p.totalCoins < skin.coinPrice) return false;
      p.totalCoins -= skin.coinPrice;
    } else if (skin.unlockType === "FREE") {
      if (skin.coinPrice !== 0) return false;
    } else return false;
    p.unlockedSkins.push(id);
  }
  p.selectedSkin = id;
  return true;
}
// Credit only the delta at each death: a revive cannot pay the same coins twice.
export function creditCoins(p: PlayerProfile, run: RunState) {
  const amount = Math.max(0, run.matchCoins - run.creditedCoins);
  p.totalCoins += amount;
  run.creditedCoins = run.matchCoins;
  p.bestScore = Math.max(p.bestScore, run.score);
}
export function finishRun(p: PlayerProfile, run: RunState) {
  if (run.finished) return;
  creditCoins(p, run);
  run.finished = true;
  addXP(p, B.xp.perRun + Math.floor(run.score / B.xp.scoreDivisor));
  if (p.selectedPet === "candy-blob")
    addXP(p, Math.ceil((B.xp.perRun + Math.floor(run.score / B.xp.scoreDivisor)) * 0.05));
  const s = p.statistics;
  s.totalGames++;
  s.totalCoinsCollected += run.matchCoins;
  s.highestScore = Math.max(s.highestScore, run.score);
  s.longestSurvivalTime = Math.max(
    s.longestSurvivalTime,
    Math.floor(run.elapsed),
  );
  s.highestCombo = Math.max(s.highestCombo, run.maxCombo);
  s.totalPowerUpsCollected += run.powerups;
  s.shrinkFruitsCollected += run.shrinkFruits;
  s.turboUses += run.turboUses;
  s.bossesDefeated += run.bossDefeats;
  s.portalsUsed += run.portalsUsed;
}
