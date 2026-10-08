import Phaser from "phaser";
import { missionsForProfile } from "../data/missions";
import { B } from "../data/balance";
import { save } from "../systems/SaveSystem";
import { updateMissionDay } from "../systems/MissionSystem";
import { ScreenUI, header } from "../ui/ScreenUI";
export class MissionsScene extends Phaser.Scene {
  constructor() {
    super("Missions");
  }
  create() {
    if (updateMissionDay(save.profile)) void save.save();
    const ui = new ScreenUI(this);
    const selectedMissions = missionsForProfile(save.profile.dailyMissionIds);
    const now = new Date();
    const nextReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeLeft = Math.max(0, nextReset.getTime() - now.getTime());
    const hours = Math.floor(timeLeft / 3_600_000), minutes = Math.floor((timeLeft % 3_600_000) / 60_000);
    ui.html(
      `${header("Missões do dia", `Novos desafios em ${hours}h ${minutes}min`)}<div class="grid">${selectedMissions
        .map((m) => {
          const e = save.profile.missions[m.id],
            ready = e.progress >= m.target,
            label = m.difficulty === "easy" ? "Fácil" : m.difficulty === "medium" ? "Média" : "Desafio";
          return `<article class="card mission"><span class="pill">${label}</span><h2>${m.title}</h2><p class="muted">${m.description}</p><div class="track"><i style="width:${Math.min(100, (100 * e.progress) / m.target)}%"></i></div><p class="muted">${Math.floor(e.progress)} / ${m.target}</p><p>${e.claimed ? "✓ Recompensa recebida" : ready ? `✓ Concluída · +${m.reward} moedas e +${B.xp.perMission} XP recebidos` : `Recompensa: ${m.reward} moedas + ${B.xp.perMission} XP`}</p></article>`;
        })
        .join("")}</div>`,
    );
    ui.on("#back", () => this.scene.start("Menu"));
  }
}
