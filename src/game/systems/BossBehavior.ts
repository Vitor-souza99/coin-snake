import type { BossDefinition } from "../data/bosses";

/** Shared contract for boss-specific state machines. */
export interface BossBehavior {
  readonly definition: BossDefinition;
  start(): void;
  update(dt: number): void;
  enterPhase(phase: number): void;
  onPlayerHit(): void;
  onBossDamaged(): void;
  destroy(): void;
}