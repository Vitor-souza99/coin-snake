import { canonicalWorldId, isWorldUnlocked, worlds, worldById, worldRequirements, worldRequirementLabel, type WorldDefinition, type WorldPlayerState } from "../data/worlds";
import { save } from "./SaveSystem";

export type WorldCardStatus = "AVAILABLE" | "SELECTED" | "LOCKED" | "PREMIUM_LOCKED" | "COMING_SOON";
export function worldStatus(world: WorldDefinition, state: WorldPlayerState, selectedWorld = "green-valley"): WorldCardStatus {
  if (world.unlockType === "PREMIUM") return "PREMIUM_LOCKED";
  if (!isWorldUnlocked(world, state)) return "LOCKED";
  if (!world.isImplemented) return "COMING_SOON";
  return canonicalWorldId(selectedWorld) === world.id ? "SELECTED" : "AVAILABLE";
}
export function worldRequirementText(world: WorldDefinition, state: WorldPlayerState) {
  if (world.unlockType === "STARTER") return "Sempre disponível";
  if (world.unlockType === "PREMIUM") return "Premium · Coming Soon";
  const requirements = worldRequirements(world, state);
  return [
    world.requiredLevel ? `${requirements.levelMet ? "✓" : "✗"} Nível ${world.requiredLevel}` : "",
    world.requiredBossId ? `${requirements.bossMet ? "✓" : "✗"} Derrote ${worldRequirementLabel(world.requiredBossId)}` : "",
    world.prerequisiteWorldId ? `${requirements.worldMet ? "✓" : "✗"} Visite ${worldById(world.prerequisiteWorldId).name}` : "",
  ].filter(Boolean).join(" · ") || "Desbloqueado";
}
export function reconcileWorldUnlocks(state: WorldPlayerState) {
  const newlyUnlocked: WorldDefinition[] = [];
  if (!state.worldsUnlocked.includes("green-valley")) state.worldsUnlocked.push("green-valley");
  for (const world of worlds) {
    if (world.category === "SECRET") {
      if (world.id === "silent-abyss" && state.bossesDefeated.includes("kraken") && state.worldsUnlocked.includes("ocean") && !state.worldsUnlocked.includes(world.id)) {
        state.worldsUnlocked.push(world.id);
        newlyUnlocked.push(world);
      }
      if (world.id === "spider-lair" && state.bossesDefeated.includes("scorpion-king") && !state.worldsUnlocked.includes(world.id)) {
        state.worldsUnlocked.push(world.id);
        newlyUnlocked.push(world);
      }
      if (world.id === "clover-garden") continue;
      continue;
    }
    if (world.unlockType === "PREMIUM" || !worldRequirements(world, state).unlocked) continue;
    if (!state.worldsUnlocked.includes(world.id)) {
      state.worldsUnlocked.push(world.id);
      newlyUnlocked.push(world);
    }
  }
  return newlyUnlocked;
}
export function eligiblePortalWorlds(state: WorldPlayerState, current: string) {
  return worlds.filter((world) => world.category !== "SECRET" && world.id !== "green-valley" && world.id !== canonicalWorldId(current) && world.isImplemented && world.unlockType !== "PREMIUM" && isWorldUnlocked(world, state) && world.portalWeight > 0);
}
export function traversableWorlds(state: WorldPlayerState, current: string) {
  const currentId = canonicalWorldId(current);
  if (currentId === "silent-abyss") {
    return worlds.filter((world) => world.id === "ocean" && world.isImplemented && isWorldUnlocked(world, state));
  }
  return worlds.filter((world) => world.id !== currentId && world.id !== "clover-garden" && world.isImplemented && world.unlockType !== "PREMIUM" && (world.category !== "SECRET" || world.id === "silent-abyss" && currentId === world.id && state.worldsUnlocked.includes(world.id)) && isWorldUnlocked(world, state));
}
export function weightedWorldChoice(candidates: WorldDefinition[], lastWorld = "", random = Math.random): WorldDefinition | undefined {
  const pool = candidates.filter((world) => world.id !== canonicalWorldId(lastWorld));
  const choices = pool.length ? pool : candidates;
  const total = choices.reduce((sum, world) => sum + Math.max(0, world.portalWeight), 0);
  if (total <= 0) return undefined;
  let ticket = random() * total;
  for (const world of choices) {
    ticket -= Math.max(0, world.portalWeight);
    if (ticket < 0) return world;
  }
  return choices[choices.length - 1];
}
export function unlockWorld(worldId: string) {
  const world = worldById(worldId), state = save.profile;
  if (world.category === "SECRET" || world.unlockType === "PREMIUM" || !world.isImplemented || !worldRequirements(world, state).unlocked) return false;
  if (!state.worldsUnlocked.includes(world.id)) state.worldsUnlocked.push(world.id);
  void save.save();
  return true;
}
export function selectWorld(worldId: string) {
  const world = worldById(worldId);
  if (!world.isImplemented || !isWorldUnlocked(world, save.profile)) return false;
  rememberWorld(save.profile, world.id);
  void save.save();
  return true;
}
export function rememberWorld(state: WorldPlayerState & { selectedWorld: string }, worldId: string) {
  const world = worldById(worldId);
  if (!world.isImplemented || !isWorldUnlocked(world, state)) return false;
  state.selectedWorld = world.id;
  return true;
}
