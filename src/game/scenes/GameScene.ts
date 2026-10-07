import Phaser from "phaser";
import { B } from "../data/balance";
import { Snake } from "../entities/Snake";
import { Coin } from "../entities/Coin";
import { Obstacle } from "../entities/Obstacle";
import { PowerUp } from "../entities/PowerUp";
import { ComboSystem } from "../systems/ComboSystem";
import { PowerUpSystem } from "../systems/PowerUpSystem";
import { difficulty } from "../systems/DifficultySystem";
import { save } from "../systems/SaveSystem";
import { creditCoins, finishRun } from "../systems/EconomySystem";
import { reportRun } from "../systems/MissionSystem";
import { newRun, type RunState, type Point } from "../types/game";
import { clamp, distance } from "../utils/math";

import { C, text } from "../ui/Theme";
import { ScreenUI } from "../ui/ScreenUI";
import { GameplayHUD } from "../ui/GameplayHUD";
import { FloatingJoystick } from "../ui/FloatingJoystick";
import { TurboButton } from "../ui/TurboButton";
import { observeLayout } from "../systems/LayoutSystem";
import { TurboSystem } from "../systems/TurboSystem";
import { SteeringSystem } from "../systems/SteeringSystem";
import { shrunkLength, shrinkCooldown } from "../systems/ShrinkSystem";
import { ShrinkFruit } from "../entities/ShrinkFruit";
import { controls, shrinkConfig, turboConfig } from "../data/controls";
import { addXP } from "../systems/EconomySystem";
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { worldById } from "../data/worlds";
import { bosses, type BossDefinition } from "../data/bosses";
import { PortalSystem } from "../systems/PortalSystem";
import { awardAchievement } from "../systems/AchievementSystem";
import { analytics } from "../services/AnalyticsService";
export class GameScene extends Phaser.Scene {
  snake!: Snake;
  run!: RunState;
  private combo!: ComboSystem;
  private powers!: PowerUpSystem;
  private coins: Coin[] = [];
  private obstacles: Obstacle[] = [];
  private power?: PowerUp;
  private sprites: Phaser.GameObjects.Image[] = [];
  private ring!: Phaser.GameObjects.Graphics;
  private hud!: GameplayHUD;
  private ui!: ScreenUI;
  private joystick!: FloatingJoystick;
  private turboButton!: TurboButton;
  private turbo!: TurboSystem;
  private steering!: SteeringSystem;
  private fruit!: ShrinkFruit;
  private shrinkTimer = 0;
  private cameraX = 0;
  private cameraY = 0;
  private lastOrientation: boolean | undefined;
  private pauseKind: "pause" | "tutorial" = "pause";
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private aim: Point | null = null;
  private countdown = 0;
  private accumulator = 0;
  private halted = false;
  private dead = false;
  private overlay?: { destroy: () => void };
  private currentWorld = "green-valley";
  private portalSystem = new PortalSystem();
  private worldPortal?: Phaser.GameObjects.Container;
  private bossPortal?: Phaser.GameObjects.Container;
  private boss?: { definition: BossDefinition; health: number; phase: number; attack: number; speed: number; image: Phaser.GameObjects.Container };
  private bossHud?: HTMLElement;
  private bossEnergyHud?: HTMLElement;
  private petSprite?: Phaser.GameObjects.Container;
  private rushMode = false;
  private nextPortalAt = 35;
  private bossDefinition?: BossDefinition;
  private returnPortalAt = 0;
  private worldSpeedMultiplier = 1;
  private masteryCredited = false;
  constructor() {
    super("Game");
  }
  create() {
    const initData = (this.scene.settings.data ?? {}) as { rushMode?: boolean };
    this.rushMode = initData.rushMode ?? false;
    this.nextPortalAt = 35;
    this.returnPortalAt = 0;
    this.currentWorld = "green-valley";
    this.worldSpeedMultiplier = worldById(this.currentWorld).speedMultiplier;
    this.masteryCredited = false;
    this.worldPortal = undefined;
    this.bossPortal = undefined;
    this.boss = undefined;
    this.bossDefinition = undefined;
    this.petSprite?.destroy();
    this.petSprite = undefined;
    this.snake = new Snake();
    this.snake.reset(700, 750);
    this.turbo = new TurboSystem();
    this.steering = new SteeringSystem();
    this.shrinkTimer = shrinkCooldown();
    this.lastOrientation = undefined;
    this.cameraX = this.snake.x;
    this.cameraY = this.snake.y;
    this.run = newRun();
    this.run.rushMode = this.rushMode;
    this.combo = new ComboSystem();
    this.powers = new PowerUpSystem();
    this.coins = [];
    this.obstacles = [];
    this.power = undefined;
    this.sprites = [];
    this.aim = null;
    this.countdown = B.power.interval;
    this.accumulator = 0;
    this.halted = false;
    this.dead = false;
    this.overlay = undefined;
    this.cameras.main.setBackgroundColor(worldById(this.currentWorld).background);
    const a = B.arena,
      g = this.add.graphics();
    g.fillStyle(0x9ac582).fillRoundedRect(
      a.left - 5,
      a.top - 5,
      a.right - a.left + 10,
      a.bottom - a.top + 10,
      30,
    );
    g.fillStyle(worldById(this.currentWorld).ground).fillRoundedRect(
      a.left,
      a.top,
      a.right - a.left,
      a.bottom - a.top,
      24,
    );
    for (let i = 0; i < 650; i++) {
      const x = a.left + 22 + ((i * 73) % (a.right - a.left - 44)),
        y = a.top + 22 + ((i * 137) % (a.bottom - a.top - 44));
      g.fillStyle(i % 3 ? 0xbbd09e : 0xcbdca9, 0.55).fillEllipse(
        x,
        y,
        5 + (i % 4),
        3,
      );
    }
    this.coins = Array.from(
      { length: B.difficulty.maxCoins },
      () => new Coin(this),
    );
    for (let i = 0; i < B.difficulty.initialObstacles; i++)
      this.spawnObstacle(true);
    this.fillCoins(B.difficulty.initialCoins);
    const skin = save.profile.selectedSkin;
    for (let i = 0; i < B.snake.max; i++)
      this.sprites.push(
        this.add
          .image(360, 690, `${skin}-${i === 0 ? "head" : "body"}`)
          .setScale(i === 0 ? 0.65 : 0.6)
          .setVisible(i < this.snake.length)
          .setDepth(20 + (B.snake.max - i) * 0.01),
      );
    this.ring = this.add.graphics().setDepth(24);
    this.ui = new ScreenUI(this, "game-ui");
    this.ui.root.classList.toggle(
      "left-handed",
      save.profile.settings.leftHanded,
    );
    if (this.rushMode) this.ui.root.classList.add("rush-mode");
    this.ui.html(
      `<div class="hud"><div class="hud-stats"><div><span class="hud-label">PONTOS</span><b class="hud-value" id="score">0</b></div><div><span class="hud-label">MOEDAS</span><b class="hud-value" id="coins">0</b></div><div><span class="hud-label">COMBO</span><b class="hud-value" id="combo">×1</b></div></div><div id="lives" class="lives-indicator" aria-label="Vidas restantes">♥ 2</div><button id="pause" class="action small pause-button">Pausa</button></div><div id="effects" class="effects">${this.rushMode ? "COIN RUSH · 60 s" : "Colete moedas. Evite obstáculos."}</div><div class="world-tag" id="world-tag">${this.rushMode ? "COIN RUSH" : "GREEN VALLEY"}</div><div id="boss-hud" class="effects" hidden></div><div id="joystick" class="joystick-zone" aria-label="Área do joystick"></div><div class="turbo-control"><button id="turbo" class="turbo-button" aria-label="Segure para acelerar">ϟ TURBO</button><div class="track"><i id="turbo-bar" style="width:100%"></i></div><small id="turbo-value">100 / 100</small></div>`,
    );
    if (save.profile.selectedPet) {
      const petGraphic = this.add.graphics();
      const petColor = save.profile.selectedPet === "bee" ? 0xffd84d : 0xe783d0;
      petGraphic.fillStyle(petColor).fillCircle(0, 0, 12);
      petGraphic.lineStyle(2, 0xffffff).strokeCircle(0, 0, 12);
      if (save.profile.selectedPet === "bee") petGraphic.lineStyle(2, 0xffffff).lineBetween(-17, -8, -9, -3).lineBetween(9, -3, 17, -8);
      this.petSprite = this.add.container(this.snake.x, this.snake.y + 28, [petGraphic]).setDepth(25);
    }
    this.ui.on("#pause", () => this.requestPause());
    this.hud = new GameplayHUD(this.ui);
    this.bossHud = this.ui.get("#boss-hud");
    this.bossEnergyHud = this.ui.get("#effects");
    this.joystick = new FloatingJoystick(this.ui.get("#joystick"));
    this.turboButton = new TurboButton(
      this.ui.get<HTMLButtonElement>("#turbo"),
    );
    this.fruit = new ShrinkFruit(this);
    this.events.on("coinCollected", this.collectCoin, this);
    if (import.meta.env.DEV) this.installDebug();
    analytics.track("gameStarted", { mode: this.rushMode ? "coin-rush" : "normal" });
    this.particles = this.add
      .particles(0, 0, "spark", {
        emitting: false,
        speed: { min: 30, max: 120 },
        lifespan: 450,
        scale: { start: 1, end: 0 },
        quantity: 8,
        maxParticles: 80,
      })
      .setDepth(30);
    this.keys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC,SPACE,SHIFT",
    ) as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "SPACE"]);
    const point = (p: Phaser.Input.Pointer) => {
      if (!this.halted && !this.dead && p.y > 100) {
        const world = this.cameras.main.getWorldPoint(p.x, p.y);
        this.aim = { x: world.x, y: world.y };
      }
    };
    this.input.on("pointerdown", point);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) point(p);
    });
    this.input.on("pointerup", () => {
      this.aim = null;
    });
    const onHide = () => {
      if (document.hidden) this.requestPause();
    };
    const onBlur = () => this.requestPause();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
      this.joystick.destroy();
      this.turboButton.destroy();
      audio.setTurbo(false);
      this.events.off("coinCollected", this.collectCoin, this);
      this.input.removeAllListeners();
      this.input.keyboard?.removeCapture([
        "UP",
        "DOWN",
        "LEFT",
        "RIGHT",
        "SPACE",
      ]);
    });
    observeLayout(this, (layout) => {
      const changed =
        this.lastOrientation !== undefined &&
        this.lastOrientation !== layout.isLandscape;
      this.lastOrientation = layout.isLandscape;
      this.cameras.main.setZoom(
        clamp(
          Math.min(layout.screenWidth, layout.screenHeight) / 600,
          controls.minZoom,
          controls.maxZoom,
        ),
      );
      this.updateCamera(0, true);
      if (changed) {
        this.resetControls();
        this.requestPause();
      }
    });
    if (!save.profile.hints.joystick) {
      this.halted = true;
      this.pauseKind = "tutorial";
      this.overlay = this.ui.modal(
        "Encontre seu ritmo",
        "Use o joystick para mover.\nPegue moedas.\nEvite obstáculos e o próprio corpo.",
        [
          {
            label: "Vamos jogar",
            run: () => {
              save.profile.tutorialCompleted = true;
              save.profile.firstLaunch = false;
              save.profile.hints.joystick = true;
              void save.save();
              this.continue();
              this.turboHint();
            },
          },
        ],
      );
    } else this.turboHint();
    this.renderSnake();
  }
  private validPoint(
    clearance: number,
    headClearance: number,
    nearby = false,
  ): Point | null {
    const a = B.arena;
    for (let n = 0; n < B.spawn.attempts; n++) {
      const p = {
        x: Phaser.Math.Between(a.left + B.spawn.edge, a.right - B.spawn.edge),
        y: Phaser.Math.Between(a.top + B.spawn.edge, a.bottom - B.spawn.edge),
      };
      if (
        distance(p, this.snake) < headClearance ||
        (nearby && distance(p, this.snake) > 360)
      )
        continue;
      let valid = true;
      for (let i = 0; i < this.snake.length; i++)
        if (distance(p, this.snake.body[i]) < clearance) {
          valid = false;
          break;
        }
      if (
        !valid ||
        this.obstacles.some((o) => distance(p, o) < 95) ||
        this.coins.some((c) => c.active && distance(p, c) < 60) ||
        (this.power && distance(p, this.power) < 75) ||
        (this.fruit?.active && distance(p, this.fruit) < 75) ||
        (this.boss && distance(p, this.boss.image) < 120)
      )
        continue;
      return p;
    }
    return null;
  }
  private fillCoins(count: number) {
    let active = this.coins.filter((c) => c.active).length;
    for (const coin of this.coins) {
      if (active >= count) break;
      if (coin.active) continue;
      const p = this.validPoint(B.spawn.bodyClearance, 65);
      if (!p) break;
      coin.spawn(p.x, p.y, save.profile.selectedPet === "bee");
      active++;
    }
  }
  private spawnObstacle(initial = false) {
    const p = this.validPoint(85, B.spawn.headClearance);
    if (!p) return;
    this.obstacles.push(
      new Obstacle(
        p.x,
        p.y,
        this.add.image(p.x, p.y, "rock").setDepth(5),
        initial,
      ),
    );
  }
  update(_time: number, delta: number) {
    if (
      this.keys &&
      (Phaser.Input.Keyboard.JustDown(this.keys.ESC) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE))
    ) {
      if (this.halted && this.pauseKind === "pause") this.continue();
      else this.requestPause();
    }
    if (this.halted || this.dead) return;
    this.accumulator += Math.min(delta / 1000, 0.05);
    while (this.accumulator >= 1 / 120 && !this.dead) {
      this.step(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.renderSnake();
    this.hud.update(this.run, this.combo, this.powers, this.turbo);
    if (this.bossEnergyHud && !this.boss) this.bossEnergyHud.textContent = this.rushMode
      ? `COIN RUSH · ${Math.ceil(this.run.rushRemaining)} s restantes`
      : `${this.currentWorld.toUpperCase()} · BossEnergy ${Math.floor(this.run.bossEnergy)}/500`;
    this.updateCamera(Math.min(delta / 1000, 0.05));
  }
  private step(dt: number) {
    this.run.elapsed += dt;
    if (this.rushMode) {
      this.run.rushRemaining -= dt;
      if (this.run.rushRemaining <= 0) {
        this.run.rushRemaining = 0;
        this.rushMode = false;
        analytics.track("coinRushEnded", { coins: this.run.matchCoins, score: this.run.score });
        this.die();
        return;
      }
    }
    this.combo.update(dt);
    this.powers.update(dt);
    const d = difficulty(this.run.elapsed, this.run.score, this.snake.length);
    let target = this.snake.angle;
    if (this.aim && distance(this.snake, this.aim) > 12)
      target = Math.atan2(this.aim.y - this.snake.y, this.aim.x - this.snake.x);
    if (this.joystick.direction !== null) target = this.joystick.direction;
    const k = this.keys;
    if (k) {
      const x =
          Number(k.D.isDown || k.RIGHT.isDown) -
          Number(k.A.isDown || k.LEFT.isDown),
        y =
          Number(k.S.isDown || k.DOWN.isDown) -
          Number(k.W.isDown || k.UP.isDown);
      if (x || y) {
        target = Math.atan2(y, x);
        this.aim = null;
      }
    }
    const wasTurbo = this.turbo.active;
    this.turbo.update(
      dt,
      this.turboButton.held || !!k?.SHIFT.isDown,
      this.powers.turbo > 0,
    );
    this.run.turboUses = this.turbo.activations;
    if (wasTurbo !== this.turbo.active) {
      audio.play(this.turbo.active ? "turbo_start" : "turbo_end");
      audio.setTurbo(this.turbo.active);
      if (this.turbo.active) haptic("power");
    }
    this.snake.move(
      dt,
      this.steering.update(target, dt),
      d.speed * this.worldSpeedMultiplier * (this.turbo.active ? turboConfig.multiplier : 1),
      controls.turnSpeed *
        (this.turbo.active ? controls.turboTurnMultiplier : 1),
    );
    if (worldById(this.currentWorld).hazard === "current") {
      this.snake.angle += Math.sin(this.run.elapsed * 0.7) * 0.0007;
    }
    if (this.boss) this.updateBoss(dt);
    else if (!this.rushMode && this.run.elapsed >= this.nextPortalAt && !this.worldPortal && !this.bossPortal) {
      this.spawnWorldPortal();
      this.nextPortalAt = this.run.elapsed + 45;
    }
    if (this.returnPortalAt > 0 && this.run.elapsed >= this.returnPortalAt && !this.worldPortal && this.currentWorld !== "green-valley") {
      this.returnPortalAt = 0;
      this.spawnReturnPortal();
    }
    if (this.boss && this.run.bossEnergy >= 100) {
      const hits = Math.min(this.boss.health, Math.floor(this.run.bossEnergy / 100));
      this.run.bossEnergy -= hits * 100;
      for (let hit = 0; hit < hits && this.boss; hit++) this.damageBoss();
    }
    for (const o of this.obstacles) {
      if (o.warning > 0 && distance(o, this.snake) < 110)
        o.warning = Math.max(o.warning, 0.3);
      o.update(dt);
    }
    const a = B.arena,
      r = B.snake.radius;
    const wall =
      this.snake.x < a.left + r ||
      this.snake.x > a.right - r ||
      this.snake.y < a.top + r ||
      this.snake.y > a.bottom - r;
    const obstacle = this.obstacles.find(
      (o) => o.warning === 0 && distance(this.snake, o) < 44,
    );
    if (wall || obstacle || this.snake.selfCollision()) {
      const hadShield = this.powers.shield;
      if (this.powers.invincible <= 0) {
        if (!this.powers.absorb()) {
          if (!this.loseLife()) {
            this.die();
            return;
          }
        } else if (hadShield && !this.powers.shield) {
          this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x7acfff);
          haptic("power");
          audio.play("shield_break");
        }
      }
      if (wall) {
        this.snake.x = clamp(this.snake.x, a.left + r + 1, a.right - r - 1);
        this.snake.y = clamp(this.snake.y, a.top + r + 1, a.bottom - r - 1);
        this.snake.angle = Math.atan2(750 - this.snake.y, 700 - this.snake.x);
        this.steering.reset(this.snake.angle);
        this.aim = null;
      }
      if (obstacle) {
        obstacle.destroy();
        this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
      }
    }
    for (const coin of this.coins) {
      if (!coin.active) continue;
      const dist = distance(coin, this.snake);
      if (this.powers.magnet > 0 && dist < B.power.magnetRadius && dist > 1) {
        const move = Math.min(dist, B.power.attraction * dt);
        coin.x += ((this.snake.x - coin.x) / dist) * move;
        coin.y += ((this.snake.y - coin.y) / dist) * move;
        coin.render();
      }
      if (distance(coin, this.snake) < 31) {
        this.events.emit("coinCollected", coin);
        coin.hide();
      }
    }
    if (this.power) {
      this.power.life -= dt;
      if (distance(this.power, this.snake) < 40) {
        const kind = this.power.kind;
        if (kind.id === "life") {
          if (this.powers.gainLife()) {
            this.powers.invincible = Math.max(
              this.powers.invincible,
              B.power.lifeGrace,
            );
            this.feedback(this.power.x, this.power.y, "+1 VIDA", kind.color, true);
          } else {
            this.feedback(this.power.x, this.power.y, "VIDAS CHEIAS", kind.color);
          }
        } else {
          this.powers.activate(kind.id);
          this.feedback(this.power.x, this.power.y, kind.name, kind.color);
        }
        this.run.powerups++;
        if (kind.id === "magnet") this.run.magnet++;
        audio.play("power");
        haptic("power");
        this.power.destroy();
        this.power = undefined;
      } else if (this.power.life <= 0) {
        this.power.destroy();
        this.power = undefined;
      }
    }
    const hadFruit = this.fruit.active;
    this.fruit.update(
      dt,
      this.run.elapsed,
      save.profile.settings.reducedMotion,
    );
    if (this.fruit.active && distance(this.fruit, this.snake) < 37) {
      const before = this.snake.length;
      this.snake.length = shrunkLength(before);
      this.run.shrinkFruits++;
      this.feedback(
        this.fruit.x,
        this.fruit.y,
        `−${before - this.snake.length} segmentos`,
        0xa784da,
      );
      audio.play("shrink");
      haptic("power");
      this.fruit.hide();
    }
    if (hadFruit && !this.fruit.active) this.shrinkTimer = shrinkCooldown();
    if (!this.fruit.active) {
      this.shrinkTimer = Math.max(0, this.shrinkTimer - dt);
      if (
        this.shrinkTimer === 0 &&
        this.snake.length >= shrinkConfig.minimumSpawnLength
      )
        this.spawnFruit();
    }
    this.countdown -= dt;
    if (this.countdown <= 0) {
      this.countdown = B.power.interval;
      if (!this.power) {
        const p = this.validPoint(55, 100);
        if (p) {
          const rareLife =
            this.powers.lives < B.power.maxLives &&
            Math.random() < B.power.lifeSpawnChance;
          this.power = new PowerUp(this, p.x, p.y, rareLife);
        }
      }
    }
    // Spawn reconciliation is throttled; no searches or array filtering every simulation tick.
    if (
      Math.floor(this.run.elapsed * 2) !==
      Math.floor((this.run.elapsed - dt) * 2)
    ) {
      this.fillCoins(d.coins);
      if (this.obstacles.length < d.obstacles) this.spawnObstacle();
    }
  }
  private renderSnake() {
    for (let i = 0; i < this.sprites.length; i++) {
      const image = this.sprites[i];
      image.setVisible(i < this.snake.length);
      if (i >= this.snake.length) continue;
      const p = this.snake.body[i];
      image.setPosition(p.x, p.y);
      image.setRotation(
        i === 0
          ? this.snake.angle
          : Math.atan2(
              this.snake.body[i - 1].y - p.y,
              this.snake.body[i - 1].x - p.x,
            ),
      );
      image.setAlpha(
        this.powers.invincible > 0
          ? 0.55 + Math.sin(this.run.elapsed * 20) * 0.25
          : 1,
      );
    }
    if (this.petSprite) {
      const tail = this.snake.body[Math.min(this.snake.length - 1, 5)];
      const phase = this.run.elapsed * 3;
      this.petSprite.setPosition(tail.x + Math.cos(phase) * 13, tail.y + 26 + Math.sin(phase) * 5);
      this.petSprite.setScale(1 + Math.sin(phase) * 0.06);
    }
    this.ring.clear();
    if (this.turbo.active && !save.profile.settings.reducedMotion) {
      this.ring.lineStyle(10, 0xffd560, 0.3).beginPath();
      this.ring.moveTo(this.snake.x, this.snake.y);
      for (let i = 1; i < Math.min(this.snake.length, 14); i++)
        this.ring.lineTo(this.snake.body[i].x, this.snake.body[i].y);
      this.ring.strokePath();
    }
    if (this.powers.shield || this.powers.invincible > 0)
      this.ring
        .lineStyle(4, 0x53bdef, 0.8)
        .strokeCircle(this.snake.x, this.snake.y, 27);
    if (this.powers.magnet > 0)
      this.ring
        .lineStyle(2, 0xdc6c98, 0.3)
        .strokeCircle(this.snake.x, this.snake.y, B.power.magnetRadius);
    if (this.turbo.active)
      this.ring
        .lineStyle(4, 0xffbb50, 0.85)
        .strokeCircle(this.snake.x, this.snake.y, 24);
  }
  private feedback(
    x: number,
    y: number,
    message: string,
    color: number,
    special = false,
  ) {
    this.particles.setParticleTint(color);
    this.particles.explode(special ? 24 : 8, x, y);
    const t = text(
      this,
      x,
      y - 30,
      message,
      special ? 37 : 25,
      C.ink,
      true,
    ).setDepth(31);
    this.tweens.add({
      targets: t,
      y: y - 85,
      alpha: 0,
      duration: 650,
      onComplete: () => t.destroy(),
    });
    if (special && !save.profile.settings.reducedMotion)
      this.cameras.main.flash(100, 255, 222, 100, false);
  }
  private die() {
    this.dead = true;
    this.resetControls();
    audio.setTurbo(false);
    this.ui.root.hidden = true;
    audio.play("error");
    haptic("error");
    creditCoins(save.profile, this.run);
    reportRun(save.profile, this.run);
    void save.save();
    this.renderSnake();
    this.scene.launch("GameOver", { run: this.run });
    this.scene.pause();
  }
  private loseLife(): boolean {
    if (!this.powers.loseLife()) return false;
    this.snake.length = B.snake.initial;
    this.snake.reset(700, 750);
    this.steering.reset(this.snake.angle);
    this.resetControls();
    this.turbo.fill();
    this.powers.invincible = B.power.lifeGrace;
    this.combo = new ComboSystem();
    this.combo.max = this.run.maxCombo;
    this.accumulator = 0;
    for (const obstacle of [...this.obstacles]) {
      if (distance(obstacle, this.snake) < B.spawn.headClearance) {
        obstacle.destroy();
        this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
      }
    }
    this.feedback(this.snake.x, this.snake.y, `VIDA PERDIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
    haptic("power");
    this.updateCamera(0, true);
    this.renderSnake();
    return true;
  }
  revive() {
    this.dead = false;
    this.halted = false;
    this.run.revived = true;
    this.snake.length = B.snake.initial;
    this.snake.reset(700, 750);
    this.steering.reset(this.snake.angle);
    this.resetControls();
    this.turbo.fill();
    this.ui.root.hidden = false;
    this.updateCamera(0, true);
    this.powers.invincible = B.power.reviveGrace;
    this.aim = null;
    this.combo = new ComboSystem();
    this.combo.max = this.run.maxCombo;
    this.accumulator = 0;
    for (const o of [...this.obstacles])
      if (distance(o, this.snake) < B.spawn.headClearance) {
        o.destroy();
        this.obstacles.splice(this.obstacles.indexOf(o), 1);
      }
    this.renderSnake();
  }
  requestPause() {
    audio.setTurbo(false);
    if (this.halted || this.dead || !this.scene.isActive()) return;
    this.halted = true;
    this.pauseKind = "pause";
    this.resetControls();
    this.overlay = this.ui.modal("Pausado", "Seu vale pode esperar.", [
      { label: "Continuar", run: () => this.continue() },
      {
        label: "Reiniciar",
        run: () => {
          this.finalize();
          this.scene.restart();
        },
      },
      {
        label: "Menu",
        run: () => {
          this.finalize();
          this.scene.start("Menu");
        },
      },
    ]);
  }
  private continue() {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.resetControls();
    this.accumulator = 0;
    this.halted = false;
  }
  private resetControls() {
    this.aim = null;
    this.joystick?.reset();
    this.turboButton?.reset();
    this.turbo?.release();
    this.input.keyboard?.resetKeys();
  }
  private turboHint() {
    if (save.profile.hints.turbo) return;
    save.profile.hints.turbo = true;
    void save.save();
    this.ui.toast("Segure Turbo para acelerar. No teclado, use Shift.");
  }
  private spawnFruit() {
    const p = this.validPoint(60, 90, true);
    if (!p) return;
    this.fruit.spawn(p.x, p.y);
    if (!save.profile.hints.shrink) {
      save.profile.hints.shrink = true;
      void save.save();
      this.ui.toast("A fruta roxa reduz seu tamanho em 25%.");
    }
  }
  private collectCoin(coin: Coin) {
    const combo = this.combo.collect();
    this.run.score +=
      coin.kind.score *
      combo *
      (this.powers.turbo > 0 ? B.power.turboScore : 1);
    this.run.matchCoins += coin.kind.value;
    this.run.maxCombo = this.combo.max;
    if (coin.kind.id === "golden") this.run.golden++;
    this.snake.grow();
    this.turbo.charge(coin.kind.id);
    this.run.bossEnergy += this.portalSystem.bossEnergy(coin.kind.id);
    this.feedback(
      coin.x,
      coin.y,
      `+${coin.kind.value}`,
      coin.kind.color,
      coin.kind.id === "golden",
    );
    audio.play(`coin_${coin.kind.id}`, combo);
    haptic(coin.kind.id === "golden" ? "golden" : "coin");
    analytics.track("coinCollected", { kind: coin.kind.id, value: coin.kind.value });
    if (this.run.matchCoins >= 100) awardAchievement(save.profile, "coin-hunter");
    if (combo >= 5) awardAchievement(save.profile, "combo-master");
  }
  private spawnWorldPortal() {
    const level = save.profile.playerLevel;
    if (this.currentWorld === "green-valley" && this.run.bossEnergy >= 500 && !save.profile.bossesDefeated.includes("king-snake")) {
      this.spawnBossPortal("king-snake");
      return;
    }
    const target = this.currentWorld === "green-valley"
      ? this.portalSystem.choose(level, this.currentWorld)
      : worldById("green-valley");
    if (target.id === this.currentWorld) return;
    const p = this.validPoint(90, 220, true);
    if (!p) return;
    const g = this.add.graphics();
    g.fillStyle(target.accent, 0.22).fillEllipse(0, 0, 92, 126);
    g.lineStyle(8, target.accent, 0.95).strokeEllipse(0, 0, 72, 108);
    const label = this.add.text(0, 70, `${target.id === "green-valley" ? "RETORNAR" : "VIAJAR"} · ${target.name}`, { fontSize: "16px", color: "#163f36", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(p.x, p.y, [g, label]).setDepth(9);
    this.worldPortal.setSize(100, 150).setInteractive();
    this.worldPortal.on("pointerdown", () => this.enterWorld(target.id));
    this.ui.toast(`Portal para ${target.name} apareceu. Toque nele para viajar.`);
  }
  private enterWorld(id: string) {
    const world = worldById(id);
    this.worldPortal?.destroy(); this.worldPortal = undefined;
    this.currentWorld = world.id;
    this.worldSpeedMultiplier = world.speedMultiplier;
    if (world.id === "green-valley") this.returnPortalAt = 0;
    save.profile.worldsUnlocked = [...new Set([...save.profile.worldsUnlocked, world.id])];
    this.run.portalsUsed++;
    awardAchievement(save.profile, "world-traveler");
    this.cameras.main.setBackgroundColor(world.background);
    for (const obstacle of this.obstacles) obstacle.image.setTint(world.accent);
    if (world.hazard === "sticky") this.ui.toast("Sticky zones reduzem sua velocidade por instantes.");
    if (world.hazard === "current") this.ui.toast("Correntes oceânicas alteram suavemente sua direção.");
    this.ui.get("#world-tag").textContent = world.name.toUpperCase();
    this.ui.get<HTMLElement>("#world-tag").style.backgroundColor = `#${world.accent.toString(16).padStart(6, "0")}`;
    analytics.track("portalEntered", { world: world.id });
    void save.save();
    if (world.bossId && !save.profile.bossesDefeated.includes(world.bossId)) this.spawnBossPortal(world.bossId);
    this.ui.toast(`${world.name}: portal de retorno aparecerá em breve.`);
    this.nextPortalAt = this.run.elapsed + 25;
    if (world.id !== "green-valley") this.returnPortalAt = this.run.elapsed + 25;
    else { this.bossPortal?.destroy(); this.bossPortal = undefined; this.bossDefinition = undefined; }
  }
  private spawnReturnPortal() {
    if (this.worldPortal || this.dead || this.currentWorld === "green-valley") return;
    const target = worldById("green-valley"), p = this.validPoint(90, 220, true);
    if (!p) return;
    const g = this.add.graphics();
    g.fillStyle(target.accent, 0.22).fillEllipse(0, 0, 92, 126);
    g.lineStyle(8, target.accent, 0.95).strokeEllipse(0, 0, 72, 108);
    const label = this.add.text(0, 70, "RETORNAR · GREEN VALLEY", { fontSize: "16px", color: "#163f36", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(p.x, p.y, [g, label]).setDepth(9).setSize(100, 150).setInteractive();
    this.worldPortal.on("pointerdown", () => this.enterWorld("green-valley"));
    this.ui.toast("Portal de retorno apareceu.");
  }
  private spawnBossPortal(bossId: string) {
    if (this.bossPortal || this.dead) return;
    const p = this.validPoint(100, 180, true); if (!p) return;
    const g = this.add.graphics().fillStyle(0x713c9c, 0.28).fillEllipse(0, 0, 110, 140).lineStyle(8, 0x9d5ac7).strokeEllipse(0, 0, 86, 118);
    const t = this.add.text(0, 76, "BOSS · OPCIONAL", { fontSize: "16px", color: "#43255b", fontStyle: "bold" }).setOrigin(0.5);
    this.bossPortal = this.add.container(p.x, p.y, [g, t]).setDepth(9).setSize(120, 160).setInteractive();
    this.bossDefinition = bosses.find((boss) => boss.id === bossId);
    this.bossPortal.on("pointerdown", () => {
      if (this.run.bossEnergy < 500) this.ui.toast(`Portal opcional: carregue 500 Boss Energy. Atual: ${Math.floor(this.run.bossEnergy)}.`);
      else { this.run.bossEnergy -= 500; if (this.bossDefinition) this.startBoss(this.bossDefinition); }
    });
    const portal = this.bossPortal;
    this.time.delayedCall(25_000, () => {
      if (this.bossPortal !== portal) return;
      this.bossPortal?.destroy();
      this.bossPortal = undefined;
      this.bossDefinition = undefined;
      this.ui.toast(`Boss Portal expirou. BossEnergy (${Math.floor(this.run.bossEnergy)}) preservada.`);
    });
  }
  private startBoss(definition: BossDefinition) {
    this.bossPortal?.destroy(); this.bossPortal = undefined;
    const g = this.add.graphics().fillStyle(definition.id === "king-snake" ? 0x315d3c : 0xc74b9d).fillCircle(0, 0, 55).lineStyle(7, 0xffd66f).strokeCircle(0, 0, 58);
    const eyes = this.add.text(0, -4, "♛", { fontSize: "48px", color: "#ffffff" }).setOrigin(0.5);
    const image = this.add.container(this.snake.x + 240, this.snake.y, [g, eyes]).setDepth(19);
    this.boss = { definition, health: definition.maxHealth, phase: 0, attack: definition.attackInterval, speed: definition.movementSpeed, image };
    this.bossHud!.hidden = false;
    if (this.bossEnergyHud) this.bossEnergyHud.hidden = true;
    this.bossHud!.textContent = `${definition.name} · ${this.boss.health}/${definition.maxHealth} HP · carregue energia coletando moedas`;
    this.ui.toast("Boss fight! Colete moedas para causar dano. Desvie dos ataques!");
    image.setSize(120, 120);
  }
  private updateBoss(dt: number) {
    const boss = this.boss!;
    boss.attack -= dt;
    const dx = this.snake.x - boss.image.x, dy = this.snake.y - boss.image.y, d = Math.hypot(dx, dy) || 1;
    boss.image.x += dx / d * boss.speed * dt;
    boss.image.y += dy / d * boss.speed * dt;
    if (boss.attack <= 0) {
      boss.attack = boss.definition.attackInterval;
      if (d < 115 && !this.powers.absorb()) this.snake.length = Math.max(B.snake.initial, this.snake.length - 1);
      this.ui.toast("Ataque telegrafado! Mantenha distância ou use Escudo.");
    }
    if (boss.health <= boss.definition.phases[boss.phase] && boss.phase < boss.definition.phases.length) {
      boss.phase++;
      boss.speed += 18;
      this.feedback(boss.image.x, boss.image.y, `FASE ${boss.phase + 1}`, 0xffd66f, true);
    }
    if (this.bossHud) this.bossHud.textContent = `${boss.definition.name} · ${boss.health}/${boss.definition.maxHealth} HP · BossEnergy ${Math.floor(this.run.bossEnergy)}/100 · fase ${Math.min(3, boss.phase + 1)}`;
  }
  private damageBoss() {
    if (!this.boss) return;
    this.boss.health--;
    if (this.boss.health > 0) return;
    const defeated = this.boss.definition;
    this.boss.image.destroy(); this.boss = undefined;
    this.bossHud!.hidden = true;
    if (this.bossEnergyHud) this.bossEnergyHud.hidden = false;
    const first = !save.profile.bossesDefeated.includes(defeated.id);
    if (first) {
      save.profile.bossesDefeated.push(defeated.id);
      save.profile.unlockedPets = [...new Set([...save.profile.unlockedPets, defeated.petReward])];
      save.profile.totalCoins += defeated.rewardCoins;
      addXP(save.profile, defeated.rewardXP);
    }
    this.run.bossDefeats++;
    this.run.bossCoins += 3;
    if (first) {
      awardAchievement(save.profile, "boss-hunter");
      awardAchievement(save.profile, "pet-collector");
    }
    this.ui.toast(first ? `${defeated.name} derrotado! Pet ${defeated.petReward} desbloqueado; +${defeated.rewardCoins} moedas e +3 Boss Coins.` : `${defeated.name} derrotado! +3 Boss Coins.`);
    analytics.track("bossDefeated", { boss: defeated.id });
    void save.save();
  }
  private updateCamera(dt: number, snap = false) {
    const c = this.cameras.main,
      look = this.turbo.active ? controls.turboLookAhead : controls.lookAhead;
    const x = this.snake.x + Math.cos(this.snake.angle) * look,
      y = this.snake.y + Math.sin(this.snake.angle) * look;
    const alpha = snap ? 1 : 1 - Math.exp(-controls.cameraSmoothing * dt);
    this.cameraX += (x - this.cameraX) * alpha;
    this.cameraY += (y - this.cameraY) * alpha;
    const halfW = c.width / (2 * c.zoom),
      halfH = c.height / (2 * c.zoom),
      a = B.arena;
    const bound = (v: number, min: number, max: number, half: number) =>
      max - min < half * 2 ? (min + max) / 2 : clamp(v, min + half, max - half);
    c.centerOn(
      bound(this.cameraX, a.left - 24, a.right + 24, halfW),
      bound(this.cameraY, a.top - 24, a.bottom + 24, halfH),
    );
  }
  private installDebug() {
    if (!import.meta.env.DEV) return;
    const toggle = document.createElement("button");
    toggle.className = "debug-toggle";
    toggle.textContent = "DEV";
    this.ui.root.append(toggle);
    const menu = document.createElement("div");
    menu.className = "debug-menu";
    menu.hidden = true;
    this.ui.root.append(menu);
    toggle.onclick = () => {
      menu.hidden = !menu.hidden;
    };
    const actions: [string, () => void][] = [
      [
        "+500 moedas",
        () => {
          save.profile.totalCoins += 500;
          void save.save();
        },
      ],
      [
        "+500 XP",
        () => {
          addXP(save.profile, 500);
          void save.save();
        },
      ],
      ["Encher turbo", () => this.turbo.fill()],
      [
        "Corpo: 20 segmentos",
        () => {
          this.snake.length = 20;
        },
      ],
      [
        "Gerar fruta",
        () => {
          this.spawnFruit();
        },
      ],
      ["Escudo", () => this.powers.activate("shield")],
    ];
    for (const [label, run] of actions) {
      const b = document.createElement("button");
      b.className = "action secondary small";
      b.textContent = label;
      b.onclick = run;
      menu.append(b);
    }
  }
  finalize() {
    if (this.run.finished) return;
    reportRun(save.profile, this.run, true);
    finishRun(save.profile, this.run);
    if (!this.masteryCredited) {
      this.masteryCredited = true;
      save.profile.mastery[save.profile.selectedSkin] = (save.profile.mastery[save.profile.selectedSkin] ?? 0) + 1;
      const mastery = save.profile.mastery[save.profile.selectedSkin];
      if (mastery === 10 || mastery === 25 || mastery === 50) {
        const reward = mastery * 5;
        save.profile.totalCoins += reward;
        this.ui.toast(`Domínio ${mastery} com ${save.profile.selectedSkin}: +${reward} moedas virtuais.`);
      }
    }
    awardAchievement(save.profile, "first-run");
    analytics.track("gameEnded", { score: this.run.score, coins: this.run.matchCoins });
    void save.save();
  }
}
