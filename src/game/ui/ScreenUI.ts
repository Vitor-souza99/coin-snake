import Phaser from "phaser";
import { audio } from "../services/AudioService";
import { save } from "../systems/SaveSystem";
import { t } from "../services/LocalizationService";
export class ScreenUI {
  readonly root: HTMLElement;
  private timers: number[] = [];
  constructor(scene: Phaser.Scene, kind = "screen") {
    this.root = document.createElement("section");
    this.root.className = kind;
    this.root.dataset.scene = scene.scene.key;
    this.root.classList.toggle(
      "reduced-motion",
      save.profile.settings.reducedMotion,
    );
    document.querySelector("#ui")!.append(this.root);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }
  html(markup: string) {
    this.root.innerHTML = markup;
  }
  get<T extends HTMLElement = HTMLElement>(selector: string): T {
    const found = this.root.querySelector<T>(selector);
    if (!found) throw Error(`Missing UI element: ${selector}`);
    return found;
  }
  on(selector: string, action: () => void) {
    this.get(selector).addEventListener("click", () => {
      audio.play("click");
      action();
    });
  }
  toast(message: string) {
    this.root.querySelector(".toast")?.remove();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = message;
    t.setAttribute("role", "status");
    this.root.append(t);
    this.timers.push(window.setTimeout(() => t.remove(), 3500));
  }
  modal(
    title: string,
    body: string,
    actions: { label: string; run: () => void }[],
  ) {
    const layer = document.createElement("div");
    layer.className = "dialog-backdrop";
    layer.innerHTML =
      '<div class="dialog" role="dialog" aria-modal="true" tabindex="-1"><h2></h2><p></p><div class="dialog-actions"></div></div>';
    layer.querySelector("h2")!.textContent = title;
    layer.querySelector("p")!.textContent = body;
    const headingId = `dialog-${Math.random().toString(36).slice(2)}`;
    layer.querySelector("h2")!.id = headingId;
    layer
      .querySelector("[role=dialog]")!
      .setAttribute("aria-labelledby", headingId);
    actions.forEach((a, i) => {
      const b = document.createElement("button");
      b.className = `action ${i ? "secondary" : ""}`;
      b.textContent = a.label;
      b.addEventListener("click", () => {
        audio.play("click");
        a.run();
      });
      layer.querySelector(".dialog-actions")!.append(b);
    });
    layer.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const buttons = [...layer.querySelectorAll("button")];
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    this.root.append(layer);
    layer.querySelector("button")?.focus();
    return { destroy: () => layer.remove() };
  }
  destroy() {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
    this.root.remove();
  }
}
export function textureURL(scene: Phaser.Scene, id: string) {
  return scene.textures.getBase64(id);
}
export const action = (id: string, label: string, extra = "") =>
  `<button id="${id}" class="action ${extra}">${label}</button>`;
export const header = (title: string, kicker: string) =>
  `<header class="screen-header"><div><span class="kicker">${kicker}</span><h1>${title}</h1></div>${action("back", t("back"), "secondary small")}</header>`;
