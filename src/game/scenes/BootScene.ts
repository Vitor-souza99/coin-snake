import { ScreenUI } from "../ui/ScreenUI";
import Phaser from "phaser";
import { generateTextures } from "../ui/Textures";
import { save } from "../systems/SaveSystem";
import { ensureDay } from "../systems/MissionSystem";
import { applyOrientation } from "../services/OrientationService";
import { ads } from "../services/AdsService";
import { resolveLanguage, setLanguage } from "../services/LocalizationService";
import { audio } from "../services/AudioService";
import { analytics, platform, buildChannel, NoopAnalyticsProvider, PostHogAnalyticsProvider } from "../services/AnalyticsService";
import { assertBetaReleaseConfiguration } from "../config/release";
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
    if (!import.meta.env.DEV && import.meta.env.VITE_BUILD_CHANNEL !== "dev") assertBetaReleaseConfiguration();
    audio.setMusic(`${import.meta.env.BASE_URL}assets/audio/coin-snake-theme.wav`);
    setLanguage(resolveLanguage(save.profile.settings.language));
    analytics.setProvider(import.meta.env.VITE_ANALYTICS_ENABLED === "true" && !import.meta.env.DEV ? new PostHogAnalyticsProvider() : new NoopAnalyticsProvider());
    analytics.setConsent(save.profile.settings.analyticsConsent);
    analytics.track("app_started", { gameVersion: "0.9.0-beta", buildChannel, platform });
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
