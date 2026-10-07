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
}
export const missions: Mission[] = [
  {
    id: "collector",
    title: "Caça ao tesouro",
    description: "Junte 100 moedas virtuais.",
    target: 100,
    reward: 100,
    type: "coins",
  },
  {
    id: "scorer",
    title: "Uma grande volta",
    description: "Faça 2.000 pontos em uma partida.",
    target: 2000,
    reward: 150,
    type: "score",
  },
  {
    id: "explorer",
    title: "Poder da natureza",
    description: "Pegue 3 power-ups.",
    target: 3,
    reward: 100,
    type: "powerups",
  },
];
