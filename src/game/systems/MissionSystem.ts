import { dailyMissions, missions, missionsForProfile } from "../data/missions";
import { B } from "../data/balance";
import { localDay } from "../utils/math";
import type { PlayerProfile, RunState } from "../types/game";
import { addXP } from "./EconomySystem";

export function ensureDay(p: PlayerProfile, today = localDay()) {
  if (p.missionDate !== today) {
    p.missionDate = today;
    p.dailyMissionIds = selectDailyMissions(today);
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    return;
  }
  const selected = missionsForProfile(p.dailyMissionIds ?? []);
  if (selected.length !== 3) {
    p.dailyMissionIds = selectDailyMissions(today);
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
  }
}

function selectDailyMissions(today: string) {
  if (!today || today === "1970-01-01") return ["collector", "scorer", "explorer"];
  return dailyMissions(today).map((mission) => mission.id);
}

export function missionById(id: string) {
  return missions.find((mission) => mission.id === id);
}

export function startMissionRun(p: PlayerProfile, run: RunState, today = localDay()) {
  if (p.missionDate && p.missionDate !== today) ensureDay(p, today);
  ensureDay(p, today);
  run.missionDate = today;
}

export function updateMissionDay(p: PlayerProfile, today = localDay()) {
  if (p.missionDate !== today) {
    ensureDay(p, today);
    return true;
  }
  return false;
}

export function reportRun(p: PlayerProfile, run: RunState, final = false) {
  const runDay = run.missionDate || p.missionDate || localDay();
  if (p.missionDate !== runDay) {
    if (final && !run.missionFinalized) run.missionFinalized = true;
    return [];
  }
  const isFinalReport = final && !run.missionFinalized;

  const completed: string[] = [];
  for (const m of missionsForProfile(p.dailyMissionIds)) {
    const entry = p.missions[m.id] ?? (p.missions[m.id] = { progress: 0, claimed: false });
    if (!entry || entry.claimed) continue;
    if (m.type === "games" && !isFinalReport) continue;
    let value = 0;
    let maximum = false;
    switch (m.type) {
      case "coins": value = run.matchCoins - run.reported.coins; break;
      case "score": value = run.score; maximum = true; break;
      case "powerups": value = run.powerups - run.reported.powerups; break;
      case "survival": value = run.elapsed; maximum = true; break;
      case "combo": value = run.maxCombo; maximum = true; break;
      case "golden": value = run.golden - run.reported.golden; break;
      case "magnet": value = run.magnet - run.reported.magnet; break;
      case "games": value = isFinalReport ? 1 : 0; break;
    }
    const previous = entry.progress;
    entry.progress = Math.min(m.target, maximum ? Math.max(previous, value) : previous + Math.max(0, value));
    if (entry.progress >= m.target && !entry.claimed) {
      if (claimMission(p, m.id, runDay)) completed.push(m.id);
    }
  }
  if (isFinalReport) run.missionFinalized = true;
  run.reported = { coins: run.matchCoins, powerups: run.powerups, golden: run.golden, magnet: run.magnet };
  return completed;
}

export function claimMission(p: PlayerProfile, id: string, day = p.missionDate): boolean {
  if (day !== p.missionDate) return false;
  const m = missionsForProfile(p.dailyMissionIds).find((mission) => mission.id === id);
  const entry = p.missions[id];
  if (!m || !entry || entry.claimed || entry.progress < m.target) return false;
  entry.claimed = true;
  p.totalCoins += m.reward;
  addXP(p, B.xp.perMission);
  p.completedMissions = [...p.completedMissions, `${day}:${id}`].slice(-100);
  return true;
}