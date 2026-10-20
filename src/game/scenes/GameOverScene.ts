import Phaser from "phaser";
import type { RunState } from "../types/game";
import { save } from "../systems/SaveSystem";
import { missions } from "../data/missions";
import { GameScene } from "./GameScene";
import { ads } from "../services/AdsService";
import { ScreenUI, action } from "../ui/ScreenUI";
import { pendingRunXP } from "../systems/EconomySystem";
export class GameOverScene extends Phaser.Scene {
  private run!: RunState;
  private busy = false;
  private ui!: ScreenUI;
  constructor() {
    super("GameOver");
  }
  init(data: { run: RunState }) {
    this.run = data.run;
    this.busy = false;
  }
  create() {
    const r = this.run,
      p = save.profile;
    this.ui = new ScreenUI(this);
    const ready = missions.filter(
      (m) =>
        p.missions[m.id]?.progress >= m.target && !p.missions[m.id]?.claimed,
    ).length;
    const collectionXP = r.coinXP + r.bossCoinXP;
    this.ui.html(
      `<div class="result-layout"><div class="result-hero"><span class="kicker">Cada volta conta</span><h1>${r.rushMode ? "Coin Rush concluído" : "Fim de jogo"}</h1><div class="big-score">${r.score}</div><span class="pill">Pontos · recorde ${p.bestScore}</span><p class="muted">${Math.floor(r.elapsed)}s de aventura · combo x${r.maxCombo}</p></div><div class="result-details"><div class="card"><b>◉ ${r.matchCoins} moedas coletadas</b><p class="muted">+${pendingRunXP(p, r)} XP ao finalizar${collectionXP ? `<br>+${r.coinXP} XP por moedas · +${r.bossCoinXP} XP por Boss Coins` : ""}<br>${r.turboUses} acelerações · ${r.shrinkFruits} frutas</p><p>${ready ? ready + " missão(ões) pronta(s) para resgate" : "Progresso nas missões atualizado"}</p></div>${!r.revived && ads.isRewardedAdReady() ? action("revive", "🎬 Assistir anúncio e reviver · 1 vez por partida", "gold") : '<p class="footnote">' + (r.revived ? "Revive já usado nesta partida." : "Anúncio premiado indisponível neste dispositivo.") + "</p>"}${action("again", "Jogar novamente")}${action("menu", "Voltar ao menu", "secondary")}<p class="footnote" id="save-status">Salvando moedas…</p></div></div>`,
    );
    this.ui.on("#again", () => this.leave("Game"));
    this.ui.on("#menu", () => this.leave("Menu"));
    if (this.ui.root.querySelector("#revive"))
      this.ui.on("#revive", () => {
        void this.revive();
      });
    void save.save().then(() => {
      if (this.ui.root.isConnected)
        this.ui.get("#save-status").textContent =
          save.error || "Moedas salvas no seu progresso.";
    });
  }
  private leave(next: string) {
    if (this.busy) return;
    const game = this.scene.get("Game") as GameScene;
    game.finalize();
    this.scene.stop("Game");
    this.scene.start(next);
  }
  private async revive() {
    if (this.busy || this.run.revived) return;
    this.busy = true;
    this.ui.get<HTMLButtonElement>("#revive").disabled = true;
    const ok = await ads.showRewardedAd("revive");
    if (!this.scene.isActive()) return;
    if (ok) {
      const game = this.scene.get("Game") as GameScene;
      game.revive();
      this.scene.resume("Game");
      this.scene.stop();
    } else {
      this.busy = false;
      this.ui.get<HTMLButtonElement>("#revive").disabled = false;
      this.ui.toast("Anúncio não disponível. Nenhuma vida foi concedida.");
    }
  }
}
