import { DAILY_MISSION_COUNT, dailyMissions, missions, missionsForProfile } from "../data/missions";
import { B } from "../data/balance";
import { localDay } from "../utils/math";
import type { PlayerProfile, RunState } from "../types/game";
import { addXP } from "./EconomySystem";

export function ensureDay(p: PlayerProfile, today = localDay()) {
  if (p.missionDate !== today) {
    preserveUnclaimedCompletions(p);
    p.missionDate = today;
    p.dailyMissionDate = today;
    p.dailyMissionIds = selectDailyMissions(p, today);
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    return;
  }
  if (p.dailyMissionDate !== today) {
    p.dailyMissionDate = today;
    p.dailyMissionIds = selectDailyMissions(p, today);
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    return;
  }
  const selected = missionsForProfile(p.dailyMissionIds ?? []);
  if (selected.length !== DAILY_MISSION_COUNT) {
    p.dailyMissionDate = today;
    p.dailyMissionIds = selectDailyMissions(p, today);
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
  }
  for (const mission of selected) p.missions[mission.id] ??= { progress: 0, claimed: false };
}

function preserveUnclaimedCompletions(p: PlayerProfile) {
  for (const id of p.dailyMissionIds ?? []) {
    const entry = p.missions[id];
    const mission = missionById(id);
      if (mission && entry && !entry.claimed && entry.progress >= mission.target && p.missionDate && !p.completedMissions.includes(`${p.missionDate}:${id}`)) {
      const token = `${p.missionDate}:${id}`;
      if (!p.pendingMissionRewards.includes(token)) p.pendingMissionRewards.push(token);
    }
  }
}

function selectDailyMissions(p: PlayerProfile, today: string) {
  const selected = dailyMissions(today, p.dailyMissionIds, p.dailyMissionDate);
  return selected.map((mission) => mission.id);
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
    if (!entry || entry.claimed || entry.progress >= m.target) continue;
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
      case "turbo": value = run.turboUses - run.reported.turboUses; break;
      case "shrink": value = run.shrinkFruits - run.reported.shrinkFruits; break;
      case "portals": value = run.portalsUsed - run.reported.portalsUsed; break;
      case "bosses": value = run.bossDefeats - run.reported.bossDefeats; break;
    }
    const previous = entry.progress;
    entry.progress = Math.min(m.target, maximum ? Math.max(previous, value) : previous + Math.max(0, value));
    if (entry.progress >= m.target && !entry.claimed) {
      const token = `${runDay}:${m.id}`;
      if (!p.pendingMissionRewards.includes(token)) p.pendingMissionRewards.push(token);
      if (previous < m.target) completed.push(m.id);
    }
  }
  if (isFinalReport) run.missionFinalized = true;
  run.reported = { coins: run.matchCoins, powerups: run.powerups, golden: run.golden, magnet: run.magnet, turboUses: run.turboUses, shrinkFruits: run.shrinkFruits, portalsUsed: run.portalsUsed, bossDefeats: run.bossDefeats };
  return completed;
}

export function claimMission(p: PlayerProfile, id: string, day = p.missionDate): boolean {
  const token = `${day}:${id}`;
  if (!p.pendingMissionRewards.includes(token)) return false;
  const m = missionById(id);
  if (!m) return false;
  const entry = day === p.missionDate ? p.missions[id] : undefined;
  if (p.completedMissions.includes(token)) return false;
  if (entry) entry.claimed = true;
  p.pendingMissionRewards = p.pendingMissionRewards.filter((pending) => pending !== token);
  p.totalCoins += m.reward;
  addXP(p, B.xp.perMission);
  p.completedMissions = [...p.completedMissions, `${day}:${id}`].slice(-100);
  return true;
}