import Phaser from "phaser";
import { SettingsScene } from "./scenes/SettingsScene";
import { CollectionScene } from "./scenes/CollectionScene";
import { BootScene } from "./scenes/BootScene";
import { LogoScene } from "./scenes/LogoScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { GameScene } from "./scenes/GameScene";
import { DifficultySelectScene } from "./scenes/DifficultySelectScene";
import { ShopScene } from "./scenes/ShopScene";
import { MissionsScene } from "./scenes/MissionsScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { WorldSelectScene } from "./scenes/WorldSelectScene";
import { ClassicSnakeScene } from "./scenes/ClassicSnakeScene";
export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#103e36",
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
  input: { activePointers: 2 },
  scene: [
    BootScene,
    LogoScene,
    MainMenuScene,
    DifficultySelectScene,
    SettingsScene,
    CollectionScene,
    GameScene,
    ClassicSnakeScene,
    ShopScene,
    WorldSelectScene,
    MissionsScene,
    GameOverScene,
  ],
};
