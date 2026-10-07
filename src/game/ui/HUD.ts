import Phaser from "phaser";
import { text, C } from "./Theme";
import type { RunState } from "../types/game";
import type { ComboSystem } from "../systems/ComboSystem";
import type { PowerUpSystem } from "../systems/PowerUpSystem";
export class HUD {
  private score: Phaser.GameObjects.Text;
  private coins: Phaser.GameObjects.Text;
  private combo: Phaser.GameObjects.Text;
  private power: Phaser.GameObjects.Text;
  constructor(s: Phaser.Scene) {
    text(s, 43, 48, "PONTOS", 18, C.muted, true).setOrigin(0, 0.5);
    this.score = text(s, 42, 86, "0", 40, C.ink, true).setOrigin(0, 0.5);
    this.coins = text(s, 360, 77, "0 moedas", 28, C.ink, true);
    this.combo = text(s, 360, 139, "COMBO x1", 22, C.ink, true);
    this.power = text(s, 360, 1171, "", 21, C.ink, true);
  }
  update(run: RunState, c: ComboSystem, p: PowerUpSystem) {
    this.score.setText(String(run.score));
    this.coins.setText(`${run.matchCoins} moedas`);
    this.combo.setText(`COMBO x${c.value}   ${"●".repeat(c.value)}`);
    this.combo.setColor(c.value >= 4 ? "#bf6b22" : C.ink);
    const powers = [];
    if (p.magnet > 0) powers.push(`ÍMÃ ${Math.ceil(p.magnet)}s`);
    if (p.shield) powers.push("ESCUDO");
    if (p.turbo > 0) powers.push(`TURBO ${Math.ceil(p.turbo)}s`);
    if (p.invincible > 0) powers.push("PROTEGIDO");
    this.power.setText(powers.join("  •  "));
  }
}
