import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { xpProgressForLevel } from "../systems/ExperienceSystem";
import { ScreenUI, action } from "../ui/ScreenUI";
import { reconcileWorldUnlocks } from "../systems/WorldSystem";
import { worldById } from "../data/worlds";
import { formatNumber, t } from "../services/LocalizationService";
import stackedLogoUrl from "../../../assets/branding/coin-snake-logo-stacked.svg";
import { clearDevRunSnapshot, loadDevRunSnapshot } from "../systems/DevRunSnapshot";
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
      xpProgress = xpProgressForLevel(p.xp);
    reconcileWorldUnlocks(p);
    this.cameras.main.setBackgroundColor("#f6f5e6");
    this.events.on("androidBackButton", this.confirmExit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.events.off("androidBackButton", this.confirmExit, this),
    );
    ui.html(
      `<div class="home"><div class="hero"><img class="brand-menu-logo" src="${stackedLogoUrl}" alt="Coin Snake"/><span class="pill">● ${worldById(p.selectedWorld).name}</span></div><div class="home-actions"><div class="card"><div class="wallet"><span>◉ ${formatNumber(p.totalCoins)}</span><span>${t("level")} ${p.playerLevel}</span></div><p class="muted">${t("best")} <b>${formatNumber(p.bestScore)}</b> · XP ${formatNumber(xpProgress.current)}/${formatNumber(xpProgress.required)}</p><div class="xp-track"><i style="width:${(100 * xpProgress.current) / xpProgress.required}%"></i></div></div>${action("play", t("play"), "play")}${action("worlds", `${t("worlds")} · ${worldById(p.selectedWorld).name}`, "secondary")}<div class="button-row">${action("shop", t("shop"), "secondary")}${action("missions", t("missions"), "gold")}</div>${action("settings", t("settings"), "secondary small")}<p class="footnote">${t("collect")}<br>${t("virtualCoins")}</p></div></div>`,
    );
    ui.on("#play", () => {
      clearDevRunSnapshot(import.meta.env.DEV);
      this.scene.start("DifficultySelect", { startWorld: p.selectedWorld });
    });
    ui.on("#worlds", () => this.scene.start("WorldSelect"));
    ui.on("#shop", () => this.scene.start("Shop"));
    ui.on("#missions", () => this.scene.start("Missions"));
    ui.on("#settings", () => this.scene.start("Settings"));
    if (save.error) ui.toast(save.error);
  }
  private confirmExit() {
    const ui = new ScreenUI(this);
    ui.modal("Sair do jogo?", "Tem certeza de que deseja sair?", [
      { label: "Sair", run: () => { void import("@capacitor/app").then(({ App }) => App.exitApp()); } },
      { label: "Cancelar", run: () => ui.destroy() },
    ]);
  }
}
