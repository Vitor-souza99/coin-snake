import Phaser from "phaser";
export const C = {
  bg: 0xf4f4df,
  ink: "#163f36",
  muted: "#526c5b",
  green: 0x1f6950,
  lime: 0xc9ec7a,
  gold: 0xffd366,
  white: 0xffffff,
};
export function text(
  s: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 28,
  color = C.ink,
  bold = false,
) {
  return s.add
    .text(x, y, value, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? "bold" : "normal",
      align: "center",
    })
    .setOrigin(0.5);
}
export function panel(
  s: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 0xffffff,
  r = 28,
) {
  return s.add.graphics().fillStyle(color).fillRoundedRect(x, y, w, h, r);
}
export function backdrop(s: Phaser.Scene) {
  s.cameras.main.setBackgroundColor(C.bg);
  const g = s.add.graphics();
  g.fillStyle(0xe5ecd0).fillCircle(650, 30, 240);
  g.fillStyle(0xe9efda).fillCircle(20, 1260, 290);
  for (let i = 0; i < 22; i++) {
    const x = (i * 137) % 720,
      y = (i * 197) % 1280;
    g.fillStyle(0xceddbb, 0.4).fillEllipse(x, y, 12, 5);
  }
}
export function title(s: Phaser.Scene, kicker: string, name: string) {
  text(s, 360, 85, kicker, 20, C.muted, true);
  text(s, 360, 145, name, 48, C.ink, true);
}
export function toast(s: Phaser.Scene, message: string) {
  const p = panel(s, 60, 1080, 600, 72, C.green, 20).setDepth(100);
  const t = text(s, 360, 1116, message, 23, "#ffffff", true).setDepth(101);
  s.tweens.add({
    targets: [p, t],
    alpha: 0,
    delay: 1500,
    duration: 400,
    onComplete: () => {
      p.destroy();
      t.destroy();
    },
  });
}
