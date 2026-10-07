import Phaser from "phaser";
import { skins } from "../data/skins";
import { save } from "../systems/SaveSystem";
import { buySkin } from "../systems/EconomySystem";
import { ScreenUI, header, textureURL } from "../ui/ScreenUI";
export class ShopScene extends Phaser.Scene {
  constructor() {
    super("Shop");
  }
  create() {
    const ui = new ScreenUI(this),
      p = save.profile;
    ui.html(
      `${header("Coleção de skins", `Saldo: ${p.totalCoins} moedas`)}<div class="grid">${skins
        .map((s) => {
          const owned = p.unlockedSkins.includes(s.id),
            selected = p.selectedSkin === s.id,
            can = p.totalCoins >= s.price;
          return `<article class="card skin-card"><img src="${textureURL(this, `${s.id}-head`)}" alt="${s.name}"><div class="details"><h2>${s.name}</h2><p>${s.price ? s.price + " moedas" : "Grátis"}</p><button id="skin-${s.id}" class="action small ${selected || (!owned && !can) ? "secondary" : ""}" ${selected ? "disabled" : ""}>${selected ? "Selecionada" : owned ? "Usar" : can ? "Comprar" : "Saldo insuficiente"}</button></div></article>`;
        })
        .join("")}</div>`,
    );
    ui.on("#back", () => this.scene.start("Menu"));
    for (const s of skins)
      ui.on(`#skin-${s.id}`, () => {
        if (buySkin(p, s.id)) {
          void save.save();
          this.scene.restart();
        } else ui.toast("Junte mais moedas para esta skin.");
      });
  }
}
