import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { audio } from "../services/AudioService";
import { ScreenUI, header } from "../ui/ScreenUI";
import { applyOrientation } from "../services/OrientationService";
import { getLanguage, resolveLanguage, setLanguage, t } from "../services/LocalizationService";
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("Settings");
  }
  create() {
    const ui = new ScreenUI(this),
      s = save.profile.settings;
    ui.html(`${header(t("settingsTitle"), t("settingsKicker"))}<div class="settings-grid"><div class="card setting-row"><label for="language">${t("language")}</label><select id="language"><option value="auto" ${s.language === "auto" ? "selected" : ""}>${t("languageAuto")}</option><option value="pt-BR" ${s.language === "pt-BR" ? "selected" : ""}>${t("languagePortuguese")}</option><option value="en" ${s.language === "en" ? "selected" : ""}>${t("languageEnglish")}</option></select></div><div class="card setting-row"><label for="left">${t("leftHanded")}<small>${t("leftHandedHelp")}</small></label><input type="checkbox" id="left" ${s.leftHanded ? "checked" : ""}></div><div class="card setting-row"><label for="camera">${t("camera")}</label><select id="camera"><option value="standard" ${s.cameraMode === "standard" ? "selected" : ""}>${t("standard")}</option><option value="panoramic" ${s.cameraMode === "panoramic" ? "selected" : ""}>${t("panoramic")}</option></select></div><div class="card setting-row"><label for="orientation">${t("orientation")}</label><select id="orientation"><option value="auto" ${s.orientation === "auto" ? "selected" : ""}>${t("automatic")}</option><option value="portrait" ${s.orientation === "portrait" ? "selected" : ""}>${t("portrait")}</option><option value="landscape" ${s.orientation === "landscape" ? "selected" : ""}>${t("landscape")}</option></select></div><div class="card setting-row"><label for="mute">${t("mute")}</label><input type="checkbox" id="mute" ${s.muted ? "checked" : ""}></div><div class="card setting-row"><label for="sfx">${t("sfx")}</label><input type="range" id="sfx" min="0" max="1" step="0.05" value="${s.sfxVolume}"></div><div class="card setting-row"><label for="music">${t("music")}<small>${t("musicHelp")}</small></label><input type="range" id="music" min="0" max="1" step="0.05" value="${s.musicVolume}"></div><div class="card setting-row"><label for="haptics">${t("haptics")}<small>${t("hapticsHelp")}</small></label><input type="checkbox" id="haptics" ${s.haptics ? "checked" : ""}></div><div class="card setting-row"><label for="motion">${t("reducedMotion")}</label><input type="checkbox" id="motion" ${s.reducedMotion ? "checked" : ""}></div><article class="card"><b>${getLanguage() === "en" ? "On computer" : "No computador"}</b><p class="muted">WASD / arrows</p></article><button class="action secondary" id="tutorial">${t("tutorial")}</button><button class="action secondary" id="rush">${t("rush")}</button><button class="action secondary" id="collection">${t("collection")}</button><button class="action secondary" id="reset-save">${t("reset")}</button></div>`);
    ui.on("#back", () => this.scene.start("Menu"));
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
      save.profile.hints = { joystick: false, turbo: false, shrink: false, ocean: false, oceanCurrent: false, pearl: false, deepTrench: false, desertGust: false };
      void save.save();
      ui.toast("As dicas aparecer�o na pr�xima partida.");
    });
    ui.on("#rush", () => this.scene.start("DifficultySelect", { rushMode: true }));
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
