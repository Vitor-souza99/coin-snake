import Phaser from "phaser";
import { skins } from "../data/skins";
import { B } from "../data/balance";
import { powerups } from "../data/powerups";
export function generateTextures(s: Phaser.Scene) {
  const g = s.add.graphics();
  for (const skin of skins) {
    const pattern = skin.bodyConfig.pattern;
    g.clear();
    g.fillStyle(skin.dark).fillCircle(32, 34, 23);
    g.fillStyle(skin.color).fillCircle(32, 30, 22);
    g.fillStyle(0xffffff, 0.24).fillEllipse(25, 23, 18, 10);
    if (pattern === "plates") {
      g.lineStyle(3, skin.bodyConfig.accent, 0.75).strokeRoundedRect(12, 12, 40, 38, 12);
    } else if (pattern === "spots" || pattern === "stars") {
      g.fillStyle(skin.bodyConfig.accent, 0.85).fillCircle(20, 22, 5).fillCircle(42, 39, 5);
      if (pattern === "stars") g.fillStyle(0xffffff).fillCircle(40, 18, 2);
    } else if (pattern === "stripes" || pattern === "waves" || pattern === "scales") {
      g.lineStyle(4, skin.bodyConfig.accent, 0.72)
        .lineBetween(14, 21, 49, 21)
        .lineBetween(14, 39, 49, 39);
    }
    if (skin.id === "robot") {
      g.lineStyle(3, skin.dark).strokeRoundedRect(14, 13, 36, 36, 10);
      g.fillStyle(0xffffff).fillRect(27, 16, 5, 5);
    }
    if (skin.id === "dino" || skin.id === "dragon")
      g.fillStyle(skin.dark).fillTriangle(6, 30, 17, 18, 17, 42);
    if (skin.id === "sakura") {
      g.fillStyle(skin.bodyConfig.accent).fillCircle(19, 19, 4).fillCircle(43, 39, 4);
      g.fillStyle(0xfff4fa).fillCircle(20, 18, 2).fillCircle(44, 38, 2);
    }
    if (skin.id === "storm") {
      g.lineStyle(3, skin.bodyConfig.accent).lineBetween(17, 14, 39, 27).lineBetween(39, 27, 25, 33).lineBetween(25, 33, 46, 48);
    }
    if (skin.id === "magma") {
      g.lineStyle(4, skin.bodyConfig.accent).lineBetween(16, 18, 25, 25).lineBetween(25, 25, 20, 34).lineBetween(38, 14, 34, 25).lineBetween(34, 25, 47, 37);
    }
    if (skin.id === "prism") {
      g.fillStyle(0xff9de2).fillTriangle(32, 14, 39, 24, 25, 24);
      g.fillStyle(0x9c8bff).fillTriangle(32, 27, 41, 38, 23, 38);
    }
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
    if (skin.id === "sakura") g.fillStyle(skin.bodyConfig.accent).fillCircle(19, 19, 4).fillCircle(48, 41, 4);
    if (skin.id === "storm") g.lineStyle(4, skin.bodyConfig.accent).lineBetween(13, 20, 28, 28).lineBetween(28, 28, 21, 38).lineBetween(39, 14, 50, 23);
    if (skin.id === "magma") g.lineStyle(4, skin.bodyConfig.accent).lineBetween(14, 17, 24, 25).lineBetween(24, 25, 20, 37).lineBetween(40, 29, 51, 40);
    if (skin.id === "prism") g.fillStyle(0xff9de2).fillTriangle(13, 20, 24, 25, 20, 36).fillStyle(0x9c8bff).fillTriangle(40, 15, 50, 25, 43, 34);
    if (skin.headConfig.horns)
      g.fillStyle(skin.bodyConfig.accent)
        .fillTriangle(10, 20, 6, 2, 23, 13)
        .fillTriangle(37, 13, 57, 2, 52, 22);
    if (skin.headConfig.ears)
      g.fillStyle(skin.color)
        .fillTriangle(8, 20, 11, 0, 29, 12)
        .fillTriangle(35, 12, 54, 0, 58, 20);
    if (skin.headConfig.crown) {
      g.fillStyle(skin.bodyConfig.accent)
        .fillTriangle(13, 13, 17, 1, 26, 12)
        .fillTriangle(26, 12, 32, 0, 38, 12)
        .fillTriangle(38, 12, 48, 1, 51, 13)
        .fillRect(15, 12, 35, 6);
    }
    g.fillStyle(0xffffff)
      .fillEllipse(39, 18, 16, 20)
      .fillEllipse(39, 41, 16, 20);
    g.fillStyle(skin.headConfig.eyes).fillCircle(43, 19, 5).fillCircle(43, 40, 5);
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
    g.clear();
    g.fillStyle(skin.dark).fillRoundedRect(2, 2, 60, 60, 24);
    g.fillStyle(skin.color).fillRoundedRect(5, 5, 54, 52, 22);
    g.fillStyle(skin.bodyConfig.accent, 0.8).fillCircle(18, 20, 5).fillCircle(44, 42, 5);
    g.generateTexture(`${skin.id}-preview-body`, 64, 64);
    g.clear();
    g.fillStyle(skin.dark).fillCircle(32, 34, 28);
    g.fillStyle(skin.color).fillCircle(32, 30, 27);
    if (skin.detail === "cat") g.fillStyle(skin.color).fillTriangle(8, 22, 10, 0, 29, 15).fillTriangle(35, 15, 54, 0, 56, 22);
    if (skin.detail === "robot") g.fillStyle(skin.dark).fillRoundedRect(7, 6, 50, 48, 12);
    if (skin.detail === "dino") g.fillStyle(skin.dark).fillTriangle(8, 17, 0, 30, 8, 45);
    if (skin.detail === "dragon" || skin.detail.includes("dragon") || skin.detail === "frost-wyvern" || skin.detail === "inferno-titan") g.fillStyle(skin.bodyConfig.accent).fillTriangle(8, 21, 8, 0, 27, 15).fillTriangle(37, 15, 56, 0, 56, 21);
    if (skin.headConfig.horns) g.fillStyle(skin.bodyConfig.accent).fillTriangle(8, 21, 8, 0, 27, 15).fillTriangle(37, 15, 56, 0, 56, 21);
    if (skin.headConfig.ears) g.fillStyle(skin.color).fillTriangle(8, 20, 10, 0, 29, 15).fillTriangle(35, 15, 54, 0, 56, 20);
    if (skin.headConfig.crown) g.fillStyle(skin.bodyConfig.accent).fillTriangle(12, 15, 17, 0, 27, 14).fillTriangle(27, 14, 32, 0, 39, 14).fillTriangle(39, 14, 49, 0, 53, 15);
    g.fillStyle(0xffffff).fillCircle(40, 24, 6).fillCircle(40, 39, 6);
    g.fillStyle(skin.headConfig.eyes).fillCircle(42, 24, 3).fillCircle(42, 39, 3);
    g.generateTexture(`${skin.id}-preview-head`, 64, 64);
  }
  for (const coin of B.coins) {
    g.clear();
    g.fillStyle(0x284c32, 0.2).fillCircle(25, 28, 21);
    g.fillStyle(coin.color).fillCircle(25, 24, 21);
    g.lineStyle(3, 0xffffff, 0.65).strokeCircle(25, 24, 16);
    g.fillStyle(0xffffff, 0.6).fillEllipse(18, 15, 10, 5);
    if (coin.id === "pearl_coin") {
      g.fillStyle(0xffffff, 0.8).fillCircle(25, 24, 9);
      g.fillStyle(0xb5e8f1, 0.65).fillCircle(22, 21, 4);
      g.lineStyle(2, 0x7bc9da, 0.9).strokeCircle(25, 24, 15);
    }
    g.generateTexture(`coin-${coin.id}`, 50, 52);
    if (coin.id === "candy_coin") {
      g.fillStyle(0xffffff, 0.65).fillTriangle(25, 10, 38, 34, 12, 34).fillTriangle(25, 38, 38, 14, 12, 14);
      g.lineStyle(3, 0xa52d78).strokeCircle(25, 24, 21);
      g.generateTexture("coin-candy_coin", 50, 52);
    }
  }
  g.clear();
  g.fillStyle(0x45d66b).fillCircle(28, 28, 24);
  g.fillStyle(0x183c22).fillCircle(20, 21, 3).fillCircle(36, 21, 3);
  g.lineStyle(4, 0x183c22).lineBetween(20, 37, 36, 37);
  g.generateTexture("hazard-poison", 56, 56);
  for (const power of powerups) {
    g.clear();
    g.fillStyle(power.color).fillRoundedRect(2, 2, 52, 52, 17);
    g.lineStyle(3, 0xffffff, 0.85).strokeRoundedRect(6, 6, 44, 44, 13);
    if (power.id === "precision") {
      g.lineStyle(5, 0xffffff).lineBetween(28, 13, 28, 37).lineBetween(18, 28, 28, 38).lineBetween(38, 28, 28, 38);
      g.lineStyle(3, 0xffffff, 0.85).lineBetween(15, 44, 41, 44);
    } else if (power.id === "lucky-star") {
      g.fillStyle(0xfff7c2).fillPoints(Phaser.Geom.Polygon.GetPoints(new Phaser.Geom.Polygon(Array.from({ length: 10 }, (_, i) => {
        const radius = i % 2 === 0 ? 20 : 9;
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        return { x: 28 + Math.cos(angle) * radius, y: 28 + Math.sin(angle) * radius };
      })), 1));
      g.lineStyle(2, 0xfff7c2, 0.9).strokeCircle(28, 28, 22);
    } else if (power.id === "ghost") {
      g.fillStyle(0xeaffff, 0.92).fillCircle(28, 22, 13).fillRoundedRect(15, 22, 26, 18, 10);
      g.fillStyle(0x65c8e4).fillCircle(23, 23, 2).fillCircle(33, 23, 2);
      g.fillStyle(power.color).fillTriangle(15, 36, 22, 32, 22, 42).fillTriangle(27, 36, 34, 32, 34, 42).fillTriangle(34, 36, 41, 32, 41, 42);
    }
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
          s.textures.exists(`${id}-preview-body`) ? `${id}-preview-body` : `${id}-body`,
        )
        .setScale(scale),
    );
  items.push(s.add.image(x, y, s.textures.exists(`${id}-preview-head`) ? `${id}-preview-head` : `${id}-head`).setScale(scale * 1.18));
  return items;
}
