import Phaser from "phaser";
export interface Layout {
  screenWidth: number;
  screenHeight: number;
  orientation: "portrait" | "landscape";
  isPortrait: boolean;
  isLandscape: boolean;
  centerX: number;
  centerY: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
}
export function getLayout(width: number, height: number): Layout {
  const app = document.querySelector("#app");
  const css = app ? getComputedStyle(app) : null;
  return {
    screenWidth: width,
    screenHeight: height,
    orientation: width > height ? "landscape" : "portrait",
    isPortrait: height >= width,
    isLandscape: width > height,
    centerX: width / 2,
    centerY: height / 2,
    safeArea: {
      top: parseFloat(css?.paddingTop || "0"),
      right: parseFloat(css?.paddingRight || "0"),
      bottom: parseFloat(css?.paddingBottom || "0"),
      left: parseFloat(css?.paddingLeft || "0"),
    },
  };
}
export function observeLayout(
  scene: Phaser.Scene,
  callback: (layout: Layout) => void,
) {
  const resize = () =>
    callback(getLayout(scene.scale.width, scene.scale.height));
  scene.scale.on(Phaser.Scale.Events.RESIZE, resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    scene.scale.off(Phaser.Scale.Events.RESIZE, resize),
  );
  resize();
}
