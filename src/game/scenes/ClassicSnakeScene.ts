import Phaser from "phaser";
import { t } from "../services/LocalizationService";
import { stepSnake, turnSnake, type ClassicSnakeState, type SnakeDirection } from "../systems/ClassicSnakeSystem";
import { ScreenUI } from "../ui/ScreenUI";

const GRID = { width: 24, height: 30 };
const DIRECTIONS: Record<string, SnakeDirection> = {
  ArrowUp: "up", w: "up", ArrowRight: "right", d: "right",
  ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left",
};

export class ClassicSnakeScene extends Phaser.Scene {
  private state!: ClassicSnakeState;
  private graphics!: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private best = 0;
  private ui!: ScreenUI;
  private active = true;
  private turnedThisStep = false;

  constructor() { super("ClassicSnake"); }

  create() {
    this.best = Number(localStorage.getItem("coin-snake-classic-best") ?? 0) || 0;
    this.ui = new ScreenUI(this, "game-ui");
    this.ui.html(`<div class="classic-hud"><div><b>${t("classicMode")}</b><div id="classic-score">${t("classicScore", { score: 0, best: this.best })}</div></div><button class="action secondary small" id="classic-pause">${t("classicPause")}</button></div><div class="classic-mobile-controls" aria-label="${t("classicControls")}"><button data-direction="up" aria-label="${t("classicUp")}">▲</button><div><button data-direction="left" aria-label="${t("classicLeft")}">◀</button><button data-direction="down" aria-label="${t("classicDown")}">▼</button><button data-direction="right" aria-label="${t("classicRight")}">▶</button></div></div>`);
    this.ui.on("#classic-pause", () => this.togglePause());
    this.ui.root.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
      const setDirection = () => this.setDirection(button.dataset.direction as SnakeDirection);
      button.addEventListener("pointerdown", (event) => { event.preventDefault(); setDirection(); });
    });

    this.graphics = this.add.graphics();
    this.reset();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.input.keyboard?.on("keydown", this.onKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off("keydown", this.onKeyDown, this));
    this.layout();
  }

  private newState(): ClassicSnakeState {
    const x = Math.floor(GRID.width / 2), y = Math.floor(GRID.height / 2);
    return { ...GRID, body: [{ x, y }, { x: x - 1, y }, { x: x - 2, y }], direction: "right", food: { x: x + 4, y }, score: 0, over: false };
  }

  private reset() {
    this.state = this.newState();
    this.accumulator = 0;
    this.turnedThisStep = false;
    this.active = true;
    this.draw();
    this.ui.root.querySelector("#classic-overlay")?.remove();
  }

  private layout() {
    if (!this.graphics) return;
    const cell = Math.max(8, Math.floor(Math.min((this.scale.width - 32) / GRID.width, (this.scale.height - 130) / GRID.height)));
    const width = cell * GRID.width, height = cell * GRID.height;
    const left = Math.floor((this.scale.width - width) / 2), top = Math.floor((this.scale.height - height) / 2);
    this.graphics.setPosition(left, top);
    this.draw(cell, width, height);
  }

  private draw(cell = Math.max(8, Math.floor(Math.min((this.scale.width - 32) / GRID.width, (this.scale.height - 130) / GRID.height))), width = cell * GRID.width, height = cell * GRID.height) {
    if (!this.graphics || !this.state) return;
    const g = this.graphics;
    g.clear().fillStyle(0x102c27).fillRoundedRect(0, 0, width, height, 8).lineStyle(2, 0x7b9d71).strokeRoundedRect(0, 0, width, height, 8);
    g.lineStyle(1, 0x547264, 0.14);
    for (let x = 1; x < GRID.width; x++) g.lineBetween(x * cell, 0, x * cell, height);
    for (let y = 1; y < GRID.height; y++) g.lineBetween(0, y * cell, width, y * cell);
    g.fillStyle(0xffd166).fillRoundedRect(this.state.food.x * cell + 2, this.state.food.y * cell + 2, cell - 4, cell - 4, 4);
    this.state.body.forEach((part, index) => g.fillStyle(index ? 0x70d6a3 : 0xb4f28b).fillRoundedRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2, 5));
    const score = this.ui.root.querySelector<HTMLElement>("#classic-score");
    if (score) score.textContent = t("classicScore", { score: this.state.score, best: this.best });
  }

  update(_time: number, delta: number) {
    if (!this.active || this.state.over) return;
    this.accumulator += Math.min(delta, 100);
    const interval = Math.max(75, 145 - Math.floor(this.state.score / 5) * 8);
    while (this.accumulator >= interval && !this.state.over) {
      this.accumulator -= interval;
      stepSnake(this.state);
      this.turnedThisStep = false;
      if (this.state.score > this.best) {
        this.best = this.state.score;
        localStorage.setItem("coin-snake-classic-best", String(this.best));
      }
      this.draw();
    }
    if (this.state.over) this.showGameOver();
  }

  private setDirection(direction: SnakeDirection) {
    if (!this.active || this.state.over || this.turnedThisStep) return;
    const previousDirection = this.state.direction;
    turnSnake(this.state, direction);
    if (this.state.direction !== previousDirection) this.turnedThisStep = true;
  }
  private onKeyDown(event: KeyboardEvent) {
    const direction = DIRECTIONS[event.key] ?? DIRECTIONS[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); this.setDirection(direction); }
    else if (event.key === "Escape" || event.key === " ") { event.preventDefault(); this.togglePause(); }
  }

  private togglePause() {
    if (this.state.over) return;
    this.active = !this.active;
    if (this.active) this.ui.root.querySelector("#classic-overlay")?.remove();
    else this.showOverlay(t("classicPaused"), `<button class="action gold" id="classic-resume">${t("continue")}</button>`);
    this.ui.root.querySelector("#classic-resume")?.addEventListener("click", () => this.togglePause());
  }

  private showGameOver() {
    this.active = false;
    this.showOverlay(t("classicGameOver"), `<p>${t("classicScore", { score: this.state.score, best: this.best })}</p><button class="action gold" id="classic-restart">${t("restart")}</button><button class="action secondary" id="classic-menu">${t("pauseMenu")}</button>`);
    this.ui.root.querySelector("#classic-restart")?.addEventListener("click", () => this.reset());
    this.ui.root.querySelector("#classic-menu")?.addEventListener("click", () => this.scene.start("Menu"));
  }

  private showOverlay(title: string, content: string) {
    this.ui.root.querySelector("#classic-overlay")?.remove();
    const overlay = document.createElement("div"); overlay.id = "classic-overlay"; overlay.className = "classic-overlay";
    overlay.innerHTML = `<section class="card"><h2>${title}</h2>${content}</section>`; this.ui.root.append(overlay);
  }
}