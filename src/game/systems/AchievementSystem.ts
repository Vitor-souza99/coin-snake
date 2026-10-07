import type { PlayerProfile } from "../types/game";
export const achievementDefinitions = [
  { id: "first-run", title: "Primeira volta", description: "Finalize uma partida." },
  { id: "coin-hunter", title: "Caçador de moedas", description: "Colete 100 moedas em uma partida." },
  { id: "combo-master", title: "Mestre do combo", description: "Alcance combo x5." },
  { id: "boss-hunter", title: "Caçador de bosses", description: "Derrote um boss." },
  { id: "pet-collector", title: "Colecionador", description: "Desbloqueie um pet." },
  { id: "world-traveler", title: "Viajante", description: "Use um portal de mundo." },
] as const;
export function awardAchievement(profile: PlayerProfile, id: string) {
  if (!achievementDefinitions.some((entry) => entry.id === id) || profile.achievements.includes(id)) return false;
  profile.achievements.push(id);
  return true;
}