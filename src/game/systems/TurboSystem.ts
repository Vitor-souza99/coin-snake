import { turboConfig as T } from "../data/controls";
import type { CoinKind } from "../data/balance";
import { clamp } from "../utils/math";
export class TurboSystem {
  energy: number = T.capacity;
  active = false;
  exhausted = false;
  activations = 0;
  private delay = 0;
  update(dt: number, held: boolean, free = false) {
    const before = this.active;
    if (!held && this.energy >= T.restartEnergy) this.exhausted = false;
    const manual = held && !this.exhausted && this.energy > 0;
    this.active = free || manual;
    if (this.active && !before) this.activations++;
    if (manual && !free) {
      this.energy = Math.max(0, this.energy - T.drain * dt);
      this.delay = T.regenerationDelay;
      if (this.energy === 0) {
        this.exhausted = true;
        this.active = false;
      }
    } else if (!free) {
      this.delay = Math.max(0, this.delay - dt);
      if (this.delay === 0)
        this.energy = clamp(this.energy + T.regeneration * dt, 0, T.capacity);
    }
    return this.active;
  }
  charge(kind: CoinKind["id"]) {
    this.energy = clamp(this.energy + T.coinCharge[kind], 0, T.capacity);
  }
  fill() {
    this.energy = T.capacity;
    this.exhausted = false;
  }
  release() {
    this.active = false;
  }
}
