import Phaser from "phaser";
import { missions } from "../data/missions";
import { save } from "../systems/SaveSystem";
import { ensureDay, claimMission } from "../systems/MissionSystem";
import { ScreenUI, header } from "../ui/ScreenUI";
export class MissionsScene extends Phaser.Scene {
  constructor() {
    super("Missions");
  }
  create() {
    ensureDay(save.profile);
    const ui = new ScreenUI(this);
    ui.html(
      `${header("Missões do dia", "Uma pequena conquista de cada vez")}<div class="grid">${missions
        .map((m) => {
          const e = save.profile.missions[m.id],
            ready = e.progress >= m.target;
          return `<article class="card mission"><h2>${m.title}</h2><p class="muted">${m.description}</p><div class="track"><i style="width:${(100 * e.progress) / m.target}%"></i></div><p class="muted">${Math.floor(e.progress)} / ${m.target}</p><button id="claim-${m.id}" class="action ${!ready || e.claimed ? "secondary" : ""}" ${!ready || e.claimed ? "disabled" : ""}>${e.claimed ? "Recompensa coletada" : ready ? "Coletar +" + m.reward : m.reward + " moedas de recompensa"}</button></article>`;
        })
        .join("")}</div>`,
    );
    ui.on("#back", () => this.scene.start("Menu"));
    for (const m of missions)
      ui.on(`#claim-${m.id}`, () => {
        if (claimMission(save.profile, m.id)) {
          void save.save();
          this.scene.restart();
        }
      });
  }
}
