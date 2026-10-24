export type MissionType =
  | "coins"
  | "score"
  | "powerups"
  | "survival"
  | "combo"
  | "golden"
  | "magnet"
  | "games"
  | "turbo"
  | "shrink"
  | "portals"
  | "bosses";

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
  { id: "coin-trail", title: "Trilha de moedas", description: "Junte 50 moedas virtuais.", target: 50, reward: 75, type: "coins", difficulty: "easy" },
  { id: "power-up-starter", title: "Caixa de surpresas", description: "Pegue 2 power-ups hoje.", target: 2, reward: 75, type: "powerups", difficulty: "easy" },
  { id: "short-survivor", title: "Primeiros passos", description: "Sobreviva por 45 segundos em uma partida.", target: 45, reward: 75, type: "survival", difficulty: "easy" },
  { id: "one-more-coin", title: "Mais uma moeda", description: "Colete 1 moeda dourada.", target: 1, reward: 75, type: "golden", difficulty: "easy" },
  { id: "turbo-tap", title: "Toque de Turbo", description: "Ative o Turbo 1 vez hoje.", target: 1, reward: 75, type: "turbo", difficulty: "easy" },
  { id: "fresh-start", title: "Recomeço", description: "Finalize 1 partida hoje.", target: 1, reward: 75, type: "games", difficulty: "easy" },
  { id: "shrink-once", title: "Menos é mais", description: "Colete 1 fruta de encolhimento hoje.", target: 1, reward: 75, type: "shrink", difficulty: "easy" },
  { id: "first-portal", title: "Nova paisagem", description: "Atravesse 1 portal hoje.", target: 1, reward: 100, type: "portals", difficulty: "easy" },
  { id: "coin-pouch", title: "Bolsa cheia", description: "Junte 150 moedas virtuais.", target: 150, reward: 150, type: "coins", difficulty: "medium" },
  { id: "power-up-collector", title: "Colecionador de poderes", description: "Pegue 5 power-ups hoje.", target: 5, reward: 150, type: "powerups", difficulty: "medium" },
  { id: "long-survivor", title: "Fôlego de aço", description: "Sobreviva por 150 segundos em uma partida.", target: 150, reward: 175, type: "survival", difficulty: "medium" },
  { id: "golden-pair", title: "Duas vezes brilhante", description: "Colete 2 moedas douradas hoje.", target: 2, reward: 150, type: "golden", difficulty: "medium" },
  { id: "turbo-driver", title: "Piloto de Turbo", description: "Ative o Turbo 3 vezes hoje.", target: 3, reward: 150, type: "turbo", difficulty: "medium" },
  { id: "shrink-pair", title: "Forma compacta", description: "Colete 2 frutas de encolhimento hoje.", target: 2, reward: 150, type: "shrink", difficulty: "medium" },
  { id: "portal-hopper", title: "Saltador de mundos", description: "Atravesse 2 portais hoje.", target: 2, reward: 175, type: "portals", difficulty: "medium" },
  { id: "boss-hunter", title: "Caçador de chefes", description: "Derrote 1 chefe hoje.", target: 1, reward: 200, type: "bosses", difficulty: "medium" },
  { id: "coin-typhoon", title: "Chuva de moedas", description: "Junte 300 moedas virtuais.", target: 300, reward: 250, type: "coins", difficulty: "challenge" },
  { id: "power-up-pro", title: "Mestre dos poderes", description: "Pegue 8 power-ups hoje.", target: 8, reward: 250, type: "powerups", difficulty: "challenge" },
  { id: "marathon-run", title: "Maratona", description: "Sobreviva por 240 segundos em uma partida.", target: 240, reward: 275, type: "survival", difficulty: "challenge" },
  { id: "golden-trio", title: "Trio dourado", description: "Colete 3 moedas douradas hoje.", target: 3, reward: 250, type: "golden", difficulty: "challenge" },
  { id: "combo-legend", title: "Lenda do combo", description: "Alcance um combo x12 em uma partida.", target: 12, reward: 250, type: "combo", difficulty: "challenge" },
  { id: "turbo-master", title: "Turbo sem freio", description: "Ative o Turbo 5 vezes hoje.", target: 5, reward: 250, type: "turbo", difficulty: "challenge" },
  { id: "shrink-trio", title: "Especialista em encolher", description: "Colete 3 frutas de encolhimento hoje.", target: 3, reward: 250, type: "shrink", difficulty: "challenge" },
  { id: "world-tour", title: "Volta ao mundo", description: "Atravesse 3 portais hoje.", target: 3, reward: 275, type: "portals", difficulty: "challenge" },
  { id: "boss-duel", title: "Duelo de campeões", description: "Derrote 2 chefes hoje.", target: 2, reward: 300, type: "bosses", difficulty: "challenge" },
  { id: "magnet-master", title: "Ímã lendário", description: "Colete 5 moedas com o poder Magnetismo hoje.", target: 5, reward: 250, type: "magnet", difficulty: "challenge" },
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
export function dailyMissions(day: string, previousIds: string[] = [], previousDay = ""): Mission[] {
  if (!day || day === "1970-01-01") return ["collector", "scorer", "explorer"].map((id) => missions.find((mission) => mission.id === id)!);
  let seed = hashDay(day);
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  const selected: Mission[] = [];
  for (const difficulty of ["easy", "medium", "challenge"] as const) {
    const candidates = missions.filter((mission) => mission.difficulty === difficulty);
    const pool = previousDay && previousDay !== day && candidates.some((mission) => !previousIds.includes(mission.id))
      ? candidates.filter((mission) => !previousIds.includes(mission.id))
      : candidates;
    selected.push(pool[Math.floor(next() * pool.length)]);
  }
  return selected;
}

export function missionsForProfile(ids: string[]): Mission[] {
  const byId = new Map(missions.map((mission) => [mission.id, mission]));
  return ids.flatMap((id) => {
    const mission = byId.get(id);
    return mission ? [mission] : [];
  }).slice(0, DAILY_MISSION_COUNT);
}