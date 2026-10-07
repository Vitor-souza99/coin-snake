import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { audio } from "../services/AudioService";
import { ScreenUI, header } from "../ui/ScreenUI";
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("Settings");
  }
  create() {
    const ui = new ScreenUI(this),
      s = save.profile.settings;
    ui.html(
      `${header("Do seu jeito", "Controles e som")}<div class="settings-grid"><div class="card setting-row"><label for="left">Modo canhoto<small>Joystick à direita; turbo à esquerda.</small></label><input type="checkbox" id="left" ${s.leftHanded ? "checked" : ""}></div><div class="card setting-row"><label for="mute">Silenciar áudio</label><input type="checkbox" id="mute" ${s.muted ? "checked" : ""}></div><div class="card setting-row"><label for="sfx">Efeitos sonoros</label><input type="range" id="sfx" min="0" max="1" step="0.05" value="${s.sfxVolume}"></div><div class="card setting-row"><label for="music">Música<small>Volume reservado para trilhas futuras.</small></label><input type="range" id="music" min="0" max="1" step="0.05" value="${s.musicVolume}"></div><div class="card setting-row"><label for="haptics">Vibração<small>Em dispositivos Android compatíveis.</small></label><input type="checkbox" id="haptics" ${s.haptics ? "checked" : ""}></div><div class="card setting-row"><label for="motion">Reduzir efeitos visuais</label><input type="checkbox" id="motion" ${s.reducedMotion ? "checked" : ""}></div><article class="card"><b>No computador</b><p class="muted">WASD ou setas para virar. Shift para turbo. Escape ou espaço para pausar. Também é possível clicar e arrastar na arena.</p><b>No celular</b><p class="muted">Arraste no canto inferior do joystick e segure Turbo com o outro dedo. Você pode girar o celular durante a partida.</p><button id="tutorial" class="action secondary">Rever dicas na próxima partida</button><h2>Extras</h2><p class="muted">Desafios e conteúdo de coleção.</p><button id="rush" class="action gold">Coin Rush · 60 segundos</button><button id="collection" class="action secondary">Coleção e conquistas</button></article></div>`,
    );
    ui.on("#back", () => this.scene.start("Menu"));
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
    ui.on("#tutorial", () => {
      save.profile.hints = { joystick: false, turbo: false, shrink: false };
      void save.save();
      ui.toast("As dicas aparecerão na próxima partida.");
    });
    ui.on("#rush", () => this.scene.start("Game", { rushMode: true }));
    ui.on("#collection", () => this.scene.start("Collection"));
  }
}
