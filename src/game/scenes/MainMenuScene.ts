import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { B } from "../data/balance";
import { ScreenUI, action, textureURL } from "../ui/ScreenUI";
import { reconcileWorldUnlocks } from "../systems/WorldSystem";
import { worldById } from "../data/worlds";
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }
  create() {
    const p = save.profile,
      ui = new ScreenUI(this);
    reconcileWorldUnlocks(p);
    this.cameras.main.setBackgroundColor("#f6f5e6");
    const body = textureURL(this, `${p.selectedSkin}-body`),
      head = textureURL(this, `${p.selectedSkin}-head`);
    ui.html(
      `<div class="home"><div class="hero"><span class="kicker">Pequena cobra. Grande aventura.</span><h1>COIN<br>SNAKE</h1><div class="mascot" aria-hidden="true">${[body, body, body, body, head].map((src) => `<img src="${src}" alt="">`).join("")}</div><span class="pill">● ${worldById(p.selectedWorld).name}</span></div><div class="home-actions"><div class="card"><div class="wallet"><span>◉ ${p.totalCoins.toLocaleString("pt-BR")}</span><span>Nível ${p.playerLevel}</span></div><p class="muted">Recorde <b>${p.bestScore.toLocaleString("pt-BR")}</b> · XP ${p.xp % B.xp.perLevel}/${B.xp.perLevel}</p><div class="xp-track"><i style="width:${(100 * (p.xp % B.xp.perLevel)) / B.xp.perLevel}%"></i></div></div>${action("play", "JOGAR →", "play")}${action("worlds", `Mundos · ${worldById(p.selectedWorld).name}`, "secondary")}<div class="button-row">${action("shop", "Loja", "secondary")}${action("missions", "Missões", "gold")}</div>${action("settings", "Ajustar controles, som e extras", "secondary small")}<p class="footnote">Colete. Cresça. Encontre seu ritmo.<br>Moedas exclusivamente virtuais.</p></div></div>`,
    );
    ui.on("#play", () => this.scene.start("Game", { startWorld: p.selectedWorld }));
    ui.on("#worlds", () => this.scene.start("WorldSelect"));
    ui.on("#shop", () => this.scene.start("Shop"));
    ui.on("#missions", () => this.scene.start("Missions"));
    ui.on("#settings", () => this.scene.start("Settings"));
    if (save.error) ui.toast(save.error);
  }
}
