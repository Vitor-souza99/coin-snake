import Phaser from "phaser";
import { missionsForProfile } from "../data/missions";
import { B } from "../data/balance";
import { save } from "../systems/SaveSystem";
import { claimMission, updateMissionDay } from "../systems/MissionSystem";
import { ScreenUI, header } from "../ui/ScreenUI";
import { getLanguage, localizedMission } from "../services/LocalizationService";
import type { Mission } from "../data/missions";
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
    const pending = save.profile.pendingMissionRewards.map((token) => {
      const separator = token.indexOf(":");
      const day = token.slice(0, separator), id = token.slice(separator + 1);
      return { token, day, mission: missionsForProfile([id])[0] };
    }).filter((entry): entry is { token: string; day: string; mission: Mission } => Boolean(entry.mission));
    ui.html(
      `${header(getLanguage() === "en" ? "Daily Missions" : "Missões do dia", getLanguage() === "en" ? `New challenges in ${hours}h ${minutes}m` : `Novos desafios em ${hours}h ${minutes}min`)}${pending.length ? `<section class="card mission-pending"><h2>${getLanguage() === "en" ? "Unclaimed rewards" : "Recompensas pendentes"}</h2><div class="grid">${pending.map(({ token, day, mission }) => `<article class="card mission"><span class="pill">${getLanguage() === "en" ? "Ready to claim" : "Pronta para resgate"}</span><h2>${localizedMission(mission.id, "title", mission.title)}</h2><p>${getLanguage() === "en" ? `Completed on ${day}` : `Concluída em ${day}`}</p><p>${mission.reward} ${getLanguage() === "en" ? "coins" : "moedas"} + ${B.xp.perMission} XP</p><button class="action gold" data-claim="${token}">${getLanguage() === "en" ? "Claim reward" : "Receber recompensa"}</button></article>`).join("")}</div></section>` : ""}<div class="grid">${selectedMissions
        .map((m) => {
          const e = save.profile.missions[m.id],
            ready = e.progress >= m.target,
            label = getLanguage() === "en" ? m.difficulty === "easy" ? "Easy" : m.difficulty === "medium" ? "Medium" : "Challenge" : m.difficulty === "easy" ? "Fácil" : m.difficulty === "medium" ? "Média" : "Desafio";
          const en = getLanguage() === "en";
          return `<article class="card mission"><span class="pill">${label}</span><h2>${localizedMission(m.id, "title", m.title)}</h2><p class="muted">${localizedMission(m.id, "description", m.description)}</p><div class="track"><i style="width:${Math.min(100, (100 * e.progress) / m.target)}%"></i></div><p class="muted">${Math.floor(e.progress)} / ${m.target}</p><p>${e.claimed ? `✓ ${en ? "Reward claimed" : "Recompensa recebida"}` : ready ? `✓ ${en ? "Complete · reward ready" : "Concluída · resgate disponível"} · ${m.reward} ${en ? "coins" : "moedas"} + ${B.xp.perMission} XP` : `${en ? "Reward" : "Recompensa"}: ${m.reward} ${en ? "coins" : "moedas"} + ${B.xp.perMission} XP`}</p>${ready && !e.claimed ? `<button class="action gold" data-claim="${save.profile.missionDate}:${m.id}">${en ? "Claim reward" : "Receber recompensa"}</button>` : ""}</article>`;
        })
        .join("")}</div>`,
    );
    ui.root.querySelectorAll<HTMLButtonElement>("[data-claim]").forEach((button) => {
      button.addEventListener("click", () => {
        const token = button.dataset.claim ?? "";
        const separator = token.indexOf(":");
        if (separator < 0 || !claimMission(save.profile, token.slice(separator + 1), token.slice(0, separator))) return;
        void save.save();
        this.scene.restart();
      });
    });
    ui.on("#back", () => this.scene.start("Menu"));
  }
}
