import type { RunState } from "../types/game";
import type { ComboSystem } from "../systems/ComboSystem";
import type { PowerUpSystem } from "../systems/PowerUpSystem";
import type { TurboSystem } from "../systems/TurboSystem";
import { ScreenUI } from "./ScreenUI";
export class GameplayHUD {
  private score: HTMLElement;
  private coins: HTMLElement;
  private combo: HTMLElement;
  private lives: HTMLElement;
  private effects: HTMLElement;
  private bar: HTMLElement;
  private value: HTMLElement;
  private button: HTMLElement;
  constructor(ui: ScreenUI) {
    this.score = ui.get("#score");
    this.coins = ui.get("#coins");
    this.combo = ui.get("#combo");
    this.lives = ui.get("#lives");
    this.effects = ui.get("#effects");
    this.bar = ui.get("#turbo-bar");
    this.value = ui.get("#turbo-value");
    this.button = ui.get("#turbo");
  }
  update(r: RunState, c: ComboSystem, p: PowerUpSystem, t: TurboSystem) {
    const set = (e: HTMLElement, value: string) => {
      if (e.textContent !== value) e.textContent = value;
    };
    set(this.score, String(r.score));
    set(this.coins, String(r.matchCoins));
    set(this.combo, `×${c.value}`);
    set(this.lives, `♥ ${p.lives}`);
    const powers = [];
    if (p.magnet > 0) powers.push(`ÍMÃ ${Math.ceil(p.magnet)}s`);
    if (p.shield) powers.push("ESCUDO");
    if (p.turbo > 0) powers.push(`TURBO ×2 ${Math.ceil(p.turbo)}s`);
    if (p.invincible > 0) powers.push("PROTEGIDO");
    if (p.slowed > 0) powers.push(`VENENO ${Math.ceil(p.slowed)}s`);
    set(
      this.effects,
      powers.length
        ? powers.join(" · ")
        : "Colete moedas. Evite pedras e o corpo.",
    );
    this.bar.style.width = `${t.energy}%`;
    set(
      this.value,
      t.exhausted ? "Solte para recarregar" : `${Math.ceil(t.energy)} / 100`,
    );
    this.button.classList.toggle("active", t.active);
    this.button.setAttribute("aria-pressed", String(t.active));
  }
}
