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
  shieldRemaining = 0;
  private shieldHitsRemaining = 0;
  invincible = 0;
  freezeRemaining = 0;
  freezeCooldown = 0;
  slowed = 0;
  lives: number = B.power.initialLives;
  private phoenixReviveUsed = false;
  constructor(initialLives: number = B.power.initialLives) {
    this.lives = Math.min(B.power.maxLives, Math.max(0, initialLives));
  }
  gainLife(): boolean {
    if (this.lives >= B.power.maxLives) return false;
    this.lives++;
    return true;
  }
  reviveWithLife(): boolean {
    if (this.lives > 0 || this.phoenixReviveUsed) return false;
    this.phoenixReviveUsed = true;
    this.lives = 1;
    return true;
  }
  loseLife(): boolean {
    if (this.lives <= 0) return false;
    this.lives--;
    return true;
  }
  activate(kind: PowerKind, durationBonus = 0, durationOverride?: number, shieldHits = 1) {
    if (kind === "shield") {
      this.shield = true;
      this.shieldRemaining = 0;
      this.shieldHitsRemaining = Math.max(1, Math.floor(shieldHits));
    } else if (kind === "magnet") this.magnet = durationOverride ?? B.power.magnetDuration * (1 + durationBonus);
    else if (kind === "turbo") this.turbo = B.power.turboDuration * (1 + durationBonus);
    else if (kind === "precision") this.precision = B.power.precisionDuration * (1 + durationBonus);
    else if (kind === "lucky-star") this.luckyStar = B.power.luckyStarDuration * (1 + durationBonus);
    else if (kind === "ghost") {
      this.ghost = durationOverride ?? B.power.ghostDuration * (1 + durationBonus);
      this.ghostRemaining = this.ghost;
      this.ghostGrace = 0;
      this.ghostWasActive = true;
    }
  }
  activateTimedShield(duration: number): boolean {
    if (this.shield || duration <= 0) return false;
    this.shield = true;
    this.shieldRemaining = duration;
    this.shieldHitsRemaining = 1;
    return true;
  }
  activateFreeze(duration = 5, cooldown = 20): boolean {
    if (this.freezeRemaining > 0 || this.freezeCooldown > 0 || duration <= 0) return false;
    this.freezeRemaining = duration;
    this.freezeCooldown = cooldown;
    this.invincible = Math.max(this.invincible, duration);
    return true;
  }
  update(dt: number) {
    this.magnet = Math.max(0, this.magnet - dt);
    this.turbo = Math.max(0, this.turbo - dt);
    this.precision = Math.max(0, this.precision - dt);
    this.luckyStar = Math.max(0, this.luckyStar - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    const freezeWasActive = this.freezeRemaining > 0;
    this.freezeRemaining = Math.max(0, this.freezeRemaining - dt);
    if (!freezeWasActive) this.freezeCooldown = Math.max(0, this.freezeCooldown - dt);
    if (this.shield && this.shieldRemaining > 0) {
      this.shieldRemaining = Math.max(0, this.shieldRemaining - dt);
      if (this.shieldRemaining === 0) this.shield = false;
    }
    this.slowed = Math.max(0, this.slowed - dt);
    this.ghostRemaining = Math.max(0, this.ghostRemaining - dt);
    this.ghost = Math.max(0, this.ghostRemaining);
    if (this.ghostWasActive && this.ghostRemaining === 0) {
      this.ghostWasActive = false;
      this.ghostGrace = B.power.ghostClearanceGrace;
    }
  }
  get frozen(): boolean {
    return this.freezeRemaining > 0;
  }
  freezeBlocksDamage(): boolean {
    return this.frozen;
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
    return this.consumeShieldHit();
  }
  applyPoison(duration = B.hazard.poisonDuration) {
    this.slowed = Math.max(this.slowed, duration);
  }
  absorb(): boolean {
    if (this.invincible > 0) return true;
    return this.consumeShieldHit();
  }
  private consumeShieldHit(): boolean {
    if (!this.shield) return false;
    this.shieldHitsRemaining = Math.max(0, this.shieldHitsRemaining - 1);
    if (this.shieldHitsRemaining === 0) {
      this.shield = false;
      this.shieldRemaining = 0;
    }
    this.invincible = B.power.shieldGrace;
    return true;
  }
}
