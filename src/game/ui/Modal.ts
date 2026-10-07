import Phaser from "phaser";
import { button } from "./Button";
import { C, text } from "./Theme";
export function modal(
  s: Phaser.Scene,
  heading: string,
  body: string,
  actions: { label: string; run: () => void }[],
) {
  const blocker = s.add
    .rectangle(360, 640, 720, 1280, 0x0b2923, 0.65)
    .setInteractive();
  const box = s.add
    .graphics()
    .fillStyle(C.bg)
    .fillRoundedRect(60, 340, 600, 600, 38);
  const head = text(s, 360, 415, heading, 40, C.ink, true),
    copy = text(s, 360, 500, body, 25, C.muted);
  copy.setLineSpacing(12);
  const items: Phaser.GameObjects.GameObject[] = [blocker, box, head, copy];
  actions.forEach((a, i) =>
    items.push(
      button(
        s,
        360,
        615 + i * 108,
        a.label,
        a.run,
        480,
        i ? 0xe0e8cd : C.green,
        i ? C.ink : "#ffffff",
      ),
    ),
  );
  const group = s.add.container(0, 0, items).setDepth(200);
  return group;
}
