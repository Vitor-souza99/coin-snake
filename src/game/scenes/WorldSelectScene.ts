import Phaser from "phaser";
import { worlds } from "../data/worlds";
import { save } from "../systems/SaveSystem";
import { reconcileWorldUnlocks, selectWorld, worldRequirementText, worldStatus } from "../systems/WorldSystem";
import { ScreenUI, action, header } from "../ui/ScreenUI";

export class WorldSelectScene extends Phaser.Scene {
  constructor() { super("WorldSelect"); }

  create() {
    const ui = new ScreenUI(this);
    reconcileWorldUnlocks(save.profile);
    this.cameras.main.setBackgroundColor("#f6f5e6");
    const nextWorld = worlds.find((world) => world.category !== "SECRET" && world.unlockType !== "PREMIUM" && world.isImplemented && worldStatus(world, save.profile) === "LOCKED");
    const cards = worlds.filter((world) => world.category !== "SECRET").map((world) => {
      const status = worldStatus(world, save.profile, save.profile.selectedWorld);
      const label = status === "PREMIUM_LOCKED" ? "PREMIUM · EM BREVE" : status === "COMING_SOON" ? "EM BREVE" : status === "LOCKED" ? "BLOQUEADO" : status === "SELECTED" ? "SELECIONADO" : "DISPONÍVEL";
      const disabled = status === "LOCKED" || status === "PREMIUM_LOCKED" || status === "COMING_SOON";
      const featured = status === "SELECTED";
      const isNext = nextWorld?.id === world.id;
      const requirement = worldRequirementText(world, save.profile);
      const detailsId = `world-details-${world.id}`;
      const badge = featured ? "SEU MUNDO" : isNext ? "PRÓXIMA ETAPA" : label;
      const badgeClass = featured ? "selected" : isNext ? "next" : disabled ? "locked" : "available";
      const rewards = world.rewards.length ? world.rewards.join(" · ") : "Conteúdo futuro";
      return `<article class="world-nav-card ${featured ? "is-selected" : ""} ${disabled ? "is-locked" : ""}" style="--world-accent:#${world.accent.toString(16).padStart(6, "0")};--world-bg:#${world.background.toString(16).padStart(6, "0")};--world-ground:#${world.ground.toString(16).padStart(6, "0")}" aria-labelledby="world-title-${world.id}">
        <div class="world-nav-art" aria-hidden="true"><span class="world-nav-art__symbol">${world.visualTheme === "ocean" ? "≈" : world.visualTheme === "candy" ? "✿" : world.visualTheme === "desert" ? "☼" : world.visualTheme === "ice" ? "❄" : world.visualTheme === "space" ? "✦" : "❋"}</span><span class="world-nav-art__badge ${badgeClass}">${badge}</span></div>
        <div class="world-nav-content"><div class="world-nav-title-row"><h2 id="world-title-${world.id}">${world.name}</h2><span class="world-nav-step">${String(worlds.filter((item) => item.category !== "SECRET").indexOf(world) + 1).padStart(2, "0")}</span></div>
        <p class="world-nav-description">${world.description}</p>
        <p class="world-nav-requirement ${disabled ? "is-pending" : ""}">${disabled ? "🔒 " : "✓ "}${requirement}</p>
        <button class="world-nav-details" type="button" aria-expanded="false" aria-controls="${detailsId}">Detalhes do mundo <span aria-hidden="true">⌄</span></button>
        <div class="world-nav-extra" id="${detailsId}" hidden><p>${world.previewDescription}</p><p><b>Mecânica:</b> ${world.specialMechanic}</p><p><b>Recompensas:</b> ${rewards}</p></div>
        <button class="action world-nav-action ${featured ? "secondary" : disabled ? "secondary" : "play"}" data-world="${world.id}" ${disabled || featured ? "disabled" : ""}>${featured ? "MUNDO ATUAL" : disabled ? "AINDA BLOQUEADO" : "JOGAR NESTE MUNDO →"}</button></div></article>`;
    }).join("");
    const unlockedCount = worlds.filter((world) => world.category !== "SECRET" && world.isImplemented && worldStatus(world, save.profile) !== "LOCKED" && worldStatus(world, save.profile) !== "PREMIUM_LOCKED").length;
    const worldCount = worlds.filter((world) => world.category !== "SECRET" && world.unlockType !== "PREMIUM").length;
    const nextLabel = nextWorld ? `Próximo: ${nextWorld.name}` : "Você explorou todos os mundos disponíveis!";
    const nextRequirement = nextWorld ? worldRequirementText(nextWorld, save.profile) : "";
    ui.html(`<div class="screen world-navigation">${header("Mundos", "PROGRESSÃO E EXPLORAÇÃO")}<section class="world-progress" aria-label="Progresso da exploração"><div class="world-progress__copy"><span>JORNADA</span><strong>${unlockedCount} de ${worldCount} mundos</strong></div><div class="world-progress__track" role="progressbar" aria-label="Mundos disponíveis" aria-valuemin="0" aria-valuemax="${worldCount}" aria-valuenow="${unlockedCount}"><i style="width:${Math.round(unlockedCount / worldCount * 100)}%"></i></div><p>${nextLabel}${nextRequirement ? `<span> · ${nextRequirement}</span>` : ""}</p></section><p class="muted world-navigation__note">Escolha um mundo disponível para começar sua aventura por lá.</p><div class="world-nav-grid">${cards}</div>${action("back", "← Voltar", "secondary small")}</div>`);
    ui.root.querySelectorAll<HTMLButtonElement>("[data-world]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.world;
        if (!id || !selectWorld(id)) {
          ui.toast("Este mundo ainda está bloqueado.");
          return;
        }
        this.scene.start("Menu");
      });
    });
    ui.root.querySelectorAll<HTMLButtonElement>(".world-nav-details").forEach((button) => {
      button.addEventListener("click", () => {
        const details = ui.get<HTMLElement>(`#${button.getAttribute("aria-controls")}`);
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        details.hidden = expanded;
        button.querySelector("span")!.textContent = expanded ? "⌄" : "⌃";
      });
    });
    ui.on("#back", () => this.scene.start("Menu"));
  }
}