export type MissionType =
  | "coins"
  | "score"
  | "powerups"
  | "survival"
  | "combo"
  | "golden"
  | "magnet"
  | "games";

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  type: MissionType;
  difficulty: "easy" | "medium" | "challenge";
}

export const missions: Mission[] = [
  { id: "collector", title: "Caça ao tesouro", description: "Junte 100 moedas virtuais.", target: 100, reward: 100, type: "coins", difficulty: "easy" },
  { id: "scorer", title: "Uma grande volta", description: "Faça 2.000 pontos em uma partida.", target: 2000, reward: 150, type: "score", difficulty: "challenge" },
  { id: "explorer", title: "Poder da natureza", description: "Pegue 3 power-ups.", target: 3, reward: 100, type: "powerups", difficulty: "medium" },
  { id: "survivor", title: "Persistência", description: "Sobreviva por 90 segundos em uma partida.", target: 90, reward: 125, type: "survival", difficulty: "medium" },
  { id: "combo-master", title: "Ritmo perfeito", description: "Alcance um combo x8 em uma partida.", target: 8, reward: 150, type: "combo", difficulty: "challenge" },
  { id: "gold-rush", title: "Brilho dourado", description: "Colete 2 moedas douradas.", target: 2, reward: 125, type: "golden", difficulty: "medium" },
  { id: "magnet-fan", title: "Ímã de moedas", description: "Colete 2 moedas com o poder Magnetismo.", target: 2, reward: 125, type: "magnet", difficulty: "medium" },
  { id: "daily-player", title: "Mais uma partida", description: "Finalize 2 partidas hoje.", target: 2, reward: 100, type: "games", difficulty: "easy" },
  { id: "run-finisher", title: "Sempre em frente", description: "Finalize 3 partidas hoje.", target: 3, reward: 125, type: "games", difficulty: "easy" },
];

export const DAILY_MISSION_COUNT = 3;

function hashDay(day: string): number {
  let hash = 2166136261;
  for (let index = 0; index < day.length; index++) {
    hash ^= day.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Stable daily selection: one easy, one medium, and one challenge mission. */
export function dailyMissions(day: string): Mission[] {
  let seed = hashDay(day);
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  return (["easy", "medium", "challenge"] as const).map((difficulty) => {
    const candidates = missions.filter((mission) => mission.difficulty === difficulty);
    return candidates[Math.floor(next() * candidates.length)];
  });
}

export function missionsForProfile(ids: string[]): Mission[] {
  const byId = new Map(missions.map((mission) => [mission.id, mission]));
  return ids.flatMap((id) => {
    const mission = byId.get(id);
    return mission ? [mission] : [];
  }).slice(0, DAILY_MISSION_COUNT);
}