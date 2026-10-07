import Phaser from "phaser";
import { powerups } from "../data/powerups";
import { B } from "../data/balance";
import { weighted } from "../utils/math";
export class PowerUp {
  kind: (typeof powerups)[number];
  life: number = B.power.lifetime;
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  constructor(
    s: Phaser.Scene,
    public x: number,
    public y: number,
    rareLife = false,
  ) {
    const options: readonly (typeof powerups)[number][] = rareLife
      ? powerups.filter((power) => power.id === "life")
      : powerups.filter((power) => power.id !== "life");
    this.kind = weighted(options);
    this.image = s.add.image(x, y, `power-${this.kind.id}`);
    this.label = s.add
      .text(x, y, this.kind.symbol, {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#163f36",
      })
      .setOrigin(0.5);
  }
  destroy() {
    this.image.destroy();
    this.label.destroy();
  }
}
