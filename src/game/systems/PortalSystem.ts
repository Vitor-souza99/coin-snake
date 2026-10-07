import type { WorldDefinition, WorldPlayerState } from "../data/worlds";
import { eligiblePortalWorlds, weightedWorldChoice } from "./WorldSystem";
export class PortalSystem {
  private lastWorld = "green-valley";
  choose(state: WorldPlayerState, current: string, random = Math.random): WorldDefinition | undefined {
    const next = weightedWorldChoice(eligiblePortalWorlds(state, current), this.lastWorld, random);
    if (next) this.lastWorld = next.id;
    return next;
  }
  bossEnergy(coinId: string) { return ({ normal: 1, blue: 5, diamond: 20, golden: 50, mythic: 100 } as Record<string, number>)[coinId] ?? 0; }
}