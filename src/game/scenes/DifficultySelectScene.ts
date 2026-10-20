import Phaser from "phaser";
import { save } from "../systems/SaveSystem";
import { ScreenUI, action, header } from "../ui/ScreenUI";
import { difficultyTips, formatDifficultyTipCount, t } from "../services/LocalizationService";
import type { GameDifficulty } from "../types/game";

export class DifficultySelectScene extends Phaser.Scene {
  constructor() {
    super("DifficultySelect");
  }

  create() {
    const ui = new ScreenUI(this);
    const data = (this.scene.settings.data ?? {}) as { rushMode?: boolean; startWorld?: string };
    const selected = save.profile.settings.gameDifficulty;
    let selectedDifficulty = selected;
    const tipIndexes: Record<GameDifficulty, number> = { easy: 0, normal: 0, hard: 0 };
    const option = (difficulty: GameDifficulty, title: string, help: string) =>
      `<button class="action ${selected === difficulty ? "gold" : "secondary"}" data-difficulty="${difficulty}" aria-pressed="${selected === difficulty}"><b>${title}</b><small>${help}</small></button>`;

    ui.html(`<div class="screen difficulty-select">${header(t("difficultyTitle"), t("difficultyKicker"))}<div class="settings-grid">${option("easy", t("difficultyEasy"), t("difficultyEasyHelp"))}${option("normal", t("difficultyNormal"), t("difficultyNormalHelp"))}${option("hard", t("difficultyHard"), t("difficultyHardHelp"))}</div><section class="difficulty-tip" aria-live="polite" aria-atomic="true"><div class="difficulty-tip__heading"><span class="difficulty-tip__icon" aria-hidden="true">✦</span><b>${t("difficultyTipTitle")}</b><span class="difficulty-tip__count" id="tip-count"></span></div><p id="tip-text"></p><button class="difficulty-tip__next" id="next-tip" type="button">${t("difficultyTipNext")} <span aria-hidden="true">↻</span></button></section>${action("start-run", t("startGame"), "play")}${action("cancel-run", t("cancel"), "secondary small")}</div>`);
    const updateTip = () => {
      const tips = difficultyTips(selectedDifficulty);
      ui.get<HTMLElement>("#tip-text").textContent = tips[tipIndexes[selectedDifficulty]];
      ui.get<HTMLElement>("#tip-count").textContent = formatDifficultyTipCount(tipIndexes[selectedDifficulty] + 1, tips.length);
    };
    updateTip();
    ui.on("#next-tip", () => {
      const tips = difficultyTips(selectedDifficulty);
      tipIndexes[selectedDifficulty] = (tipIndexes[selectedDifficulty] + 1) % tips.length;
      updateTip();
    });
    ui.root.querySelectorAll<HTMLButtonElement>("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => {
        const difficulty = button.dataset.difficulty as GameDifficulty;
        selectedDifficulty = difficulty;
        save.profile.settings.gameDifficulty = difficulty;
        void save.save();
        ui.root.querySelectorAll("[data-difficulty]").forEach((option) => {
          option.classList.toggle("gold", option === button);
          option.classList.toggle("secondary", option !== button);
          option.setAttribute("aria-pressed", String(option === button));
        });
        updateTip();
      });
    });
    ui.on("#start-run", () => {
      this.scene.start("Game", { ...data, gameDifficulty: save.profile.settings.gameDifficulty });
    });
    ui.on("#cancel-run", () => this.scene.start("Menu"));
    ui.on("#back", () => this.scene.start("Menu"));
  }
}