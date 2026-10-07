import Phaser from "phaser";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { config } from "./game/config";
import { GameScene } from "./game/scenes/GameScene";
import "./styles/global.css";
const game = new Phaser.Game(config);
// The single safe-area wrapper can resize independently of the window.
const stage=document.querySelector('#stage')!;
const resizeObserver=new ResizeObserver(()=>game.scale.refresh());
resizeObserver.observe(stage);
if (Capacitor.isNativePlatform()) {
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      const scene = game.scene.getScene("Game");
      if (scene instanceof GameScene) scene.requestPause();
    }
  });
  void App.addListener("backButton", () => {
    const scene = game.scene.getScene("Game");
    if (scene instanceof GameScene && game.scene.isActive("Game"))
      scene.requestPause();
  });
}
// Developer-only handle for browser smoke tests, absent from production bundles.
if (import.meta.env.DEV)
  Object.defineProperty(window, "coinSnake", {
    value: game,
    configurable: true,
  });
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    resizeObserver.disconnect();
    game.destroy(true);
    void App.removeAllListeners();
  });
