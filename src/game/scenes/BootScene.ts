import { ScreenUI } from "../ui/ScreenUI";
import Phaser from "phaser";
import { generateTextures } from "../ui/Textures";
import { save } from "../systems/SaveSystem";
import { ensureDay } from "../systems/MissionSystem";
import { applyOrientation } from "../services/OrientationService";
import { ads } from "../services/AdsService";
import { resolveLanguage, setLanguage } from "../services/LocalizationService";
import brandSymbolUrl from "../../../assets/branding/coin-snake-symbol.png";
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
    setLanguage(resolveLanguage(save.profile.settings.language));
    void ads.requestConsent();
    await applyOrientation(save.profile.settings.orientation);
    ensureDay(save.profile);
    this.load.image("brand-symbol", brandSymbolUrl);
    const startLogo = () => {
      if (this.scene.isActive()) this.scene.start("Logo");
    };
    this.load.once(Phaser.Loader.Events.COMPLETE, startLogo);
    this.load.once("loaderror", startLogo);
    this.load.start();
  }
}
