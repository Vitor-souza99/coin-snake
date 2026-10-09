import { B } from "../data/balance";
import type { PowerKind } from "../data/powerups";
export class PowerUpSystem {
  magnet = 0;
  turbo = 0;
  precision = 0;
  luckyStar = 0;
  ghost = 0;
  ghostGrace = 0;
  private ghostWasActive = false;
  private ghostRemaining = 0;
  shield = false;
  invincible = 0;
  slowed = 0;
  lives: number = B.power.initialLives;
  constructor(initialLives: number = B.power.initialLives) {
    this.lives = Math.min(B.power.maxLives, Math.max(0, initialLives));
  }
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
  activate(kind: PowerKind, durationBonus = 0) {
    if (kind === "shield") {
      this.shield = true;
    } else if (kind === "magnet") this.magnet = B.power.magnetDuration * (1 + durationBonus);
    else if (kind === "turbo") this.turbo = B.power.turboDuration * (1 + durationBonus);
    else if (kind === "precision") this.precision = B.power.precisionDuration * (1 + durationBonus);
    else if (kind === "lucky-star") this.luckyStar = B.power.luckyStarDuration * (1 + durationBonus);
    else if (kind === "ghost") {
      this.ghost = B.power.ghostDuration * (1 + durationBonus);
      this.ghostRemaining = this.ghost;
      this.ghostGrace = 0;
      this.ghostWasActive = true;
    }
  }
  update(dt: number) {
    this.magnet = Math.max(0, this.magnet - dt);
    this.turbo = Math.max(0, this.turbo - dt);
    this.precision = Math.max(0, this.precision - dt);
    this.luckyStar = Math.max(0, this.luckyStar - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.slowed = Math.max(0, this.slowed - dt);
    this.ghostRemaining = Math.max(0, this.ghostRemaining - dt);
    this.ghost = Math.max(0, this.ghostRemaining);
    if (this.ghostWasActive && this.ghostRemaining === 0) {
      this.ghostWasActive = false;
      this.ghostGrace = B.power.ghostClearanceGrace;
    }
  }
  updateGhost(dt: number, overlapping: boolean): boolean {
    if (this.ghost > 0) return true;
    if (this.ghostGrace <= 0) return false;
    if (!overlapping) {
      this.ghostGrace = 0;
      return false;
    }
    this.ghostGrace = Math.max(0, this.ghostGrace - dt);
    return this.ghostGrace > 0;
  }
  get ghostActive(): boolean {
    return this.ghost > 0;
  }
  blocksAttack(): boolean {
    if (this.ghostActive) return true;
    if (this.invincible > 0) return true;
    if (!this.shield) return false;
    this.shield = false;
    this.invincible = B.power.shieldGrace;
    return true;
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
