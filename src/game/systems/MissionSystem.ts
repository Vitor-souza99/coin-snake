import { missions } from "../data/missions";
import { B } from "../data/balance";
import { localDay } from "../utils/math";
import type { PlayerProfile, RunState } from "../types/game";
import { addXP } from "./EconomySystem";
export function ensureDay(p: PlayerProfile, today = localDay()) {
  if (p.missionDate !== today) {
    p.missionDate = today;
    p.missions = Object.fromEntries(
      missions.map((m) => [m.id, { progress: 0, claimed: false }]),
    );
  }
}
export function reportRun(p: PlayerProfile, run: RunState, final = false) {
  ensureDay(p);
  for (const m of missions) {
    const entry = p.missions[m.id];
    let value = 0;
    let maximum = false;
    switch (m.type) {
      case "coins":
        value = run.matchCoins - run.reported.coins;
        break;
      case "score":
        value = run.score;
        maximum = true;
        break;
      case "powerups":
        value = run.powerups - run.reported.powerups;
        break;
      case "survival":
        value = run.elapsed;
        maximum = true;
        break;
      case "combo":
        value = run.maxCombo;
        maximum = true;
        break;
      case "golden":
        value = run.golden - run.reported.golden;
        break;
      case "magnet":
        value = run.magnet - run.reported.magnet;
        break;
      case "games":
        value = final && !run.finished ? 1 : 0;
        break;
    }
    entry.progress = Math.min(
      m.target,
      maximum
        ? Math.max(entry.progress, value)
        : entry.progress + Math.max(0, value),
    );
  }
  run.reported = {
    coins: run.matchCoins,
    powerups: run.powerups,
    golden: run.golden,
    magnet: run.magnet,
  };
}
export function claimMission(p: PlayerProfile, id: string): boolean {
  ensureDay(p);
  const m = missions.find((m) => m.id === id),
    entry = p.missions[id];
  if (!m || !entry || entry.claimed || entry.progress < m.target) return false;
  entry.claimed = true;
  p.totalCoins += m.reward;
  addXP(p, B.xp.perMission);
  p.completedMissions = [
    ...p.completedMissions,
    `${p.missionDate}:${id}`,
  ].slice(-100);
  return true;
}
