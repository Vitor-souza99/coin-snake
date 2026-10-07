import { ScreenUI } from "../ui/ScreenUI";
import Phaser from "phaser";
import { generateTextures } from "../ui/Textures";
import { save } from "../systems/SaveSystem";
import { ensureDay } from "../systems/MissionSystem";
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    generateTextures(this);
    const ui = new ScreenUI(this, "screen boot");
    ui.html("<h1>Coin Snake</h1><p>Preparando Green Valley…</p>");
    void this.boot();
  }
  private async boot() {
    await save.load();
    ensureDay(save.profile);
    this.scene.start("Menu");
  }
}
