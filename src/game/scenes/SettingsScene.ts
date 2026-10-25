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
    const english = resolveLanguage(s.language) === "en";
    const analyticsEnabled = analytics.getConsent();
    ui.root.insertAdjacentHTML("beforeend", `<section class="card beta-card"><h2>COIN SNAKE BETA</h2><p>${english ? "Version" : "Versão"} ${APP_VERSION} · ${platform}</p><section class="analytics-card ${analyticsAvailable ? "" : "analytics-card--unavailable"}" aria-labelledby="analytics-title"><div class="analytics-card__copy"><div class="analytics-card__heading"><span class="analytics-card__icon" aria-hidden="true">◉</span><div><h3 id="analytics-title">${english ? "Share anonymous gameplay analytics" : "Compartilhar estatísticas anônimas de jogo"}</h3><span id="analytics-status" class="analytics-status" role="status" aria-live="polite">${analyticsAvailable ? (analyticsEnabled ? (english ? "On" : "Ativado") : (english ? "Off" : "Desativado")) : (english ? "Unavailable in this build" : "Indisponível nesta versão")}</span></div></div><p>${english ? "Help improve the beta by sharing summary gameplay events, such as runs and worlds visited. No name, email, or save data is sent. You can change this anytime." : "Ajude a melhorar o beta compartilhando estatísticas resumidas, como partidas e mundos visitados. Não enviamos nome, email nem dados do seu save. Você pode mudar sua escolha quando quiser."}</p></div><label class="analytics-switch" for="analytics-consent"><span class="analytics-switch__label">${english ? "Analytics sharing" : "Compartilhamento de analytics"}</span><input id="analytics-consent" type="checkbox" role="switch" aria-label="${english ? "Share anonymous gameplay analytics" : "Compartilhar estatísticas anônimas de jogo"}" aria-describedby="analytics-description analytics-status" ${analyticsEnabled ? "checked" : ""} ${analyticsAvailable ? "" : "disabled"}><span class="analytics-switch__track" aria-hidden="true"><span></span></span></label><p id="analytics-description" class="analytics-card__privacy">${analyticsAvailable ? (english ? "Optional. Turn off anytime; no new analytics events will be sent." : "Opcional. Desative quando quiser; novos eventos de analytics deixarão de ser enviados.") : (english ? "The analytics provider is not configured for this build, so nothing will be shared." : "O provedor de analytics não está configurado nesta versão; nenhum dado será compartilhado.")}</p></section><div class="beta-actions"><button id="send-feedback" class="action secondary" ${feedbackAvailable ? "" : "disabled"}>${english ? "FEEDBACK / REPORT BUG" : "ENVIAR OPINIÃO / REPORTAR ERRO"}</button>${privacyAvailable ? `<a class="action secondary" href="${import.meta.env.VITE_PRIVACY_URL}" target="_blank" rel="noopener noreferrer">${english ? "Privacy" : "Privacidade"}</a>` : ""}</div></section>`);
    ui.on("#back", () => this.scene.start("Menu"));
    ui.get<HTMLInputElement>("#analytics-consent").addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement;
      s.analyticsConsent = input.checked;
      analytics.setConsent(s.analyticsConsent);
      await save.save();
      const status = ui.get<HTMLElement>("#analytics-status");
      status.textContent = s.analyticsConsent ? (english ? "On" : "Ativado") : (english ? "Off" : "Desativado");
      ui.root.querySelector(".analytics-card")?.classList.toggle("analytics-card--enabled", s.analyticsConsent);
      ui.toast(s.analyticsConsent ? (english ? "Anonymous analytics enabled." : "Analytics anônimo ativado.") : (english ? "Anonymous analytics disabled." : "Analytics anônimo desativado."));
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
