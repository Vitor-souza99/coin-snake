import Phaser from "phaser";
import { B } from "../data/balance";
export class Obstacle {
  warning: number;
  constructor(
    public x: number,
    public y: number,
    public image: Phaser.GameObjects.Image,
    initial = false,
  ) {
    this.warning = initial ? 0 : B.difficulty.warningSeconds;
    image.setAlpha(initial ? 1 : 0.35);
  }
  update(dt: number) {
    this.warning = Math.max(0, this.warning - dt);
    this.image.setAlpha(
      this.warning > 0 ? 0.35 + Math.sin(this.warning * 12) * 0.15 : 1,
    );
  }
  destroy() {
    this.image.destroy();
  }
}
