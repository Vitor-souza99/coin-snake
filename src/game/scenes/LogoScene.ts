import Phaser from "phaser";
import { save } from "../systems/SaveSystem";

/** Brief, skippable brand reveal; never waits on optional image assets. */
export class LogoScene extends Phaser.Scene {
  private completing = false;

  constructor() {
    super("Logo");
  }

  create() {
    const { width, height } = this.scale;
    const reducedMotion = save.profile.settings.reducedMotion;
    this.cameras.main.setBackgroundColor("#153f36");

    const hasLogo = this.textures.exists("brand-symbol");
    const logo = hasLogo
      ? this.add
          .image(width / 2, height * 0.43, "brand-symbol")
          .setDisplaySize(Math.min(width * 0.52, 260), Math.min(width * 0.52, 260))
          .setAlpha(0)
          .setScale(0.72)
      : this.add
          .text(width / 2, height * 0.43, "◉", { fontSize: "150px", color: "#ffd96b" })
          .setOrigin(0.5)
          .setAlpha(0)
          .setScale(0.72);
    const title = this.add
      .text(width / 2, height * 0.7, "COIN SNAKE", {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.max(28, Math.min(48, width * 0.1))}px`,
        fontStyle: "bold",
        color: "#fffdf0",
        stroke: "#174a3a",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const finish = () => this.finish();
    let skipEnabled = false;
    const requestSkip = () => {
      if (skipEnabled) finish();
    };
    this.input.on("pointerdown", requestSkip);
    this.input.keyboard?.on("keydown", requestSkip);
    this.time.delayedCall(400, () => {
      skipEnabled = true;
    });

    if (reducedMotion) {
      this.tweens.add({ targets: [logo, title], alpha: 1, duration: 180 });
      this.time.delayedCall(360, finish);
      return;
    }

    this.tweens.add({
      targets: logo,
      alpha: 1,
      scale: 1,
      duration: 340,
      ease: "Back.Out",
      onComplete: () => {
        if (this.completing) return;
        this.tweens.add({
          targets: logo,
          angle: reducedMotion ? 0 : 360,
          duration: reducedMotion ? 0 : 520,
          ease: "Sine.InOut",
          onComplete: () => {
            if (!this.completing) this.tweens.add({ targets: title, alpha: 1, y: height * 0.67, duration: 220 });
          },
        });
      },
    });
    this.time.delayedCall(1560, finish);
  }

  private finish() {
    if (this.completing || !this.scene.isActive()) return;
    this.completing = true;
    this.input.off("pointerdown");
    this.input.keyboard?.removeAllListeners();
    this.input.enabled = false;
    this.tweens.killAll();
    this.cameras.main.fadeOut(150, 21, 63, 54);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.scene.isActive()) this.scene.start("Menu");
    });
  }
}