import Phaser from "phaser";
import { C, text } from "./Theme";
import { audio } from "../services/AudioService";
export function button(
  s: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  action: () => void,
  width = 570,
  fill = C.green,
  ink = "#ffffff",
  height = 86,
) {
  const container = s.add.container(x, y);
  const bg = s.add
    .graphics()
    .fillStyle(fill)
    .fillRoundedRect(-width / 2, -height / 2, width, height, 24);
  const t = text(s, 0, 0, label, 28, ink, true);
  container.add([bg, t]);
  container.setSize(width, height).setInteractive({ useHandCursor: true });
  container.on("pointerover", () => container.setScale(1.015));
  container.on("pointerout", () => container.setScale(1));
  container.on("pointerdown", () => container.setScale(0.97));
  container.on("pointerup", () => {
    container.setScale(1);
    audio.play("click");
    action();
  });
  return container;
}
