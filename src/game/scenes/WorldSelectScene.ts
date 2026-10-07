import Phaser from "phaser";
import { worlds, worldById } from "../data/worlds";
import { save } from "../systems/SaveSystem";
import { reconcileWorldUnlocks, selectWorld, worldRequirementText, worldStatus } from "../systems/WorldSystem";
import { ScreenUI, action, header } from "../ui/ScreenUI";

export class WorldSelectScene extends Phaser.Scene {
  constructor() { super("WorldSelect"); }

  create() {
    const ui = new ScreenUI(this);
    reconcileWorldUnlocks(save.profile);
    this.cameras.main.setBackgroundColor("#f6f5e6");
    const cards = worlds.map((world) => {
      const status = worldStatus(world, save.profile, save.profile.selectedWorld);
      const label = status === "PREMIUM_LOCKED" ? "PREMIUM · EM BREVE" : status === "COMING_SOON" ? "EM BREVE" : status === "LOCKED" ? "BLOQUEADO" : status === "SELECTED" ? "SELECIONADO" : "DISPONÍVEL";
      const disabled = status === "LOCKED" || status === "PREMIUM_LOCKED" || status === "COMING_SOON";
      return `<article class="card" style="border-color:#${world.accent.toString(16).padStart(6, "0")}"><div aria-hidden="true" style="height:72px;border-radius:14px;background:linear-gradient(135deg,#${world.background.toString(16).padStart(6, "0")},#${world.ground.toString(16).padStart(6, "0")});border:4px solid #${world.accent.toString(16).padStart(6, "0")}"></div><h2>${world.name}</h2><p>${world.description}</p><p class="muted">${world.previewDescription}</p><p><b>${label}</b></p><p class="muted">${worldRequirementText(world, save.profile)}</p><p class="muted">${world.specialMechanic}</p><p class="muted">Recompensas: ${world.rewards.join(", ") || "Conteúdo futuro"}</p><button class="action ${disabled ? "secondary" : "play"}" data-world="${world.id}" ${disabled ? "disabled" : ""}>${status === "SELECTED" ? "JOGAR NESTE MUNDO" : "SELECIONAR E JOGAR"}</button></article>`;
    }).join("");
    ui.html(`<div class="screen">${header("Mundos", "PROGRESSÃO E EXPLORAÇÃO")}<p class="muted">Desbloqueie mundos jogando. Os mundos Premium são apenas prévias; não há compra real.</p><div class="collection-grid">${cards}</div>${action("back", "← Voltar", "secondary small")}</div>`);
    ui.root.querySelectorAll<HTMLButtonElement>("[data-world]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.world;
        if (!id || !selectWorld(id)) {
          ui.toast("Este mundo ainda está bloqueado.");
          return;
        }
        this.scene.start("Game", { startWorld: worldById(id).id });
      });
    });
    ui.on("#back", () => this.scene.start("Menu"));
  }
}