import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { xpProgressForLevel } from "../systems/ExperienceSystem";
import { ScreenUI, action } from "../ui/ScreenUI";
import { reconcileWorldUnlocks } from "../systems/WorldSystem";
import { worldById } from "../data/worlds";
import { formatNumber, t } from "../services/LocalizationService";
import stackedLogoUrl from "../../../assets/branding/coin-snake-logo-stacked.svg";
import { clearDevRunSnapshot, loadDevRunSnapshot } from "../systems/DevRunSnapshot";
import { analytics, platform } from "../services/AnalyticsService";
import { releaseConfig } from "../config/release";
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }
  create() {
    const devRun = import.meta.env.DEV ? loadDevRunSnapshot(true) : undefined;
    if (devRun) {
      this.scene.start("Game", { resumeDevRun: true });
      return;
    }
    const p = save.profile,
      ui = new ScreenUI(this),
      xpProgress = xpProgressForLevel(p.xp),
      pendingMissionCount = p.pendingMissionRewards.length;
    reconcileWorldUnlocks(p);
    analytics.setConsent(p.settings.analyticsConsent);
    analytics.track("main_menu_viewed", { gameVersion: "0.9.0-beta", platform });
    this.cameras.main.setBackgroundColor("#f6f5e6");
    this.events.on("androidBackButton", this.confirmExit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.events.off("androidBackButton", this.confirmExit, this),
    );
    ui.html(
      `<div class="home"><div class="hero"><img class="brand-menu-logo" src="${stackedLogoUrl}" alt="Coin Snake"/><span class="pill">● ${worldById(p.selectedWorld).name}</span></div><div class="home-actions"><div class="card"><div class="wallet"><span>◉ ${formatNumber(p.totalCoins)}</span><span>${t("level")} ${p.playerLevel}</span></div><p class="muted">${t("best")} <b>${formatNumber(p.bestScore)}</b> · XP ${formatNumber(xpProgress.current)}/${formatNumber(xpProgress.required)}</p><div class="xp-track"><i style="width:${(100 * xpProgress.current) / xpProgress.required}%"></i></div></div>${action("play", t("play"), "play")}${action("worlds", `${t("worlds")} · ${worldById(p.selectedWorld).name}`, "secondary")}<div class="button-row">${action("shop", t("shop"), "secondary")}<button id="missions" class="action gold missions-action" aria-label="${t("missions")}${pendingMissionCount ? `: ${pendingMissionCount} recompensa${pendingMissionCount === 1 ? "" : "s"} disponível${pendingMissionCount === 1 ? "" : "is"} para resgate` : ""}">${t("missions")}${pendingMissionCount ? `<span class="mission-notification" aria-hidden="true">${pendingMissionCount > 9 ? "9+" : pendingMissionCount}</span>` : ""}</button></div>${action("settings", t("settings"), "secondary small")}<p class="footnote">${t("collect")}<br>${t("virtualCoins")}</p></div></div>`,
    );
    ui.on("#play", () => {
      clearDevRunSnapshot(import.meta.env.DEV);
      this.scene.start("DifficultySelect", { startWorld: p.selectedWorld });
    });
    ui.on("#worlds", () => this.scene.start("WorldSelect"));
    ui.on("#shop", () => this.scene.start("Shop"));
    ui.on("#missions", () => this.scene.start("Missions"));
    ui.on("#settings", () => this.scene.start("Settings"));
    if (!p.settings.analyticsPromptDismissed && !p.settings.analyticsConsent) {
      const analyticsAvailable = releaseConfig.analyticsEnabled && releaseConfig.posthogKeyConfigured && releaseConfig.posthogHostConfigured;
      const prompt = ui.modal(
        t("analyticsPromptTitle"),
        `${t("analyticsPromptBody")}${analyticsAvailable ? "" : `\n\n${t("analyticsUnavailable")}`}`,
        [
          {
            label: t("analyticsPromptEnable"),
            run: () => {
              if (!analyticsAvailable) return;
              prompt.destroy();
              p.settings.analyticsConsent = true;
              p.settings.analyticsPromptDismissed = true;
              analytics.setConsent(true);
              void save.save();
            },
          },
          {
            label: t("analyticsPromptDecline"),
            run: () => {
              prompt.destroy();
              p.settings.analyticsPromptDismissed = true;
              void save.save();
            },
          },
        ],
        { initialFocus: 1 },
      );
      if (!analyticsAvailable) {
        const enableButton = ui.root.querySelector<HTMLButtonElement>(".dialog-actions button:first-child");
        if (enableButton) enableButton.disabled = true;
      }
    }
    if (save.error) ui.toast(save.error);
  }
  private confirmExit() {
    const ui = new ScreenUI(this);
    ui.modal(t("exitTitle"), t("exitBody"), [
      { label: t("exit"), run: () => { void import("@capacitor/app").then(({ App }) => App.exitApp()); } },
      { label: t("cancel"), run: () => ui.destroy() },
    ], { initialFocus: 1 });
  }
}
