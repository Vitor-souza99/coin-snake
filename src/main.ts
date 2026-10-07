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
    else if (game.scene.isActive("Menu")) {
      const menu = game.scene.getScene("Menu");
      if (menu instanceof Phaser.Scene) menu.events.emit("androidBackButton");
    } else {
      // A scene.start() only replaces the scene it is called on. Stop all
      // foreground screens first so their DOM overlays cannot remain above Menu.
      for (const activeScene of game.scene.getScenes(true)) {
        if (activeScene.scene.key === "Boot") continue;
        if (activeScene instanceof GameScene) activeScene.finalize();
        game.scene.stop(activeScene.scene.key);
      }
      game.scene.start("Menu");
    }
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
