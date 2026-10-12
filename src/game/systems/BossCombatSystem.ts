export interface AttackAuraOptions {
  maxHits: number;
  source: string;
  bossId: string;
}

/** Resolves Candy's response to aura activation without preserving a pending attack. */
export function activateCandyAura(combat: BossCombatSystem, bossId: string): boolean {
  if (!combat.activateAttackAura({ maxHits: 1, source: "candy-aura", bossId })) return false;
  return true;
}

/** Starts the guaranteed flee window only after an aura hit was consumed. */
export function resolveCandyAuraHit(combat: BossCombatSystem, bossId: string): boolean {
  return combat.active && combat.source === "candy-aura" && combat.consumeHit(bossId);
}

/** Combat-only charge and damage aura; deliberately independent from Boss Energy. */
export class BossCombatSystem {
  attackCharge = 0;
  active = false;
  remainingHits = 0;
  source = "";
  bossId = "";
  hitInvulnerability = 0;

  addCharge(amount: number) {
    this.attackCharge = Math.min(100, Math.max(0, this.attackCharge + amount));
    return this.attackCharge;
  }

  activateAttackAura(options: AttackAuraOptions): boolean {
    if (this.attackCharge < 100 || options.maxHits <= 0) return false;
    this.attackCharge = 0;
    this.active = true;
    this.remainingHits = options.maxHits;
    this.source = options.source;
    this.bossId = options.bossId;
    return true;
  }

  update(dt: number) {
    this.hitInvulnerability = Math.max(0, this.hitInvulnerability - dt);
  }

  consumeHit(bossId: string): boolean {
    if (!this.active || this.bossId !== bossId || this.remainingHits <= 0 || this.hitInvulnerability > 0) return false;
    this.remainingHits--;
    this.hitInvulnerability = 0.8;
    if (this.remainingHits === 0) this.clearAura();
    return true;
  }

  consumeProtectionHit(bossId: string): boolean {
    if (!this.active || this.bossId !== bossId || this.remainingHits <= 0) return false;
    this.remainingHits--;
    if (this.remainingHits === 0) this.clearAura();
    return true;
  }

  clearAura() {
    this.active = false;
    this.remainingHits = 0;
    this.source = "";
    this.bossId = "";
  }

  reset() {
    this.attackCharge = 0;
    this.hitInvulnerability = 0;
    this.clearAura();
  }
}