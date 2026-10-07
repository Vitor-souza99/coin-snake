import Phaser from "phaser";
import { shrinkConfig } from "../data/controls";
export class ShrinkFruit {
  x = 0;
  y = 0;
  life = 0;
  active = false;
  readonly image: Phaser.GameObjects.Container;
  constructor(s: Phaser.Scene) {
    const g = s.add.graphics();
    g.fillStyle(0x8151bd).fillCircle(-9, 3, 16).fillCircle(10, 3, 16);
    g.fillStyle(0xb287e5).fillCircle(-8, -1, 13).fillCircle(8, -1, 13);
    g.fillStyle(0xd6ef93).fillEllipse(8, -22, 25, 10);
    g.lineStyle(3, 0x658544).lineBetween(0, -12, 1, -24);
    const label = s.add
      .text(0, 2, "−", {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.image = s.add
      .container(0, 0, [g, label])
      .setDepth(8)
      .setVisible(false);
  }
  spawn(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.life = shrinkConfig.lifetime;
    this.active = true;
    this.image.setPosition(x, y).setVisible(true);
  }
  update(dt: number, time: number, reduced = false) {
    if (!this.active) return;
    this.life = Math.max(0, this.life - dt);
    this.image.setScale(reduced ? 1 : 1 + Math.sin(time * 4) * 0.06);
    this.image.setAlpha(this.life < 3 ? 0.5 + Math.sin(time * 12) * 0.3 : 1);
    if (!this.life) this.hide();
  }
  hide() {
    this.active = false;
    this.image.setVisible(false);
  }
}
