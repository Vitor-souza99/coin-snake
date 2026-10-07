import Phaser from "phaser";
import { skins } from "../data/skins";
import { B } from "../data/balance";
import { powerups } from "../data/powerups";
export function generateTextures(s: Phaser.Scene) {
  const g = s.add.graphics();
  for (const skin of skins) {
    g.clear();
    g.fillStyle(skin.dark).fillCircle(32, 34, 23);
    g.fillStyle(skin.color).fillCircle(32, 30, 22);
    g.fillStyle(0xffffff, 0.24).fillEllipse(25, 23, 18, 10);
    if (skin.id === "robot") {
      g.lineStyle(3, skin.dark).strokeRoundedRect(14, 13, 36, 36, 10);
      g.fillStyle(0xffffff).fillRect(27, 16, 5, 5);
    }
    if (skin.id === "dino" || skin.id === "dragon")
      g.fillStyle(skin.dark).fillTriangle(6, 30, 17, 18, 17, 42);
    g.generateTexture(`${skin.id}-body`, 64, 64);
    g.clear();
    g.fillStyle(skin.dark).fillCircle(32, 34, 26);
    g.fillStyle(skin.color).fillCircle(32, 30, 26);
    if (skin.id === "cat") {
      g.fillStyle(skin.color)
        .fillTriangle(9, 18, 10, 0, 29, 10)
        .fillTriangle(35, 10, 54, 0, 56, 20);
      g.fillStyle(0xec8d91).fillTriangle(14, 14, 14, 5, 24, 12);
    }
    if (skin.id === "robot") {
      g.fillStyle(skin.dark).fillRoundedRect(8, 6, 49, 47, 10);
      g.fillStyle(skin.color).fillRoundedRect(12, 10, 41, 38, 8);
      g.lineStyle(3, skin.dark).lineBetween(30, 7, 30, 0);
    }
    if (skin.id === "dragon") {
      g.fillStyle(0xffe3a5)
        .fillTriangle(10, 20, 5, 0, 28, 10)
        .fillTriangle(10, 40, 5, 63, 29, 50);
    }
    if (skin.id === "dino")
      g.fillStyle(skin.dark).fillTriangle(9, 13, 0, 30, 9, 48);
    g.fillStyle(0xffffff)
      .fillEllipse(39, 18, 16, 20)
      .fillEllipse(39, 41, 16, 20);
    g.fillStyle(0x173a35).fillCircle(43, 19, 5).fillCircle(43, 40, 5);
    g.fillStyle(0xffffff).fillCircle(44, 17, 2).fillCircle(44, 38, 2);
    g.lineStyle(2, skin.dark)
      .beginPath()
      .arc(47, 30, 6, -0.8, 0.8)
      .strokePath();
    if (skin.id === "cat") {
      g.lineStyle(2, skin.dark)
        .lineBetween(47, 25, 62, 19)
        .lineBetween(47, 36, 62, 44);
    }
    g.generateTexture(`${skin.id}-head`, 64, 64);
  }
  for (const coin of B.coins) {
    g.clear();
    g.fillStyle(0x284c32, 0.2).fillCircle(25, 28, 21);
    g.fillStyle(coin.color).fillCircle(25, 24, 21);
    g.lineStyle(3, 0xffffff, 0.65).strokeCircle(25, 24, 16);
    g.fillStyle(0xffffff, 0.6).fillEllipse(18, 15, 10, 5);
    g.generateTexture(`coin-${coin.id}`, 50, 52);
  }
  for (const power of powerups) {
    g.clear();
    g.fillStyle(power.color).fillRoundedRect(2, 2, 52, 52, 17);
    g.lineStyle(3, 0xffffff, 0.85).strokeRoundedRect(6, 6, 44, 44, 13);
    g.generateTexture(`power-${power.id}`, 56, 56);
  }
  g.clear();
  g.fillStyle(0x335c47, 0.2).fillEllipse(40, 57, 74, 28);
  g.fillStyle(0x719083).fillRoundedRect(7, 16, 65, 49, 20);
  g.fillStyle(0xa1b6a3).fillRoundedRect(12, 12, 52, 36, 14);
  g.lineStyle(3, 0xc2d0b6).lineBetween(25, 18, 44, 18);
  g.generateTexture("rock", 80, 80);
  g.clear();
  g.fillStyle(0xffffff).fillCircle(4, 4, 4);
  g.generateTexture("spark", 8, 8);
  g.destroy();
}
export function snakePreview(
  s: Phaser.Scene,
  x: number,
  y: number,
  id: string,
  scale = 1,
) {
  const items: Phaser.GameObjects.Image[] = [];
  for (let i = 5; i >= 1; i--)
    items.push(
      s.add
        .image(
          x - i * 29 * scale,
          y + Math.sin(i * 0.7) * 24 * scale,
          `${id}-body`,
        )
        .setScale(scale),
    );
  items.push(s.add.image(x, y, `${id}-head`).setScale(scale * 1.18));
  return items;
}
