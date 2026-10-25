import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { audio } from "../services/AudioService";
import { ScreenUI, header } from "../ui/ScreenUI";
import { applyOrientation } from "../services/OrientationService";
import { resolveLanguage, setLanguage, t } from "../services/LocalizationService";
import { analytics, APP_VERSION, platform } from "../services/AnalyticsService";
import { feedback } from "../services/FeedbackService";
import { releaseConfig } from "../config/release";
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("Settings");
  }
  create() {
    const ui = new ScreenUI(this),
      s = save.profile.settings;
    ui.html(`${header(t("settingsTitle"), t("settingsKicker"))}<div class="settings-grid"><div class="card setting-row"><label for="language">${t("language")}</label><select id="language"><option value="auto" ${s.language === "auto" ? "selected" : ""}>${t("languageAuto")}</option><option value="pt-BR" ${s.language === "pt-BR" ? "selected" : ""}>${t("languagePortuguese")}</option><option value="en" ${s.language === "en" ? "selected" : ""}>${t("languageEnglish")}</option></select></div><div class="card setting-row"><label for="left">${t("leftHanded")}<small>${t("leftHandedHelp")}</small></label><input type="checkbox" id="left" ${s.leftHanded ? "checked" : ""}></div><div class="card setting-row"><label for="camera">${t("camera")}</label><select id="camera"><option value="standard" ${s.cameraMode === "standard" ? "selected" : ""}>${t("standard")}</option><option value="panoramic" ${s.cameraMode === "panoramic" ? "selected" : ""}>${t("panoramic")}</option></select></div><div class="card setting-row"><label for="orientation">${t("orientation")}</label><select id="orientation"><option value="auto" ${s.orientation === "auto" ? "selected" : ""}>${t("automatic")}</option><option value="portrait" ${s.orientation === "portrait" ? "selected" : ""}>${t("portrait")}</option><option value="landscape" ${s.orientation === "landscape" ? "selected" : ""}>${t("landscape")}</option></select></div><div class="card setting-row"><label for="mute">${t("mute")}</label><input type="checkbox" id="mute" ${s.muted ? "checked" : ""}></div><div class="card setting-row"><label for="sfx">${t("sfx")}</label><input type="range" id="sfx" min="0" max="1" step="0.05" value="${s.sfxVolume}"></div><div class="card setting-row"><label for="music">${t("music")}<small>${t("musicHelp")}</small></label><input type="range" id="music" min="0" max="1" step="0.05" value="${s.musicVolume}"></div><div class="card setting-row"><label for="haptics">${t("haptics")}<small>${t("hapticsHelp")}</small></label><input type="checkbox" id="haptics" ${s.haptics ? "checked" : ""}></div><div class="card setting-row"><label for="motion">${t("reducedMotion")}</label><input type="checkbox" id="motion" ${s.reducedMotion ? "checked" : ""}></div><article class="card computer-controls"><b>${t("computer")}</b><ul><li>${t("computerMove")}</li><li>${t("computerTurbo")}</li><li>${t("computerFreeze")}</li><li>${t("computerPause")}</li></ul></article><button class="action secondary" id="tutorial">${t("tutorial")}</button><button class="action gold" id="classic-snake">${t("classicPlay")}</button><button class="action secondary" id="collection">${t("collection")}</button><button class="action secondary" id="reset-save">${t("reset")}</button></div>`);
    const analyticsAvailable = releaseConfig.analyticsEnabled && releaseConfig.posthogKeyConfigured && releaseConfig.posthogHostConfigured;
    const feedbackAvailable = feedback.getUrl().startsWith("https://");
    const privacyAvailable = import.meta.env.VITE_PRIVACY_URL?.startsWith("https://");
    ui.root.insertAdjacentHTML("beforeend", `<section class="card"><h2>COIN SNAKE BETA</h2><p>Version ${APP_VERSION} · ${platform}</p><label class="setting-row" for="analytics-consent"><span>Share anonymous gameplay analytics</span><input id="analytics-consent" type="checkbox" ${analytics.getConsent() ? "checked" : ""} ${analyticsAvailable ? "" : "disabled"}></label><p class="muted">No name, email, precise location, or save data is sent.${analyticsAvailable ? "" : " Analytics provider is not configured for this build."}</p><button id="send-feedback" class="action secondary" ${feedbackAvailable ? "" : "disabled"}>FEEDBACK / REPORT BUG</button>${privacyAvailable ? `<a class="action secondary" href="${import.meta.env.VITE_PRIVACY_URL}" target="_blank" rel="noopener noreferrer">Privacy</a>` : ""}</section>`);
    ui.on("#back", () => this.scene.start("Menu"));
    ui.get<HTMLInputElement>("#analytics-consent").addEventListener("change", async (event) => {
      s.analyticsConsent = (event.target as HTMLInputElement).checked;
      analytics.setConsent(s.analyticsConsent);
      await save.save();
    });
    ui.on("#send-feedback", () => { void feedback.open().then((opened) => { if (!opened) ui.toast(feedbackAvailable ? "Não foi possível abrir o feedback." : "Feedback ainda não configurado para este beta."); }); });
    ui.get<HTMLSelectElement>("#language").addEventListener("change", (event) => {
      const selected = (event.target as HTMLSelectElement).value;
      s.language = selected === "pt-BR" || selected === "en" ? selected : "auto";
      setLanguage(resolveLanguage(s.language));
      void save.save();
      ui.toast(t("languageChanged"));
      this.scene.restart();
    });
    const bind = (id: string, apply: (input: HTMLInputElement) => void) => {
      const input = ui.get<HTMLInputElement>(id);
      input.addEventListener("change", () => {
        apply(input);
        audio.sync();
        void save.save();
      });
    };
    bind("#left", (i) => {
      s.leftHanded = i.checked;
    });
    ui.get<HTMLSelectElement>("#camera").addEventListener("change", (event) => {
      s.cameraMode = (event.target as HTMLSelectElement).value === "panoramic" ? "panoramic" : "standard";
      void save.save();
    });
    ui.get<HTMLSelectElement>("#orientation").addEventListener("change", async (event) => {
      const input = event.target as HTMLSelectElement;
      const requested = input.value === "portrait" || input.value === "landscape" ? input.value : "auto";
      const previous = s.orientation;
      if (!(await applyOrientation(requested))) {
        input.value = previous;
        ui.toast("Este navegador n�o permite bloquear a orienta��o. Tente em tela cheia ou use o app Android.");
        return;
      }
      s.orientation = requested;
      void save.save();
      const orientationLabel = requested === "portrait" ? "vertical" : "horizontal";
      ui.toast(requested === "auto" ? "Rota��o autom�tica ativada." : "Tela bloqueada na orienta��o " + orientationLabel + ".");
    });
    bind("#mute", (i) => {
      s.muted = i.checked;
    });
    bind("#haptics", (i) => {
      s.haptics = i.checked;
    });
    bind("#motion", (i) => {
      s.reducedMotion = i.checked;
      ui.root.classList.toggle("reduced-motion", i.checked);
    });
    bind("#sfx", (i) => {
      s.sfxVolume = Number(i.value);
      s.volume = s.sfxVolume;
      audio.play("coin");
    });
    bind("#music", (i) => {
      s.musicVolume = Number(i.value);
    });
    ui.get<HTMLInputElement>("#music").addEventListener("input", (event) => {
      s.musicVolume = Number((event.target as HTMLInputElement).value);
      audio.sync();
      void save.save();
    });
    ui.on("#tutorial", () => {
      const confirmation = ui.modal(
        t("tutorialConfirmTitle"),
        t("tutorialConfirmBody"),
        [
          {
            label: t("tutorialConfirm"),
            run: () => {
              confirmation.destroy();
              save.profile.hints = { joystick: false, turbo: false, shrink: false, ocean: false, oceanCurrent: false, pearl: false, deepTrench: false, desertGust: false };
              void save.save();
              ui.toast(t("tutorialResetNotice"));
            },
          },
          { label: t("cancel"), run: () => confirmation.destroy() },
        ],
        { initialFocus: 1 },
      );
    });
    ui.on("#classic-snake", () => this.scene.start("ClassicSnake"));
    ui.on("#collection", () => this.scene.start("Collection"));
    ui.on("#reset-save", () => {
      const confirmation = ui.modal(
        t("resetTitle"),
        t("resetBody"),
        [
          {
            label: t("resetConfirm"),
            run: () => {
              confirmation.destroy();
              void save.reset().then(() => {
                audio.sync();
                setLanguage(resolveLanguage(save.profile.settings.language));
                this.scene.start("Menu");
              });
            },
          },
          { label: t("cancel"), run: () => confirmation.destroy() },
        ],
        { initialFocus: 1 },
      );
    });
  }
}
