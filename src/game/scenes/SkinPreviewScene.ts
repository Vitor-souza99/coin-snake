import Phaser from "phaser";
import { getSkin, skinUnlockStatus, type SkinDefinition } from "../data/skins";
import { save } from "../systems/SaveSystem";
import { buySkin } from "../systems/EconomySystem";
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { ScreenUI, header } from "../ui/ScreenUI";

export class SkinPreviewScene extends Phaser.Scene {
  private skin!: SkinDefinition;
  private ui!: ScreenUI;
  private sprites: Phaser.GameObjects.Image[] = [];
  private effects!: Phaser.GameObjects.Graphics;
  private mode: "normal" | "turbo" | "victory" = "normal";
  private elapsed = 0;

  constructor() { super("SkinPreview"); }

  init(data: { skinId: string }) {
    this.skin = getSkin(data.skinId) ?? getSkin("classic")!;
    this.mode = "normal";
    this.elapsed = 0;
  }

  create() {
    const profile = save.profile;
    const ownership = skinUnlockStatus(this.skin, profile);
    const isPremium = this.skin.unlockType === "PREMIUM";
    this.ui = new ScreenUI(this, "screen skin-preview-screen");
    this.ui.html(`${header("Preview da skin", "Veja todos os detalhes · cosmético")}
      <section class="skin-preview-layout">
        <div class="skin-preview-stage" aria-label="Preview animado da cobrinha">
          <div class="skin-preview-canvas" id="skin-preview-canvas" aria-hidden="true"></div>
          <div class="skin-preview-controls" id="skin-preview-controls">
            <button class="action small" id="preview-normal">Normal</button>
            <button class="action small secondary" id="preview-turbo">Turbo</button>
            ${this.skin.previewConfig.showVictory ? '<button class="action small secondary" id="preview-victory">Vitória</button>' : ""}
          </div>
        </div>
        <article class="card skin-preview-info">
          <span class="skin-rarity rarity-${this.skin.rarity.toLowerCase()}">${this.skin.rarity}</span>
          <h2>${this.skin.name}</h2>
          <p class="muted">${this.skin.description}</p>
          <p><b>Família:</b> ${this.skin.family === "dragon" ? "Dragon Collection" : this.skin.family}</p>
          <p><b>Desbloqueio:</b> ${isPremium ? "🔒 PREMIUM" : ownership.label}</p>
          ${isPremium ? '<p class="muted">Premium — disponível futuramente. Sua aparência e efeitos podem ser visualizados, mas não equipados.</p>' : `<p class="muted">${ownership.unlocked ? "Disponível na sua coleção." : `Requisito: ${ownership.label}.`}</p>`}
          <div class="skin-preview-actions" id="skin-preview-actions"></div>
        </article>
      </section>`);

    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    const canvas = this.ui.get<HTMLElement>("#skin-preview-canvas");
    const portrait = this.scale.height >= this.scale.width;
    const width = Math.min(this.scale.width - 32, 680);
    const height = Math.min(portrait ? Math.min(390, Math.max(220, this.scale.height * 0.3)) : Math.min(360, Math.max(220, this.scale.height * 0.5)), Math.max(120, this.scale.height * 0.44));
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height * (portrait ? 0.38 : 0.42);
    this.previewPanel = this.add.rectangle(centerX, centerY, width, height, 0xf1f3e1).setStrokeStyle(2, 0xd5dec4).setDepth(-1);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.createPreview(width, height, centerX, centerY);
    const resize = () => {
      const w = Math.min(this.scale.width - 32, 680);
      const h = Math.min(
        this.scale.height >= this.scale.width
          ? Math.min(390, Math.max(220, this.scale.height * 0.3))
          : Math.min(360, Math.max(220, this.scale.height * 0.5)),
        Math.max(120, this.scale.height * 0.44),
      );
      const x = this.scale.width / 2;
      const y = this.scale.height * (this.scale.height >= this.scale.width ? 0.38 : 0.42);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      this.previewPanel.setPosition(x, y).setSize(w, h);
      this.createPreview(w, h, x, y);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, resize));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sprites.forEach((sprite) => sprite.destroy());
      this.effects?.destroy();
      this.previewPanel?.destroy();
    });
    this.renderAction();
    this.ui.on("#back", () => this.close());
    this.ui.on("#preview-normal", () => this.setMode("normal"));
    this.ui.on("#preview-turbo", () => this.setMode("turbo"));
    if (this.skin.previewConfig.showVictory)
      this.ui.on("#preview-victory", () => this.setMode("victory"));
  }

  private createPreview(width: number, height: number, centerX: number, centerY: number) {
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites = [];
    this.effects?.destroy();
    this.effects = this.add.graphics().setDepth(1);
    const count = this.skin.previewConfig.segments;
    // Keep the head at index 0: update() animates from the head toward the tail.
    for (let index = 0; index < count; index++) {
      const head = index === 0;
      const texture = head ? `${this.skin.id}-preview-head` : `${this.skin.id}-preview-body`;
      const fallback = head ? `${this.skin.id}-head` : `${this.skin.id}-body`;
      const image = this.add.image(0, 0, this.textures.exists(texture) ? texture : fallback)
        .setScale(head ? 0.72 : 0.61).setDepth(2 + count - index);
      this.sprites.push(image);
    }
    this.previewWidth = width;
    this.previewCenterX = centerX;
    this.previewCenterY = centerY;
    this.previewHeight = height;
  }

  private previewWidth = 360;
  private previewHeight = 280;
  private previewCenterX = 360;
  private previewCenterY = 350;
  private previewPanel!: Phaser.GameObjects.Rectangle;
  update(_time: number, delta: number) {
    if (!this.sprites.length) return;
    this.elapsed += Math.min(delta / 1000, 0.05);
    const speed = this.skin.previewConfig.speed * (this.mode === "turbo" ? 1.8 : 1);
    const cx = this.previewCenterX;
    const cy = this.previewCenterY;
    const rx = Math.min(this.previewWidth * 0.34, 190);
    const ry = Math.min(this.previewHeight * 0.3, 100);
    const phase = this.elapsed * speed;
    const spacing = 0.13;
    const pointAt = (angle: number) => ({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle * 2) * ry,
    });
    this.effects.clear();
    this.effects.lineStyle(14, this.skin.dark, 0.16).beginPath();
    for (let index = 0; index < this.sprites.length; index++) {
      const point = pointAt(phase - index * spacing);
      if (index === 0) this.effects.moveTo(point.x, point.y);
      else this.effects.lineTo(point.x, point.y);
    }
    this.effects.strokePath();
    if (this.skin.trailConfig.enabled) {
      this.effects.lineStyle(
        this.skin.trailConfig.width,
        this.skin.trailConfig.color,
        this.mode === "turbo" ? 0.78 : 0.38,
      ).beginPath();
      for (let index = 0; index < this.sprites.length; index++) {
        const point = pointAt(phase - index * spacing);
        if (index === 0) this.effects.moveTo(point.x, point.y);
        else this.effects.lineTo(point.x, point.y);
      }
      this.effects.strokePath();
    }
    for (let index = 0; index < this.sprites.length; index++) {
      const angle = phase - index * spacing;
      const point = pointAt(angle);
      const nextPoint = pointAt(angle + 0.001);
      const sprite = this.sprites[index];
      sprite
        .setPosition(point.x, point.y)
        .setRotation(Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x));
      const pulse = this.skin.visualConfig.animation === "pulse"
        ? 1 + Math.sin(this.elapsed * 3 - index * 0.4) * 0.06
        : 1;
      const breathe = this.skin.visualConfig.animation === "float"
        ? 1 + Math.sin(this.elapsed * 2 - index * 0.28) * 0.035
        : 1;
      sprite.setScale((index === 0 ? 0.76 : 0.63) * pulse * breathe);
      if (this.skin.visualConfig.glow > 0) sprite.setTint(this.skin.color);
    }
    if (this.mode === "turbo" || this.mode === "victory") {
      const effectColor = this.mode === "turbo" ? this.skin.trailConfig.color : this.skin.particleConfig.color;
      for (let index = 0; index < Math.min(10, this.sprites.length); index++) {
        const angle = phase * 1.3 + index * 2.4;
        const x = cx + Math.cos(angle) * (rx + 18 + index % 3 * 7);
        const y = cy + Math.sin(angle * 1.5) * (ry + 12);
        this.effects.fillStyle(effectColor, 0.65).fillCircle(x, y, 2 + index % 3);
      }
    }
  }

  private renderAction() {
    const container = this.ui.get("#skin-preview-actions");
    const p = save.profile;
    const owned = p.unlockedSkins.includes(this.skin.id);
    const selected = p.selectedSkin === this.skin.id;
    const status = skinUnlockStatus(this.skin, p);
    if (this.skin.unlockType === "PREMIUM") {
      container.innerHTML = '<button class="action secondary" disabled>PREMIUM — EM BREVE</button>';
      return;
    }
    if (selected) {
      container.innerHTML = '<button class="action secondary" disabled>EQUIPADA</button>';
      return;
    }
    if (owned || status.unlocked) {
      container.innerHTML = '<button class="action" id="equip-skin">EQUIPAR</button>';
      container.querySelector("#equip-skin")?.addEventListener("click", () => {
        if (!buySkin(p, this.skin.id)) return;
        void save.save();
        audio.play("click");
        haptic("power");
        this.scene.stop();
        this.scene.start("Shop");
      });
      return;
    }
    if (this.skin.unlockType === "COINS") {
      const canAfford = p.totalCoins >= (this.skin.coinPrice ?? Number.MAX_SAFE_INTEGER);
      container.innerHTML = `<button class="action" id="buy-skin" ${canAfford ? "" : "disabled"}>COMPRAR — ${this.skin.coinPrice?.toLocaleString("pt-BR")} COINS</button>`;
      container.querySelector("#buy-skin")?.addEventListener("click", () => {
        if (!buySkin(p, this.skin.id)) return;
        void save.save(); audio.play("power"); haptic("power");
        this.scene.stop(); this.scene.start("Shop");
      });
      return;
    }
    container.innerHTML = `<button class="action secondary" disabled>🔒 ${status.label.toUpperCase()}</button>`;
  }

  private setMode(mode: "normal" | "turbo" | "victory") {
    this.mode = mode;
    audio.play(mode === "normal" ? "click" : "power");
    const ids = ["preview-normal", "preview-turbo", "preview-victory"];
    ids.forEach((id) => this.ui.root.querySelector(`#${id}`)?.classList.toggle("secondary", id !== `preview-${mode}`));
  }

  private close() {
    this.scene.stop();
    this.scene.start("Shop");
  }
}