import { B } from "../data/balance";
import type { PowerKind } from "../data/powerups";
export class PowerUpSystem {
  magnet = 0;
  turbo = 0;
  shield = false;
  invincible = 0;
  slowed = 0;
  lives = B.power.initialLives;
  gainLife(): boolean {
    if (this.lives >= B.power.maxLives) return false;
    this.lives++;
    return true;
  }
  loseLife(): boolean {
    if (this.lives <= 0) return false;
    this.lives--;
    return true;
  }
  activate(kind: PowerKind) {
    if (kind === "shield") this.shield = true;
    else if (kind === "magnet") this.magnet = B.power.magnetDuration;
    else this.turbo = B.power.turboDuration;
  }
  update(dt: number) {
    this.magnet = Math.max(0, this.magnet - dt);
    this.turbo = Math.max(0, this.turbo - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.slowed = Math.max(0, this.slowed - dt);
  }
  applyPoison(duration = B.hazard.poisonDuration) {
    this.slowed = Math.max(this.slowed, duration);
  }
  absorb(): boolean {
    if (this.invincible > 0) return true;
    if (!this.shield) return false;
    this.shield = false;
    this.invincible = B.power.shieldGrace;
    return true;
  }
}
