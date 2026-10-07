import { BossCombatSystem } from "./BossCombatSystem";

/** Shared transient fight state. Boss behavior and Phaser presentation stay in GameScene. */
export class BossFightSystem {
  readonly combat = new BossCombatSystem();
  active = false;
  defeated = false;

  start() {
    this.combat.reset();
    this.active = true;
    this.defeated = false;
  }

  update(dt: number) {
    if (this.active && !this.defeated) this.combat.update(dt);
  }

  finish() {
    this.active = false;
    this.defeated = true;
    this.combat.reset();
  }

  destroy() {
    this.active = false;
    this.combat.reset();
  }
}