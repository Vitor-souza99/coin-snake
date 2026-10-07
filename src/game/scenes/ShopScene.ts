import Phaser from "phaser";
import { skins, skinRarities, skinUnlockStatus, type SkinRarity } from "../data/skins";
import { save } from "../systems/SaveSystem";
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { ScreenUI, header, textureURL } from "../ui/ScreenUI";
export class ShopScene extends Phaser.Scene {
  constructor() {
    super("Shop");
  }
  create() {
    const ui = new ScreenUI(this),
      p = save.profile;
    const render = (filter: "ALL" | "OWNED" | "LOCKED", rarity: SkinRarity | "ALL" = "ALL") => {
      const list = skins.filter((s) => (filter === "ALL" || (filter === "OWNED" ? p.unlockedSkins.includes(s.id) : !p.unlockedSkins.includes(s.id))) && (rarity === "ALL" || s.rarity === rarity));
      ui.html(`${header("Coleção de skins", `Saldo: ${p.totalCoins.toLocaleString("pt-BR")} moedas`)}
        <div class="skin-filters" role="group" aria-label="Filtrar coleção">
          <button class="action small" id="filter-all">ALL</button><button class="action small secondary" id="filter-owned">OWNED</button><button class="action small secondary" id="filter-locked">LOCKED</button>
          <select id="filter-rarity" aria-label="Filtrar por raridade"><option value="ALL">Todas as raridades</option>${skinRarities.map((r) => `<option value="${r}" ${rarity === r ? "selected" : ""}>${r}</option>`).join("")}</select>
        </div>
        <div class="grid">${list.map((s) => {
          const owned = p.unlockedSkins.includes(s.id), selected = p.selectedSkin === s.id;
          const status = skinUnlockStatus(s, p);
          const premium = s.unlockType === "PREMIUM";
          const price = s.unlockType === "COINS" ? `${s.coinPrice?.toLocaleString("pt-BR")} COINS` : status.label;
          return `<article class="card skin-card rarity-card rarity-${s.rarity.toLowerCase()}" data-skin="${s.id}" tabindex="0" role="button" aria-label="Visualizar ${s.name}, ${s.rarity}">
            <img src="${textureURL(this, `${s.id}-preview-head`)}" alt="Preview de ${s.name}">
            <div class="details"><h2>${s.name}</h2><span class="skin-rarity rarity-${s.rarity.toLowerCase()}">${s.rarity}</span><p>${premium ? "🔒 PREMIUM · EM BREVE" : owned ? selected ? "✓ EQUIPADA" : "✓ OWNED" : price}</p>
            <button class="action small secondary" data-view="${s.id}">VIEW</button></div></article>`;
        }).join("")}</div>`);
      ui.on("#back", () => this.scene.start("Menu"));
      for (const button of ui.root.querySelectorAll<HTMLElement>("[data-view]"))
        button.addEventListener("click", (event) => { event.stopPropagation(); this.preview(button.dataset.view!); });
      for (const card of ui.root.querySelectorAll<HTMLElement>("[data-skin]")) {
        card.addEventListener("click", () => this.preview(card.dataset.skin!));
        card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); this.preview(card.dataset.skin!); } });
      }
      ui.on("#filter-all", () => render("ALL", rarity));
      ui.on("#filter-owned", () => render("OWNED", rarity));
      ui.on("#filter-locked", () => render("LOCKED", rarity));
      ui.get<HTMLSelectElement>("#filter-rarity").addEventListener("change", (event) => render(filter, (event.target as HTMLSelectElement).value as SkinRarity | "ALL"));
    };
    render("ALL");
  }
  private preview(id: string) { audio.play("click"); haptic("coin"); this.scene.start("SkinPreview", { skinId: id }); }
}
