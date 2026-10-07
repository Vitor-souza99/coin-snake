import { availableWorlds, type WorldDefinition } from "../data/worlds";
export class PortalSystem {
  private lastWorld = "green-valley";
  choose(level: number, current: string): WorldDefinition {
    const candidates = availableWorlds(level).filter((world) => world.id !== current && world.id !== this.lastWorld);
    const pool = candidates.length ? candidates : availableWorlds(level).filter((world) => world.id !== current);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? availableWorlds(level)[0];
    this.lastWorld = next.id;
    return next;
  }
  bossEnergy(coinId: string) { return ({ normal: 1, blue: 5, diamond: 20, golden: 50 } as Record<string, number>)[coinId] ?? 0; }
}