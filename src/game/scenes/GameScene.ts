import Phaser from "phaser";
import { B } from "../data/balance";
import { Snake } from "../entities/Snake";
import { Coin } from "../entities/Coin";
import { Obstacle } from "../entities/Obstacle";
import { PowerUp } from "../entities/PowerUp";
import { ComboSystem } from "../systems/ComboSystem";
import { PowerUpSystem } from "../systems/PowerUpSystem";
import { bossAttackTiming, bossMovementSpeed, difficulty } from "../systems/DifficultySystem";
import { save } from "../systems/SaveSystem";
import { creditCoins, creditBossCoins, finishRun } from "../systems/EconomySystem";
import { reportRun, startMissionRun } from "../systems/MissionSystem";
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
import { controls, shrinkConfig } from "../data/controls";
import { addXP } from "../systems/EconomySystem";
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { worlds, worldById, type WorldDefinition } from "../data/worlds";
import { bosses, type BossDefinition } from "../data/bosses";
import { BossFightSystem } from "../systems/BossFightSystem";
import { pets } from "../data/pets";
import { PortalSystem } from "../systems/PortalSystem";
import { awardAchievement } from "../systems/AchievementSystem";
import { analytics } from "../services/AnalyticsService";
import { getBossSkinRewards, getSkin } from "../data/skins";
import { reconcileWorldUnlocks, rememberWorld, traversableWorlds } from "../systems/WorldSystem";
import { candyWorldConfig as CW, candyRegions, candyObstacleSafe, candyCoinSpawnAllowed, candyFinalSpeed, inCandyRiver, stickySpeedMultiplier, type StickyZone } from "../data/candyWorld";
import { oceanWorldConfig as OW, oceanRegions, oceanCurrentZones, currentForceAt, isSafeOceanSpawn, isOutsideKrakenArena, pearlCoinSpawnAllowed, bonusBubbleReward, containKrakenArenaPoint, type CurrentZone, type CoralObstacle } from "../data/oceanWorld";
import { applyWorldOrientation } from "../services/OrientationService";
import { missionsForProfile } from "../data/missions";
export class GameScene extends Phaser.Scene {
  snake!: Snake;
  run!: RunState;
  private combo!: ComboSystem;
  private powers!: PowerUpSystem;
  private coins: Coin[] = [];
  private obstacles: Obstacle[] = [];
  private power?: PowerUp;
  private poison?: { x: number; y: number; life: number; image: Phaser.GameObjects.Image };
  private sprites: Phaser.GameObjects.Image[] = [];
  private skinParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private skinTrail!: Phaser.GameObjects.Graphics;
  private selectedCosmetic = getSkin("classic")!;
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
  private applyCameraZoom(width: number, height: number) {
    const panoramic = save.profile.settings.cameraMode === "panoramic";
    const zoom = panoramic
      ? Math.min(width / (B.arena.right - B.arena.left), height / (B.arena.bottom - B.arena.top)) * 0.92
      : Math.min(width, height) / 600;
    this.cameras.main.setZoom(clamp(zoom, panoramic ? 0.15 : controls.minZoom, controls.maxZoom));
  }
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
  private worldTransitioning = false;
  private passageCooldown = 0;
  private worldPortal?: Phaser.GameObjects.Container;
  private worldPassages: Phaser.GameObjects.Container[] = [];
  private bossPortal?: Phaser.GameObjects.Container;
  private bossIntroOpen = false;
  private bossPortalExpiresAt = 0;
  private boss?: { definition: BossDefinition; health: number; phase: number; attack: number; speed: number; image: Phaser.GameObjects.Image | Phaser.GameObjects.Container; bodySegments: Phaser.GameObjects.Image[]; trail: Point[]; visualAngle: number; lastVisualX: number; lastVisualY: number; state: "CHASE" | "PREPARE_CHARGE" | "CHARGE" | "STUNNED" | "RECOVER" | "DROP_ATTACK" | "ATTACK_MODE" | "SUGAR_RUSH" | "IDLE" | "TELEGRAPH_SLAM" | "SLAM" | "EXPOSED" | "WHIRLPOOL"; stateTimer: number; targetX: number; targetY: number; chargeX: number; chargeY: number; doubleCharge: number; hazard?: Phaser.GameObjects.Container; krakenTentacles?: Phaser.GameObjects.Graphics[] };
  private bossFight = new BossFightSystem();
  private bossPickups: Array<{ x: number; y: number; life: number; kind: "boss-coin" | "loot-boss-coin" | "crown-orb" | "sugar-shield" | "attack-pearl" | "candy-aura" | "candy-shield"; image: Phaser.GameObjects.Container }> = [];
  private bossMarkers: Phaser.GameObjects.GameObject[] = [];
  private bossCurrent?: { x: number; y: number; direction: number; force: number; life: number; graphics: Phaser.GameObjects.Graphics };
  private bossWhirlpool?: Phaser.GameObjects.Graphics;
  private bossCoinsTimer = 2;
  private bossAuraGraphics?: Phaser.GameObjects.Graphics;
  private bossCollisionGrace = 0;
  private candyBossEscapeTimer = 0;
  private bossHud?: HTMLElement;
  private bossEnergyHud?: HTMLElement;
  private petSprite?: Phaser.GameObjects.Container;
  private rushMode = false;
  private bossDefinition?: BossDefinition;
  private portalSystem = new PortalSystem();
  private worldSpeedMultiplier = 1;
  private stickyZones: StickyZone[] = [];
  private stickyGraphics?: Phaser.GameObjects.Graphics;
  private stickySpeed = 1;
  private stickyFeedbackAt = 0;
  private candyCoinSpawned = false;
  private candyCoinTimer = CW.candyCoin.opportunitySeconds;
  private candyWorldObjects: Phaser.GameObjects.GameObject[] = [];
  private oceanObjects: Phaser.GameObjects.GameObject[] = [];
  private oceanDecorations: Phaser.GameObjects.GameObject[] = [];
  private oceanCurrents: CurrentZone[] = [];
  private oceanCorals: CoralObstacle[] = [];
  private currentGraphics?: Phaser.GameObjects.Graphics;
  private bubbleObjects: Array<{ image: Phaser.GameObjects.Arc; life: number; bonus: boolean }> = [];
  private pearlTimer: number = OW.pearlCooldown;
  private bubbleTimer: number = OW.bubbleCooldown;
  private currentZoneId?: string;
  private deepTrenchActive = false;
  private clam?: { x: number; y: number; state: "CLOSED" | "OPENING" | "OPEN" | "EMPTY"; image: Phaser.GameObjects.Container; timer: number; coin?: Coin };
  private krakenBarrier?: Phaser.GameObjects.Container;
  private krakenBarrierCooldown = 0;
  private krakenReturnAngle?: number;
  private krakenReturnTimer = 0;
  private masteryCredited = false;
  constructor() {
    super("Game");
  }
  create() {
    audio.setGameplayActive(this, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      audio.setGameplayActive(this, false),
    );
    const initData = (this.scene.settings.data ?? {}) as { rushMode?: boolean; startWorld?: string };
    this.rushMode = initData.rushMode ?? false;
    reconcileWorldUnlocks(save.profile);
    const requestedWorld = initData.rushMode ? "green-valley" : initData.startWorld ?? save.profile.selectedWorld;
    const selected = worldById(requestedWorld);
    this.currentWorld = selected.isImplemented && save.profile.worldsUnlocked.includes(selected.id) ? selected.id : "green-valley";
    void applyWorldOrientation(this.currentWorld, save.profile.settings.orientation);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => void applyWorldOrientation("green-valley", save.profile.settings.orientation));
    this.selectedCosmetic = getSkin(save.profile.selectedSkin) ?? getSkin("classic")!;
    this.worldSpeedMultiplier = worldById(this.currentWorld).speedMultiplier;
    this.masteryCredited = false;
    this.worldPortal = undefined;
    this.worldPassages = [];
    this.worldTransitioning = false;
    this.passageCooldown = 0;
    this.bossPortal = undefined;
    this.krakenBarrier?.destroy();
    this.krakenBarrier = undefined;
    this.krakenBarrierCooldown = 0;
    this.krakenReturnAngle = undefined;
    this.krakenReturnTimer = 0;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.krakenBarrier?.destroy();
      this.krakenBarrier = undefined;
    });
    this.bossIntroOpen = false;
    this.bossPortalExpiresAt = 0;
    this.boss = undefined;
    this.bossFight.destroy();
    this.bossPickups = [];
    this.bossMarkers = [];
    this.bossCurrent = undefined;
    this.bossWhirlpool?.destroy(); this.bossWhirlpool = undefined;
    this.bossAuraGraphics?.destroy(); this.bossAuraGraphics = undefined;
    this.bossCollisionGrace = 0;
    this.bossDefinition = undefined;
    this.petSprite?.destroy();
    this.petSprite = undefined;
    this.snake = new Snake();
    this.selectedCosmetic = getSkin(save.profile.selectedSkin) ?? getSkin("classic")!;
    this.snake.reset(700, 750);
    this.turbo = new TurboSystem();
    this.steering = new SteeringSystem();
    this.shrinkTimer = shrinkCooldown();
    this.lastOrientation = undefined;
    this.cameraX = this.snake.x;
    this.cameraY = this.snake.y;
    this.run = newRun();
    startMissionRun(save.profile, this.run);
    if (save.profile.missionDate === this.run.missionDate) void save.save();
    this.run.rushMode = this.rushMode;
    this.combo = new ComboSystem();
    this.powers = new PowerUpSystem(B.power.initialLives + (save.profile.selectedPet === "phoenix" ? 1 : 0));
    this.coins = [];
    this.obstacles = [];
    this.stickyZones = [];
    this.candyWorldObjects = [];
    this.stickySpeed = 1;
    this.stickyFeedbackAt = 0;
    this.candyCoinSpawned = false;
    this.candyCoinTimer = CW.candyCoin.opportunitySeconds;
    this.oceanObjects = [];
    this.oceanDecorations = [];
    this.oceanCurrents = [];
    this.oceanCorals = [];
    this.bubbleObjects = [];
    this.pearlTimer = OW.pearlCooldown;
    this.bubbleTimer = OW.bubbleCooldown;
    this.currentZoneId = undefined;
    this.deepTrenchActive = false;
    this.clam = undefined;
    this.power = undefined;
    this.poison?.image.destroy();
    this.poison = undefined;
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
    this.drawWorldPassageMarkers(g);
    for (let i = 0; i < 650; i++) {
      const x = a.left + 22 + ((i * 73) % (a.right - a.left - 44)),
        y = a.top + 22 + ((i * 137) % (a.bottom - a.top - 44));
      const candy = this.currentWorld === "candy-world", ocean = this.currentWorld === "ocean";
      g.fillStyle(ocean ? (i % 3 ? 0xb5dfe1 : 0xd3e5c8) : candy ? (i % 3 ? 0xf5b8d8 : 0xffd6a5) : (i % 3 ? 0xbbd09e : 0xcbdca9), ocean ? 0.24 : 0.55).fillEllipse(
        x,
        y,
        5 + (i % 4),
        3,
      );
    }
    if (this.currentWorld === "candy-world") this.buildCandyWorld(g);
    if (this.currentWorld === "ocean") this.buildOceanWorld(g);
    this.coins = Array.from(
      { length: B.difficulty.maxCoins },
      () => new Coin(this),
    );
    if (this.currentWorld !== "candy-world" && this.currentWorld !== "ocean")
      for (let i = 0; i < B.difficulty.initialObstacles; i++)
        this.spawnObstacle(true);
    if (this.currentWorld === "ocean") this.spawnOceanCorals();
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
    this.skinTrail = this.add.graphics().setDepth(23);
    this.skinParticles?.destroy();
    this.skinParticles = undefined;
    if (this.selectedCosmetic.particleConfig.enabled)
      this.skinParticles = this.add.particles(0, 0, "spark", {
        emitting: true,
        frequency: Math.max(140, 1000 / Math.max(1, this.selectedCosmetic.particleConfig.rate)),
        speed: { min: 8, max: 28 },
        lifespan: 700,
        scale: { start: 0.65, end: 0 },
        quantity: 1,
        maxParticles: Math.min(32, this.selectedCosmetic.particleConfig.max),
        tint: this.selectedCosmetic.particleConfig.color,
      }).setDepth(22);
    this.ui = new ScreenUI(this, "game-ui");
    this.ui.root.classList.toggle(
      "left-handed",
      save.profile.settings.leftHanded,
    );
    if (this.rushMode) this.ui.root.classList.add("rush-mode");
    this.ui.html(
      `<div class="hud"><div class="hud-stats"><div><span class="hud-label">PONTOS</span><b class="hud-value" id="score">0</b></div><div><span class="hud-label">MOEDAS</span><b class="hud-value" id="coins">0</b></div><div><span class="hud-label">COMBO</span><b class="hud-value" id="combo">×1</b></div></div><div id="lives" class="lives-indicator" aria-label="Vidas restantes">♥ 2</div><button id="pause" class="action small pause-button" aria-label="Pausar partida">Ⅱ</button></div><div id="effects" class="effects"></div><div class="world-tag" id="world-tag">${this.rushMode ? "COIN RUSH" : worldById(this.currentWorld).name.toUpperCase()}</div><div id="boss-energy" class="boss-energy">BOSS ENERGY 0/350</div><div id="boss-hud" class="effects" hidden></div><div id="joystick" class="joystick-zone" aria-label="Área do joystick"></div><div class="turbo-control"><button id="turbo" class="turbo-button" aria-label="Segure para acelerar">ϟ TURBO</button><div class="track"><i id="turbo-bar" style="width:100%"></i></div><small id="turbo-value">100 / 100</small></div>`,
    );
    if (save.profile.selectedPet) {
      const petGraphic = this.add.graphics();
      const petColor = save.profile.selectedPet === "bee" ? 0xffd84d : save.profile.selectedPet === "snow-pup" ? 0x9edfff : save.profile.selectedPet === "tiny-dragon" ? 0xff7043 : save.profile.selectedPet === "firefly" ? 0xc7ff72 : save.profile.selectedPet === "tidal-turtle" ? 0x56c9b0 : save.profile.selectedPet === "phoenix" ? 0xff793f : save.profile.selectedPet === "celestial-serpent" ? 0xb875ed : 0xe783d0;
      petGraphic.fillStyle(petColor).fillCircle(0, 0, 12);
      petGraphic.lineStyle(2, 0xffffff).strokeCircle(0, 0, 12);
      if (["bee", "firefly"].includes(save.profile.selectedPet ?? "")) petGraphic.lineStyle(2, 0xffffff).lineBetween(-17, -8, -9, -3).lineBetween(9, -3, 17, -8);
      this.petSprite = this.add.container(this.snake.x, this.snake.y + 28, [petGraphic]).setDepth(25);
    }
    this.ui.on("#pause", () => this.requestPause());
    this.hud = new GameplayHUD(this.ui);
    this.bossHud = this.ui.get("#boss-hud");
    this.bossEnergyHud = this.ui.get("#boss-energy");
    this.bossHud?.classList.add("boss-fight-hud");
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
    document.addEventListener("visibilitychange", onHide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("visibilitychange", onHide);
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
      this.applyCameraZoom(layout.screenWidth, layout.screenHeight);
      this.updateCamera(0, true);
      if (changed) {
        this.resetControls();
        this.requestPause();
      } else if (this.halted && this.pauseKind === "pause") {
        this.updateCamera(0, true);
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
    excludedCircle?: { center: Point; radius: number; clearance: number },
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
        this.currentWorld === "ocean" && !isSafeOceanSpawn(p, this.snake, this.oceanCorals, this.oceanCurrents, OW.obstacleClearance) ||
        this.coins.some((c) => c.active && distance(p, c) < 60) ||
        (this.power && distance(p, this.power) < 75) ||
        (this.fruit?.active && distance(p, this.fruit) < 75) ||
        (this.boss && distance(p, this.boss.image) < 120) ||
        (excludedCircle && !isOutsideKrakenArena(p, excludedCircle.center, excludedCircle.radius, excludedCircle.clearance))
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
      coin.spawn(p.x, p.y, ["firefly", "bee"].includes(save.profile.selectedPet ?? "") ? "firefly" : false, this.powers.luckyStar > 0, this.currentWorld === "candy-world");
      if (this.currentWorld === "ocean" && this.inOceanRegion("deep_trench", p) && Math.random() < OW.deepTrenchRareCoinBonus) {
        const rare = [B.coins.find((kind) => kind.id === "blue")!, B.coins.find((kind) => kind.id === "diamond")!];
        const selected = rare[Math.random() < 0.8 ? 0 : 1];
        coin.kind = selected as typeof coin.kind;
        coin.image.setTexture(`coin-${selected.id}`);
        coin.label.setText(selected.label);
      }
      active++;
    }
  }
  private spawnObstacle(initial = false) {
    let p = this.validPoint(85, B.spawn.headClearance);
    if (this.currentWorld === "ocean") return;
    if (this.currentWorld === "candy-world") {
      const a = B.arena;
      for (let attempt = 0; p && attempt < 16 && !candyObstacleSafe(p, this.snake, this.boss ? this.boss.image : undefined, this.stickyZones, CW.lollipops.clearance); attempt++)
        p = this.validPoint(85, B.spawn.headClearance);
      if (p && !candyObstacleSafe(p, this.snake, this.boss ? this.boss.image : undefined, this.stickyZones, CW.lollipops.clearance)) return;
      if (p && (Math.hypot(p.x - (a.left + (a.right-a.left)*CW.plaza.x), p.y - (a.top + (a.bottom-a.top)*CW.plaza.y)) < Math.min(a.right-a.left,a.bottom-a.top)*CW.plaza.radiusX || inCandyRiver(p,a.left,a.top,a.right,a.bottom))) return;
    }
    if (!p) return;
    if (this.currentWorld === "candy-world") this.addLollipop(p.x, p.y, Math.random() < 0.3 ? CW.lollipops.small : Math.random() < 0.65 ? CW.lollipops.medium : CW.lollipops.large);
    else this.obstacles.push(
      new Obstacle(p.x, p.y, this.add.image(p.x, p.y, "rock").setDepth(5), initial),
    );
  }
  private addLollipop(x: number, y: number, scale: number) {
    const g = this.add.graphics().setPosition(x, y).setDepth(5);
    this.candyWorldObjects.push(g);
    g.fillStyle(0x895032, 0.22).fillEllipse(0, 23 * scale, 48 * scale, 18 * scale);
    g.fillStyle(0xf4e3c4).fillRoundedRect(-5 * scale, -3 * scale, 10 * scale, 34 * scale, 4 * scale);
    g.fillStyle(0xd84d9e).fillCircle(0, -14 * scale, 25 * scale);
    g.lineStyle(4 * scale, 0xffe4a4).beginPath().arc(0, -14 * scale, 15 * scale, 0, Math.PI * 1.7).strokePath();
    this.obstacles.push(new Obstacle(x, y, g as unknown as Phaser.GameObjects.Image, true));
  }
  private buildCandyWorld(g: Phaser.GameObjects.Graphics) {
    const a = B.arena, w = a.right-a.left, h = a.bottom-a.top;
    for (const region of candyRegions(a.left,a.top,a.right,a.bottom)) {
      const colors: Record<string, number> = { candy_plaza: 0xffe5a8, lollipop_forest: 0xd6edb2, syrup_swamp: 0xf0bddc, gummy_garden: 0xc6edd7, boss_area: 0xffd5ef };
      g.fillStyle(colors[region.id], 0.34).fillEllipse(region.x,region.y,region.width,region.height);
    }
    this.candyWorldObjects.push(g);
    const plazaX=a.left+w*CW.plaza.x, plazaY=a.top+h*CW.plaza.y;
    g.fillStyle(0xfff1c9,0.7).fillEllipse(plazaX,plazaY,w*CW.plaza.radiusX,h*CW.plaza.radiusY);
    const labels:[string,number,number][]=[["CANDY PLAZA",plazaX,plazaY],["LOLLIPOP FOREST",a.left+w*.2,a.top+h*.12],["SYRUP SWAMP",a.left+w*.8,a.top+h*.12],["GUMMY GARDEN",a.left+w*.2,a.top+h*.57],["CANDY BOSS ARENA",a.left+w*.79,a.top+h*.57]];
    for(const [label,x,y] of labels)this.candyWorldObjects.push(this.add.text(x,y,label,{fontSize:"20px",fontStyle:"bold",color:"#8a4d75",backgroundColor:"#fff5e0aa",padding:{x:8,y:4}}).setOrigin(.5).setDepth(2));
    const riverY=a.top+h*CW.river.y;
    g.fillStyle(0x70412f,0.82).fillRoundedRect(a.left+10,riverY-h*CW.river.halfWidth,w-20,h*CW.river.halfWidth*2,18);
    for(const bridgeX of CW.river.bridges){ const x=a.left+w*bridgeX; g.fillStyle(0xd9aa69).fillRoundedRect(x-w*CW.river.bridgeHalfWidth,riverY-h*0.025,w*CW.river.bridgeHalfWidth*2,h*0.05,10); g.lineStyle(3,0xf7dda4,0.85); for(let i=-1;i<=1;i++)g.lineBetween(x-w*CW.river.bridgeHalfWidth,riverY+i*12,x+w*CW.river.bridgeHalfWidth,riverY+i*12); }
    g.fillStyle(0xf6c6e2,0.72).fillEllipse(a.left+w*0.79,a.top+h*0.64,w*0.28,h*0.23).lineStyle(5,0xe987c4).strokeEllipse(a.left+w*0.79,a.top+h*0.64,w*0.28,h*0.23);
    this.stickyGraphics=this.add.graphics().setDepth(3);
    this.candyWorldObjects.push(this.stickyGraphics);
    for(let i=0;i<CW.lollipops.count;i++) { const x=a.left+w*(0.08+((i*37)%29)/100), y=a.top+h*(0.1+((i*53)%29)/100); if(Math.hypot(x-plazaX,y-plazaY)>Math.min(w,h)*CW.plaza.radiusX*1.35)this.addLollipop(x,y,i%4===0?CW.lollipops.large:i%2===0?CW.lollipops.medium:CW.lollipops.small); }
    for(let i=0;i<CW.gummies.count;i++){const x=a.left+w*(0.09+((i*23)%30)/100),y=a.top+h*(0.57+((i*17)%24)/100);const graphic=this.add.graphics().setPosition(x,y).setDepth(6);this.candyWorldObjects.push(graphic);graphic.fillStyle(0x62c99a).fillRoundedRect(-20,-20,40,40,12).lineStyle(3,0xffffff,0.8).strokeRoundedRect(-20,-20,40,40,12);const obstacle=new Obstacle(x,y,graphic as unknown as Phaser.GameObjects.Image,true);this.obstacles.push(obstacle);this.tweens.add({targets:graphic,y:y-CW.gummies.hopDistance,duration:CW.gummies.hopDuration*500,yoyo:true,repeat:-1,hold:CW.gummies.pauseDuration*500,ease:"Sine.easeInOut"});}
    this.spawnStickyZones(CW.sticky.initialZones);
  }
  private buildOceanWorld(g: Phaser.GameObjects.Graphics) {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    const regions = oceanRegions(a.left, a.top, a.right, a.bottom);
    this.oceanObjects.push(g);
    // Muted sand and lagoon relief, with a darker optional trench.
    g.fillStyle(0xf0e4bd, 0.52).fillEllipse(regions[0].x, regions[0].y, regions[0].width, regions[0].height);
    g.fillStyle(0x173e66, 0.18).fillEllipse(regions[4].x, regions[4].y, regions[4].width, regions[4].height);
    g.lineStyle(8, 0x9dc7d0, 0.3).strokeEllipse(regions[0].x, regions[0].y, regions[0].width, regions[0].height);
    const labels: Record<string, string> = { coral_lagoon: "CORAL LAGOON", coral_reef: "CORAL REEF", current_channel: "CURRENT CHANNEL", bubble_garden: "BUBBLE GARDEN", deep_trench: "DEEP TRENCH", kraken_arena: "KRAKEN ARENA" };
    for (const region of regions) {
      this.oceanObjects.push(this.add.text(region.x, region.y - region.height * 0.35, labels[region.id], { fontSize: "17px", fontStyle: "bold", color: region.id === "deep_trench" ? "#b8e5f0" : "#315b67", backgroundColor: "#eaf8ef99", padding: { x: 7, y: 3 } }).setOrigin(0.5).setDepth(2));
    }
    // Coral Lagoon remains a low-hazard portal arrival/respite area.
    const lagoon = regions[0];
    for (let i = 0; i < 8; i++) {
      const x = lagoon.x + Math.cos(i * Math.PI / 4) * lagoon.width * 0.34;
      const y = lagoon.y + Math.sin(i * Math.PI / 4) * lagoon.height * 0.34;
      g.fillStyle(i % 2 ? 0xff9d88 : 0xf4b9a4, 0.62).fillCircle(x, y, 7 + (i % 3) * 3);
    }
    // Ring ruin and sparse pillars frame the optional Kraken encounter, without triggering it.
    const arena = regions[5], radius = Math.min(w, h) * OW.krakenArena.radius;
    g.lineStyle(10, 0x587a84, 0.55).strokeCircle(arena.x, arena.y, radius);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const x = arena.x + Math.cos(angle) * radius * 0.82, y = arena.y + Math.sin(angle) * radius * 0.82;
      g.fillStyle(0x64868b, 0.7).fillRoundedRect(x - 13, y - 23, 26, 46, 7);
      g.fillStyle(0xf18778, 0.75).fillEllipse(x, y + 23, 24, 10);
    }
    this.oceanCurrents = oceanCurrentZones(a.left, a.top, a.right, a.bottom, this.snake);
    this.currentGraphics = this.add.graphics().setDepth(3);
    this.oceanObjects.push(this.currentGraphics);
    this.drawOceanCurrents();
    // Sparse, non-colliding sea life and light shafts.
    for (let i = 0; i < 12; i++) {
      const x = a.left + w * (0.08 + (i * 37 % 84) / 100), y = a.top + h * (0.08 + (i * 53 % 82) / 100);
      const fish = this.add.ellipse(x, y, 17, 7, i % 2 ? 0x83b7be : 0xc3dce0, 0.42).setDepth(2);
      this.oceanDecorations.push(fish);
      this.tweens.add({ targets: fish, x: x + (i % 2 ? 55 : -55), duration: 5000 + i * 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    for (let i = 0; i < 7; i++) {
      const x = a.left + w * (0.12 + i * 0.12);
      const light = this.add.rectangle(x, a.top + h * 0.18, 30, h * 0.36, 0xd9f3eb, 0.08).setAngle(-12 + i * 4).setDepth(1);
      this.oceanDecorations.push(light);
    }
    const clamX = a.left + w * 0.53, clamY = a.top + h * 0.88;
    const shell = this.add.graphics().fillStyle(0xc9a88d).fillEllipse(0, 11, 66, 24).lineStyle(4, 0x836f72).strokeEllipse(0, 11, 66, 24);
    const top = this.add.graphics().fillStyle(0xd6bba4).fillEllipse(0, -1, 60, 24).lineStyle(3, 0x927d7a).strokeEllipse(0, -1, 60, 24);
    const clamImage = this.add.container(clamX, clamY, [shell, top]).setDepth(7);
    this.oceanObjects.push(clamImage);
    this.clam = { x: clamX, y: clamY, state: "CLOSED", image: clamImage, timer: OW.pearlCooldown + Math.random() * OW.pearlCooldown };
    this.addOceanBubble(false);
  }
  private drawOceanCurrents() {
    if (!this.currentGraphics) return;
    const g = this.currentGraphics;
    g.clear();
    for (const zone of this.oceanCurrents) {
      g.fillStyle(zone.type === "RAPID" ? 0x71d5ee : 0x8fd9e6, 0.055 + zone.visualIntensity * 0.08).fillRoundedRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height, 30);
      g.lineStyle(2, 0x70bacb, zone.visualIntensity * 0.55);
      const horizontal = Math.abs(zone.direction.x) >= Math.abs(zone.direction.y);
      for (let i = 0; i < 5; i++) {
        const offset = (i - 2) * Math.max(14, zone.height * 0.12);
        const x1 = horizontal ? zone.x - zone.width * 0.38 : zone.x + offset;
        const y1 = horizontal ? zone.y + offset : zone.y - zone.height * 0.36;
        const x2 = horizontal ? zone.x + zone.width * 0.38 : zone.x + offset + zone.direction.x * 16;
        const y2 = horizontal ? zone.y + offset + zone.direction.y * 16 : zone.y + zone.height * 0.36;
        g.lineBetween(x1, y1, x2, y2);
      }
    }
  }
  private spawnOceanCorals() {
    const a = B.arena;
    const reef = oceanRegions(a.left, a.top, a.right, a.bottom)[1];
    const kinds = ["smallCoral", "mediumCoral", "largeCoral", "coralRock"] as const;
    for (let i = 0; i < OW.coralDensity; i++) {
      const x = reef.x + ((i * 113) % Math.max(1, reef.width * 0.78)) - reef.width * 0.39;
      const y = reef.y + ((i * 167) % Math.max(1, reef.height * 0.78)) - reef.height * 0.39;
      const lagoon = oceanRegions(a.left, a.top, a.right, a.bottom)[0];
      if (Math.abs(x - lagoon.x) < lagoon.width * 0.7 && Math.abs(y - lagoon.y) < lagoon.height * 0.7) continue;
      if (Math.abs(y - a.top) < 100 || Math.abs(y - a.bottom) < 100) continue;
      if (Math.hypot(x - this.snake.x, y - this.snake.y) < OW.safeSpawnDistance || this.oceanCorals.some((c) => Math.hypot(x - c.x, y - c.y) < 108)) continue;
      const kind = kinds[i % kinds.length], radius = kind === "smallCoral" ? 19 : kind === "mediumCoral" ? 27 : kind === "largeCoral" ? 35 : 30;
      const colors: Record<typeof kind, number> = { smallCoral: 0xe78e8c, mediumCoral: 0xf29a91, largeCoral: 0xd77c83, coralRock: 0x657c82 };
      const graphics = this.add.graphics().setPosition(x, y).setDepth(5);
      graphics.fillStyle(colors[kind], 0.24).fillEllipse(0, radius * 0.7, radius * 2.8, radius * 1.1);
      graphics.fillStyle(colors[kind], 0.95).fillCircle(-radius * 0.45, 0, radius * 0.52).fillCircle(radius * 0.4, -radius * 0.2, radius * 0.62).fillCircle(0, -radius * 0.62, radius * 0.46);
      graphics.lineStyle(2, 0xffffff, 0.4).strokeCircle(-radius * 0.45, 0, radius * 0.52).strokeCircle(radius * 0.4, -radius * 0.2, radius * 0.62);
      this.oceanObjects.push(graphics);
      const obstacle = { x, y, radius, kind };
      this.oceanCorals.push(obstacle);
      this.obstacles.push(new Obstacle(x, y, graphics as unknown as Phaser.GameObjects.Image, true));
    }
  }
  private inOceanRegion(region: "deep_trench" | "bubble_garden", point: Point = this.snake): boolean {
    const item = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((candidate) => candidate.id === region);
    return !!item && Math.abs(point.x - item.x) <= item.width / 2 && Math.abs(point.y - item.y) <= item.height / 2;
  }
  private addOceanBubble(bonus: boolean) {
    if (bonus && this.bubbleObjects.filter((bubble) => bubble.bonus).length >= OW.maxBonusBubbles) return;
    const garden = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "bubble_garden")!;
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = garden.x + Phaser.Math.Between(-garden.width * 0.35, garden.width * 0.35), y = garden.y + Phaser.Math.Between(-garden.height * 0.35, garden.height * 0.35);
      if (distance({ x, y }, this.snake) < B.spawn.headClearance || this.oceanCorals.some((coral) => distance(coral, { x, y }) < coral.radius + 36)) continue;
      const image = this.add.circle(x, y, bonus ? 14 : 8, bonus ? 0x9deaff : 0xdaf9ff, bonus ? 0.75 : 0.38).setStrokeStyle(2, 0xffffff, 0.8).setDepth(6);
      this.bubbleObjects.push({ image, life: bonus ? OW.bubbleLifetime : 18, bonus });
      this.oceanObjects.push(image);
      return;
    }
  }
  private updateOcean(dt: number) {
    if (this.currentWorld !== "ocean") return;
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = OW.bubbleCooldown;
      if (Math.random() < OW.bubbleSpawnRate) this.addOceanBubble(Math.random() < OW.bonusBubbleChance);
    }
    for (const bubble of [...this.bubbleObjects]) {
      bubble.life -= dt;
      bubble.image.y -= dt * 5;
      if (bubble.life <= 0) { bubble.image.destroy(); this.bubbleObjects.splice(this.bubbleObjects.indexOf(bubble), 1); continue; }
      if (bubble.bonus && distance(bubble.image, this.snake) < 32) {
        const reward = bonusBubbleReward(Math.random());
        const combo = this.combo.collect();
        this.run.matchCoins += reward.coins;
        this.run.score += reward.coins * 10 * combo;
        this.run.maxCombo = this.combo.max;
        this.turbo.energy = Math.min(100, this.turbo.energy + reward.turbo);
        if (reward.blue) { const blue = B.coins.find((coin) => coin.id === "blue")!; this.run.matchCoins += blue.value; this.run.score += blue.score * combo; this.run.maxCombo = this.combo.max; }
        this.feedback(bubble.image.x, bubble.image.y, `POP! +${reward.coins}${reward.blue ? " +5" : ""}`, 0x9deaff);
        audio.play("bubble_pop"); haptic("coin");
        bubble.image.destroy(); this.bubbleObjects.splice(this.bubbleObjects.indexOf(bubble), 1);
      }
    }
    const current = this.oceanCurrents.find((zone) => this.snake.x >= zone.x - zone.width / 2 && this.snake.x <= zone.x + zone.width / 2 && this.snake.y >= zone.y - zone.height / 2 && this.snake.y <= zone.y + zone.height / 2);
    if (current && this.currentZoneId !== `${current.type}:${current.x}`) {
      this.currentZoneId = `${current.type}:${current.x}`;
      if (current.type !== "SOFT") haptic("coin");
      if (!save.profile.hints.oceanCurrent) { save.profile.hints.oceanCurrent = true; void save.save(); this.ui.toast("Currents push you. Steer against them!"); }
    } else if (!current) this.currentZoneId = undefined;
    const deep = this.inOceanRegion("deep_trench");
    if (deep && !this.deepTrenchActive && !save.profile.hints.deepTrench) { save.profile.hints.deepTrench = true; void save.save(); this.ui.toast("Deep Trench: greater risk, better rewards."); }
    this.deepTrenchActive = deep;
    if (this.clam && this.clam.state === "CLOSED") {
      this.clam.timer -= dt;
      if (this.clam.timer <= 0 || distance(this.clam, this.snake) < OW.tutorialRadius) {
        this.clam.state = "OPENING"; this.clam.timer = 0.45; audio.play("clam_open");
        this.tweens.add({ targets: this.clam.image.list[1], y: -17, duration: 380, ease: "Sine.easeOut" });
      }
    } else if (this.clam?.state === "OPENING") {
      this.clam.timer -= dt;
      if (this.clam.timer <= 0) {
        const slot = this.coins.find((coin) => !coin.active);
        if (slot && pearlCoinSpawnAllowed("ocean", Math.random(), OW.pearlCoinChance, this.inOceanRegion("deep_trench", this.clam))) {
          this.clam.state = "OPEN";
          slot.spawnPearl(this.clam.x, this.clam.y - 8);
          this.clam.coin = slot;
          if (!save.profile.hints.pearl) { save.profile.hints.pearl = true; void save.save(); this.ui.toast("Pearls are rare and valuable!"); }
        } else {
          this.clam.state = "EMPTY";
          this.clam.timer = OW.pearlCooldown;
        }
      }
    }
    if (this.clam?.state === "EMPTY") this.clam.timer -= dt;
    if (this.clam?.state === "EMPTY" && this.clam.timer <= 0) {
      this.clam.state = "CLOSED";
      this.clam.timer = OW.pearlCooldown + Math.random() * OW.pearlCooldown;
    }
    this.pearlTimer -= dt;
    if (this.pearlTimer <= 0) {
      const hasPearl = this.coins.some((coin) => coin.active && coin.kind.id === "pearl_coin");
      if (!hasPearl && this.clam?.state !== "CLOSED" && pearlCoinSpawnAllowed("ocean", Math.random(), OW.pearlCoinChance, deep)) {
        const slot = this.coins.find((coin) => !coin.active), point = this.validPoint(B.spawn.bodyClearance, 150);
        if (slot && point && !this.oceanCorals.some((coral) => distance(point, coral) < coral.radius + 50)) {
          slot.spawnPearl(point.x, point.y);
          if (!save.profile.hints.pearl) { save.profile.hints.pearl = true; void save.save(); this.ui.toast("Pearls are rare and valuable!"); }
        }
      }
      this.pearlTimer = OW.pearlCooldown;
    }
    if (this.clam?.state === "OPEN" && this.clam.coin && !this.clam.coin.active) { this.clam.state = "EMPTY"; this.clam.coin = undefined; this.clam.timer = OW.pearlCooldown; }
    if (this.currentGraphics) this.currentGraphics.setAlpha(0.75 + Math.sin(this.run.elapsed * 1.5) * 0.12);
  }
  private spawnStickyZones(count: number) {
    const a=B.arena,w=a.right-a.left,h=a.bottom-a.top;
    for(let i=0;i<count&&this.stickyZones.length<CW.sticky.maxZones;i++){
      const point={x:a.left+w*(0.72+Math.random()*0.2),y:a.top+h*(0.1+Math.random()*0.32)};
      const plazaX=a.left+w*CW.plaza.x,plazaY=a.top+h*CW.plaza.y;
      if(Math.hypot(point.x-plazaX,point.y-plazaY)<Math.min(w,h)*CW.plaza.radiusX+100)continue;
      const passage=this.worldPassages.find((item)=>item.active);
      if(passage&&Math.hypot(point.x-passage.x,point.y-passage.y)<170)continue;
      if(Math.hypot(point.x-this.snake.x,point.y-this.snake.y)<260||this.boss&&Math.hypot(point.x-this.boss.image.x,point.y-this.boss.image.y)<220)continue;
      if(this.stickyZones.some(zone=>Math.hypot(point.x-zone.x,point.y-zone.y)<zone.radius+CW.sticky.minRadius))continue;
      this.stickyZones.push({...point,radius:Phaser.Math.Between(CW.sticky.minRadius,CW.sticky.maxRadius)});
    }
    this.renderStickyZones();
  }
  private renderStickyZones(){const g=this.stickyGraphics;if(!g)return;g.clear();for(const z of this.stickyZones)g.fillStyle(0xd77cbb,0.38).fillEllipse(z.x,z.y,z.radius*2,z.radius*1.25).lineStyle(4,0xa9468a,0.7).strokeEllipse(z.x,z.y,z.radius*2,z.radius*1.25);}
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
    while (this.accumulator >= 1 / 120 && !this.dead && !this.halted) {
      this.step(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.renderSnake();
    this.hud.update(this.run, this.combo, this.powers, this.turbo);
    if (this.bossEnergyHud && !this.boss) this.bossEnergyHud.textContent = this.rushMode
      ? `COIN RUSH · ${Math.ceil(this.run.rushRemaining)} s restantes`
      : `BOSS ENERGY ${Math.floor(this.run.bossEnergy)}/${this.bossEnergyRequirement()}`;
    this.updateCamera(Math.min(delta / 1000, 0.05));
  }
  private step(dt: number) {
    this.passageCooldown = Math.max(0, this.passageCooldown - dt);
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
    const d = difficulty(this.run.elapsed, this.run.score, this.snake.length, save.profile.settings.speedPreference);
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
    this.krakenReturnTimer = Math.max(0, this.krakenReturnTimer - dt);
    if (this.krakenReturnTimer > 0 && this.krakenReturnAngle !== undefined) target = this.krakenReturnAngle;
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
    const playerSpeed = d.speed * this.worldSpeedMultiplier * (this.powers.slowed > 0 ? B.hazard.slowMultiplier : 1) * (this.powers.precision > 0 ? B.power.precisionSpeed : 1) *
      (this.currentWorld === "candy-world"
        ? candyFinalSpeed(1, this.turbo.active ? B.power.turboSpeed : 1, this.stickySpeed) * (inCandyRiver(this.snake, B.arena.left, B.arena.top, B.arena.right, B.arena.bottom) ? CW.river.slowMultiplier : 1)
        : this.turbo.active ? B.power.turboSpeed : 1);
    const steeringTarget = this.steering.update(target, dt);
    if (this.currentWorld === "ocean") {
      const force = currentForceAt(this.snake, this.oceanCurrents);
      this.snake.moveVector(dt, steeringTarget, playerSpeed, force, controls.turnSpeed * (this.turbo.active ? controls.turboTurnMultiplier : 1) * (this.powers.precision > 0 ? B.power.precisionTurn : 1), OW.maxEffectiveSpeed);
    } else {
      this.snake.move(dt, steeringTarget, playerSpeed, controls.turnSpeed * (this.turbo.active ? controls.turboTurnMultiplier : 1) * (this.powers.precision > 0 ? B.power.precisionTurn : 1));
    }
    this.krakenBarrierCooldown = Math.max(0, this.krakenBarrierCooldown - dt);
    this.containSnakeInKrakenArena();
    if (this.currentWorld === "candy-world") {
      const insideSticky = this.stickyZones.some((zone) => Math.hypot(this.snake.x-zone.x,this.snake.y-zone.y)<zone.radius);
      const wasSticky = this.stickySpeed < 0.99;
      this.stickySpeed = stickySpeedMultiplier(this.stickySpeed, insideSticky, dt);
      if (insideSticky && !wasSticky && this.run.elapsed >= this.stickyFeedbackAt) {
        this.stickyFeedbackAt=this.run.elapsed+CW.sticky.feedbackCooldown;
        this.feedback(this.snake.x,this.snake.y,"STICKY!",0xd77cbb);
        audio.play("power"); haptic("coin");
      }
      if (Math.floor(this.run.elapsed/CW.sticky.spawnInterval)!==Math.floor((this.run.elapsed-dt)/CW.sticky.spawnInterval) && Math.random()<0.65) this.spawnStickyZones(1);
      this.candyCoinTimer-=dt;
      if(!this.candyCoinSpawned&&this.candyCoinTimer<=0&&candyCoinSpawnAllowed(this.currentWorld,Math.random(),CW.candyCoin.chance)){const slot=this.coins.find(c=>!c.active),p=this.validPoint(B.spawn.bodyClearance,110);if(slot&&p){slot.spawnCandy(p.x,p.y);this.candyCoinSpawned=true;}}
    }
    this.updateOcean(dt);
    const passage = !this.boss && this.worldPassages.find((item) => item.visible && distance(this.snake, item) < 68);
    if (passage && !this.worldTransitioning && this.passageCooldown <= 0) {
      const arena = B.arena;
      const sourceSide = passage.x <= (arena.left + arena.right) / 2 ? "left" : "right";
      const direction = sourceSide === "left" ? Math.PI : 0;
      this.enterWorld(passage.getData("destination") as string, sourceSide, passage.y, direction);
      return;
    }
    if (!this.boss && this.bossPortal && this.bossPortal.visible && distance(this.snake, this.bossPortal) >= 100) {
      this.bossPortal.setData("hintDismissed", false);
    }
    if (!this.boss && this.bossPortal && this.bossPortal.visible && distance(this.snake, this.bossPortal) < 75 && !this.bossPortal.getData("hintDismissed") && !this.bossIntroOpen) {
      const requiredEnergy = this.bossEnergyRequirement(this.bossDefinition?.id);
      if (this.run.bossEnergy < requiredEnergy) {
        const energy = Math.floor(this.run.bossEnergy);
        if (this.bossPortal.getData("lastEnergyNotice") !== energy) {
          this.bossPortal.setData("lastEnergyNotice", energy);
          this.ui.toast(`Portal de chefe: colete ${requiredEnergy} Boss Energy para entrar. Atual: ${energy}.`);
        }
      } else if (this.bossDefinition) {
        const definition = this.bossDefinition;
        this.halted = true;
        this.bossIntroOpen = true;
        this.resetControls();
        this.overlay = this.ui.modal(
          `⚔️ ${definition.name}`,
          `${definition.entryHint}\n\nA luta é opcional. Sua Boss Energy só será usada quando começar.`,
          [{
            label: "Começar luta",
            run: () => {
              if (!this.bossIntroOpen || this.boss || !this.scene.isActive()) return;
              this.overlay?.destroy();
              this.overlay = undefined;
              this.bossIntroOpen = false;
              this.resetControls();
              this.accumulator = 0;
              this.run.bossEnergy -= requiredEnergy;
              this.startBoss(definition);
              this.halted = false;
            },
          }, {
            label: "Agora não",
            run: () => {
              if (!this.bossIntroOpen) return;
              this.bossPortal?.setData("hintDismissed", true);
              this.bossIntroOpen = false;
              this.continue();
            },
          }],
        );
      }
    }
    if (this.halted) return;
    if (!this.boss && this.bossPortal && this.bossPortalExpiresAt > 0 && this.run.elapsed >= this.bossPortalExpiresAt) {
      this.bossPortal.destroy();
      this.bossPortal = undefined;
      this.bossDefinition = undefined;
      this.bossPortalExpiresAt = 0;
      this.ui.toast(`Portal de chefe expirou. Boss Energy (${Math.floor(this.run.bossEnergy)}) preservada.`);
    }
    if (this.boss) this.updateBoss(dt);
    else if (!this.rushMode) this.refreshWorldPassages();
    for (const o of this.obstacles) {
      if (o.warning > 0 && distance(o, this.snake) < 110)
        o.warning = Math.max(o.warning, 0.3);
      o.update(dt);
    }
    const a = B.arena,
      r = B.snake.radius;
    const wall = !this.isAtOpenPassage() && (
      this.snake.x < a.left + r ||
      this.snake.x > a.right - r ||
      this.snake.y < a.top + r ||
      this.snake.y > a.bottom - r
    );
    const overlappingObstacle = this.obstacles.find(
      (o) => o.warning === 0 && distance(this.snake, o) < (this.currentWorld === "ocean" ? (this.oceanCorals.find((coral) => coral.x === o.x && coral.y === o.y)?.radius ?? 24) + B.snake.radius : 44),
    );
    const overlappingBody = this.snake.selfCollision();
    const ghostActive = this.powers.updateGhost(dt, overlappingBody || !!overlappingObstacle);
    const obstacle = ghostActive ? undefined : overlappingObstacle;
    if (wall || obstacle || (!ghostActive && overlappingBody)) {
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
      if (coin.kind.id !== "mythic" && coin.kind.id !== "candy_coin" && this.powers.magnet > 0 && dist < B.power.magnetRadius && dist > 1) {
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
          const pet = save.profile.selectedPet;
          const bonus = (kind.id === "magnet" && pet === "baby-octopus") || (kind.id === "turbo" && pet === "tiny-dragon") ? 0.05 : kind.id === "ghost" && pet === "tidal-turtle" ? 0.1 : 0;
          this.powers.activate(kind.id, bonus);
          const powerMessage = kind.id === "precision" ? "FREIO PRECISO!" : kind.id === "lucky-star" ? "ESTRELA DA SORTE!" : kind.id === "ghost" ? "FANTASMA!" : kind.name;
          this.feedback(this.power.x, this.power.y, powerMessage, kind.color);
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
    if (this.poison) {
      this.poison.life -= dt;
      if (distance(this.poison, this.snake) < 40) {
        this.powers.applyPoison();
        this.feedback(this.poison.x, this.poison.y, "VENENO! LENTO", 0x45d66b);
        audio.play("power");
        haptic("power");
        this.poison.image.destroy();
        this.poison = undefined;
      } else if (this.poison.life <= 0) {
        this.poison.image.destroy();
        this.poison = undefined;
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
      if (!this.power && !this.poison && Math.random() < 0.08) {
        const p = this.validPoint(55, 100);
        if (p) this.poison = { ...p, life: B.power.lifetime, image: this.add.image(p.x, p.y, "hazard-poison").setDepth(6) };
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
    this.skinTrail.clear();
    if (this.selectedCosmetic.trailConfig.enabled && this.snake.length > 1) {
      this.skinTrail.lineStyle(this.selectedCosmetic.trailConfig.width, this.selectedCosmetic.trailConfig.color, this.turbo.active ? 0.78 : 0.34);
      this.skinTrail.beginPath();
      for (let i = 0; i < Math.min(this.snake.length, 16); i++) {
        const point = this.snake.body[i];
        if (i === 0) this.skinTrail.moveTo(point.x, point.y); else this.skinTrail.lineTo(point.x, point.y);
      }
      this.skinTrail.strokePath();
    }
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
        this.powers.ghost > 0 || this.powers.ghostGrace > 0
          ? 0.42 + Math.sin(this.run.elapsed * 18) * 0.12
          : this.powers.invincible > 0
          ? 0.55 + Math.sin(this.run.elapsed * 20) * 0.25
          : 1,
      );
      if (this.turbo.active && this.selectedCosmetic.turboEffect !== "none" && i === 0)
        image.setTint(this.selectedCosmetic.trailConfig.color);
      else image.clearTint();
    }
    this.skinParticles?.setPosition(this.snake.x, this.snake.y);
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
    if (this.powers.ghost > 0 || this.powers.ghostGrace > 0)
      this.ring.lineStyle(4, 0x8be9ff, 0.75).strokeCircle(this.snake.x, this.snake.y, 32);
    if (this.powers.magnet > 0)
      this.ring
        .lineStyle(2, 0xdc6c98, 0.3)
        .strokeCircle(this.snake.x, this.snake.y, B.power.magnetRadius);
    if (this.turbo.active)
      this.ring
        .lineStyle(4, this.selectedCosmetic.turboEffect === "none" ? 0xffbb50 : this.selectedCosmetic.trailConfig.color, 0.85)
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
    const completedMissions = reportRun(save.profile, this.run);
    void save.save();
    for (const id of completedMissions) {
      const mission = missionsForProfile(save.profile.dailyMissionIds).find((entry) => entry.id === id);
      if (mission) this.ui.toast(`Missão concluída: ${mission.title} · +${mission.reward} moedas e +${B.xp.perMission} XP`);
    }
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
    this.showPauseModal();
  }
  private showPauseModal() {
    this.overlay = this.ui.modal("Pausado", "Seu vale pode esperar.", [
      { label: "Continuar", run: () => this.continue() },
      {
        label: `Câmera: ${save.profile.settings.cameraMode === "standard" ? "Padrão" : "Panorâmica"}`,
        run: () => {
          this.overlay?.destroy();
          this.overlay = undefined;
          save.profile.settings.cameraMode = save.profile.settings.cameraMode === "standard" ? "panoramic" : "standard";
          this.applyCameraZoom(this.scale.width, this.scale.height);
          this.updateCamera(0, true);
          void save.save();
          this.showPauseModal();
        },
      },
      {
        label: save.profile.settings.muted ? "Ativar som" : "Desativar som",
        run: () => {
          this.overlay?.destroy();
          this.overlay = undefined;
          save.profile.settings.muted = !save.profile.settings.muted;
          audio.sync();
          void save.save();
          this.showPauseModal();
        },
      },
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
    this.bossIntroOpen = false;
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
    let p = this.validPoint(60, 90, true);
    if (this.currentWorld === "ocean" && p && Math.random() < OW.shrinkFruitBonusChance) {
      const regions = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom);
      const reef = regions.find((region) => region.id === "coral_reef")!, trench = regions.find((region) => region.id === "deep_trench")!;
      const region = Math.random() < 0.55 ? reef : trench;
      const candidate = { x: region.x + Phaser.Math.Between(-region.width * 0.24, region.width * 0.24), y: region.y + Phaser.Math.Between(-region.height * 0.22, region.height * 0.22) };
      if (distance(candidate, this.snake) > B.spawn.headClearance && !this.oceanCorals.some((coral) => distance(candidate, coral) < coral.radius + 50)) p = candidate;
    }
    if (this.currentWorld === "candy-world" && p && Math.random() < CW.shrinkFruit.bonusChance) {
      const a=B.arena, candidates=candyRegions(a.left,a.top,a.right,a.bottom).filter((region)=>region.id==="boss_area"||region.id==="lollipop_forest");
      const region= candidates[Phaser.Math.Between(0,candidates.length-1)];
      const candidate={x:region.x+Phaser.Math.Between(-region.width*0.3,region.width*0.3),y:region.y+Phaser.Math.Between(-region.height*0.3,region.height*0.3)};
      if(distance(candidate,this.snake)>B.spawn.headClearance&&distance(candidate,this.snake)<CW.shrinkFruit.areaRadius+300&&!this.obstacles.some(o=>distance(candidate,o)<100))p=candidate;
    }
    if (!p) return;
    this.fruit.spawn(p.x, p.y);
    if (!save.profile.hints.shrink) {
      save.profile.hints.shrink = true;
      void save.save();
      this.ui.toast("A fruta roxa reduz seu tamanho em 25%.");
    }
  }
  private collectCoin(coin: Coin) {
    if (coin.kind.id === "candy_coin" && this.currentWorld !== "candy-world") return;
    if (coin.kind.id === "pearl_coin" && this.currentWorld !== "ocean") return;
    const combo = this.combo.collect();
    this.run.score +=
      coin.kind.score *
      combo *
      (this.powers.turbo > 0 ? B.power.turboScore : 1);
    this.run.matchCoins += coin.kind.value;
    this.run.maxCombo = this.combo.max;
    if (coin.kind.id === "pearl_coin" && !save.profile.hints.pearl) { save.profile.hints.pearl = true; void save.save(); this.ui.toast("Pearls are rare and valuable!"); }
    if (coin.kind.id === "golden") this.run.golden++;
    this.snake.grow();
    if (coin.kind.id !== "pearl_coin") this.turbo.charge(coin.kind.id);
    if (this.boss) {
      if (this.boss.definition.id !== "candy-monster") {
        const charge = this.boss.definition.combat.attackChargePerBossCoin;
        this.bossFight.combat.addCharge(coin.kind.id === "golden" || coin.kind.id === "mythic" ? charge * 2 : charge);
      }
    } else {
      this.run.bossEnergy += this.portalSystem.bossEnergy(coin.kind.id);
      const bossId = worldById(this.currentWorld).bossId;
      const requiredEnergy = this.bossEnergyRequirement(bossId);
      if (
        !this.rushMode &&
        bossId &&
        !this.bossPortal &&
        this.bossDefinition?.id !== bossId &&
        this.run.bossEnergy >= requiredEnergy
      ) {
        this.spawnBossPortal(bossId);
      }
    }
    this.feedback(
      coin.x,
      coin.y,
      `+${coin.kind.value}`,
      coin.kind.color,
        coin.kind.id === "golden" || coin.kind.id === "candy_coin" || coin.kind.id === "pearl_coin",
    );
    audio.play(coin.kind.id === "candy_coin" ? "candy_coin" : coin.kind.id === "pearl_coin" ? "pearl_coin" : `coin_${coin.kind.id}`, combo);
    haptic(coin.kind.id === "golden" ? "golden" : coin.kind.id === "candy_coin" || coin.kind.id === "pearl_coin" ? "power" : "coin");
    analytics.track("coinCollected", { kind: coin.kind.id, value: coin.kind.value });
    if (this.run.matchCoins >= 100) awardAchievement(save.profile, "coin-hunter");
    if (combo >= 5) awardAchievement(save.profile, "combo-master");
  }
  private availablePassageWorlds(): WorldDefinition[] {
    reconcileWorldUnlocks(save.profile);
    return traversableWorlds(save.profile, this.currentWorld);
  }
  private isAtOpenPassage() {
    const r = B.snake.radius;
    return this.worldPassages.some((passage) => Math.hypot(this.snake.x - passage.x, this.snake.y - passage.y) < r + 14);
  }
  private drawWorldPassageMarkers(graphics: Phaser.GameObjects.Graphics) {
    this.worldPassages.forEach((passage) => {
      const world = worldById(passage.getData("destination") as string);
      graphics.fillStyle(world.accent, 0.95).fillRoundedRect(passage.x - 7, passage.y - 28, 15, 56, 6);
    });
  }
  private refreshWorldPassages(exits?: { side: "left" | "right"; y: number }) {
    const targets = this.availablePassageWorlds();
    const current = this.worldPassages.map((item) => item.getData("destination") as string).join(",");
    if (!exits && current === targets.map((world) => world.id).join(",")) return;
    for (const passage of this.worldPassages) passage.destroy();
    this.worldPassages = targets.map((world, index) => {
      const a = B.arena;
      const defaultSide = index % 2 === 0 ? "left" : "right";
      const side = exits && index === 0 ? exits.side : defaultSide;
      const x = side === "left" ? a.left : a.right;
      const defaultY = a.top + (a.bottom - a.top) * ((index + 1) / (targets.length + 1));
      const y = exits && index === 0
        ? Phaser.Math.Clamp(exits.y, a.top + 100, a.bottom - 100)
        : defaultY;
      const g = this.add.graphics().fillStyle(world.accent, 0.2).fillEllipse(0, 0, 82, 82).lineStyle(5, world.accent, 0.95).strokeEllipse(0, 0, 64, 64);
      const label = this.add.text(0, 50, `ENTRAR · ${world.name}`, { fontSize: "15px", color: "#163f36", fontStyle: "bold" }).setOrigin(0.5);
      const passage = this.add.container(x, y, [g, label]).setDepth(9);
      passage.setData("destination", world.id);
      passage.setData("side", side);
      return passage;
    });
  }
  private enterWorld(id: string, sourceSide: "left" | "right", sourceY: number, direction: number) {
    if (this.worldTransitioning) return;
    this.worldTransitioning = true;
    const world = worldById(id);
    this.worldPortal?.destroy(); this.worldPortal = undefined;
    for (const passage of this.worldPassages) passage.destroy();
    this.worldPassages = [];
    this.bossPortal?.destroy(); this.bossPortal = undefined;
    this.krakenBarrier?.destroy(); this.krakenBarrier = undefined;
    this.krakenReturnAngle = undefined; this.krakenReturnTimer = 0;
    this.bossDefinition = undefined;
    this.bossPortalExpiresAt = 0;
    this.currentWorld = world.id;
    void applyWorldOrientation(world.id, save.profile.settings.orientation);
    const arena = B.arena;
    const entrySide = sourceSide === "left" ? "right" : "left";
    const entryX = entrySide === "left" ? arena.left + 48 : arena.right - 48;
    const entryY = Phaser.Math.Clamp(sourceY, arena.top + 100, arena.bottom - 100);
    this.snake.reset(entryX, entryY, direction);
    this.steering.reset(direction);
    this.resetControls();
    this.cameraX = entryX;
    this.cameraY = entryY;
    for (const decoration of this.oceanDecorations) this.tweens.killTweensOf(decoration);
    for (const object of [...this.oceanObjects, ...this.oceanDecorations]) object.destroy();
    this.oceanObjects = []; this.oceanDecorations = []; this.oceanCurrents = []; this.oceanCorals = []; this.bubbleObjects = []; this.currentGraphics = undefined; this.clam = undefined;
    for(const obstacle of this.obstacles) obstacle.destroy();
    this.obstacles=[];
    this.stickyZones=[]; this.stickySpeed=1; this.stickyGraphics?.destroy(); this.stickyGraphics=undefined;
    this.candyCoinSpawned=false; this.candyCoinTimer=CW.candyCoin.opportunitySeconds;
    for(const object of this.candyWorldObjects)object.destroy();
    this.candyWorldObjects=[];
    this.worldSpeedMultiplier = world.speedMultiplier;
    if (world.id !== "green-valley") {
      save.profile.worldsUnlocked = [...new Set([...save.profile.worldsUnlocked, world.id])];
    }
    if (!this.rushMode) rememberWorld(save.profile, world.id);
    this.run.portalsUsed++;
    awardAchievement(save.profile, "world-traveler");
    this.cameras.main.setBackgroundColor(world.background);
    if(world.id==="candy-world") this.buildCandyWorld(this.add.graphics().setDepth(1));
    if(world.id==="ocean") {
      this.buildOceanWorld(this.add.graphics().setDepth(1));
      this.spawnOceanCorals();
      this.pearlTimer = OW.pearlCooldown;
    }
    else for(const obstacle of [...this.obstacles]) if(this.candyWorldObjects.some((object)=>object===obstacle.image)){obstacle.destroy();this.obstacles.splice(this.obstacles.indexOf(obstacle),1);}
    if (world.id !== "ocean") for (const coin of this.coins) if (coin.active && coin.kind.id === "pearl_coin") coin.hide();
    for (const obstacle of this.obstacles) if ("setTint" in obstacle.image) obstacle.image.setTint(world.accent);
    this.ui.get("#world-tag").textContent = world.name.toUpperCase();
    this.ui.get<HTMLElement>("#world-tag").style.backgroundColor = "transparent";
    analytics.track("portalEntered", { world: world.id });
    void save.save();
      this.ui.toast(`Você chegou a ${world.name}.`);
    if(world.id==="candy-world")this.ui.toast("CANDY WORLD · Caramelo reduz sua velocidade!");
    if (world.hazard === "sticky") this.ui.toast("Sticky zones reduzem sua velocidade por instantes.");
    if (world.hazard === "current" && save.profile.hints.ocean) this.ui.toast("Correntes oceânicas empurram sua Snake. Navegue com cuidado.");
    if (world.id === "ocean" && !save.profile.hints.ocean) { save.profile.hints.ocean = true; void save.save(); this.ui.toast("OCEAN WORLD · Currents can push your Snake!"); }
    this.refreshWorldPassages({ side: entrySide, y: entryY });
    this.updateCamera(0, true);
    this.renderSnake();
    this.passageCooldown = 0.75;
    this.worldTransitioning = false;
    if (world.bossId && bosses.some((boss) => boss.id === world.bossId))
      this.spawnBossPortal(world.bossId);
  }
  private spawnBossPortal(bossId: string) {
    if (this.bossPortal || this.dead) return;
    const arenaRegion = bossId === "kraken" ? oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "kraken_arena") : undefined;
    const p = bossId === "kraken"
      ? this.validPoint(100, 180, true, {
          center: arenaRegion!,
          radius: Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * OW.krakenArena.radius,
          clearance: 90,
        })
      : this.validPoint(100, 180, true);
    if (!p) return;
    const g = this.add.graphics().fillStyle(0x713c9c, 0.28).fillEllipse(0, 0, 110, 140).lineStyle(8, 0x9d5ac7).strokeEllipse(0, 0, 86, 118);
    const t = this.add.text(0, 76, "BOSS · OPCIONAL", { fontSize: "16px", color: "#43255b", fontStyle: "bold" }).setOrigin(0.5);
    this.bossPortal = this.add.container(p.x, p.y, [g, t]).setDepth(9);
    this.bossDefinition = bosses.find((boss) => boss.id === bossId);
    this.bossPortalExpiresAt = this.run.elapsed + 25;
    const requiredEnergy = this.bossEnergyRequirement(bossId);
    const required = Math.max(0, requiredEnergy - this.run.bossEnergy);
    this.ui.toast(`Portal para ${this.bossDefinition?.name ?? "chefe"} apareceu. Atravesse-o com a cobrinha; requer ${requiredEnergy} Boss Energy${required ? ` (faltam ${Math.ceil(required)})` : ""}.`);
  }
  private bossEnergyRequirement(bossId = worldById(this.currentWorld).bossId) {
    return bossId === "king-snake"
      ? B.boss.greenValleyEnergyRequired
      : bossId === "candy-monster"
        ? B.boss.candyWorldEnergyRequired
        : B.boss.defaultEnergyRequired;
  }
  private startBoss(definition: BossDefinition) {
    this.bossPortal?.destroy(); this.bossPortal = undefined;
    this.bossPortalExpiresAt = 0;
    for (const passage of this.worldPassages) passage.setVisible(false);
    this.bossFight.start();
    this.bossCollisionGrace = 0;
    this.candyBossEscapeTimer = 0;
    const initialX = this.snake.x + 240, initialY = this.snake.y;
    const isKingSnake = definition.id === "king-snake";
    const isCandyBee = definition.id === "candy-monster";
    const isKraken = definition.id === "kraken";
    if (isKraken) this.createKrakenBarrier();
    const image = isKraken
      ? this.createKraken(initialX, initialY)
      : isKingSnake
      ? this.add.image(initialX, initialY, "king-snake-head").setScale(1.05).setDepth(19)
      : isCandyBee
        ? this.createCandyBee(initialX, initialY)
      : this.add.container(initialX, initialY, [
          this.add.graphics().fillStyle(0xc74b9d).fillCircle(0, 0, 55).lineStyle(7, 0xffd66f).strokeCircle(0, 0, 58),
          this.add.text(0, -4, "♛", { fontSize: "48px", color: "#ffffff" }).setOrigin(0.5),
        ]).setDepth(19);
    const bodySegments = isKingSnake
      ? Array.from({ length: 4 }, (_, index) => this.add.image(initialX - 30 * (index + 1), initialY, "king-snake-body").setScale(0.86 - index * 0.07).setDepth(18))
      : [];
    const trail = Array.from({ length: 33 }, (_, index) => ({ x: initialX - index * 12, y: initialY }));
    const initialState = definition.id === "kraken" ? "IDLE" : "CHASE";
    const preference = save.profile.settings.speedPreference;
    const attackCooldown = bossAttackTiming(definition.combat.attackCooldown, preference, 1.5);
    const boss = this.boss = { definition, health: definition.maxHealth, phase: 0, attack: attackCooldown, speed: bossMovementSpeed(definition.movementSpeed, preference), image, bodySegments, trail, visualAngle: 0, lastVisualX: initialX, lastVisualY: initialY, state: initialState, stateTimer: attackCooldown, targetX: this.snake.x, targetY: this.snake.y, chargeX: 0, chargeY: 0, doubleCharge: 0, krakenTentacles: isKraken && image instanceof Phaser.GameObjects.Container ? image.getData("tentacles") as Phaser.GameObjects.Graphics[] : undefined };
    this.bossHud!.hidden = false;
    if (this.bossEnergyHud) this.bossEnergyHud.hidden = true;
    this.bossHud!.textContent = `${definition.name} · ${boss.health}/${definition.maxHealth} HP${definition.id === "king-snake" ? "" : " · ATTACK 0/100"}`;
    this.bossFight.active = true;
    this.bossCoinsTimer = 2;
    this.ui.toast(definition.id === "king-snake"
      ? "Boss fight! Desvie da investida e pegue a coroa quando o King Snake ficar atordoado."
      : "Boss fight! Colete Boss Coins e aproveite as janelas de ataque.");
    if (!isKingSnake && !isCandyBee && !isKraken) image.setSize(210, 210);
  }
  private createKrakenBarrier() {
    this.krakenBarrier?.destroy();
    const arena = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "kraken_arena")!;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * OW.krakenArena.radius;
    const water = this.add.graphics().fillStyle(0x22c5d5, 0.09).fillCircle(0, 0, radius - 18)
      .lineStyle(18, 0x42d5df, 0.12).strokeCircle(0, 0, radius - 28);
    const rim = this.add.graphics()
      .lineStyle(25, 0x163f55, 0.88).strokeCircle(0, 0, radius)
      .lineStyle(15, 0x39879a, 0.96).strokeCircle(0, 0, radius)
      .lineStyle(4, 0x9be8df, 0.82).strokeCircle(0, 0, radius - 9);
    for (let index = 0; index < 24; index++) {
      const angle = index * Math.PI * 2 / 24;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      const size = index % 3 === 0 ? 17 : 12;
      rim.fillStyle(index % 2 ? 0x547f79 : 0x39778a, 0.96)
        .fillRoundedRect(x - size / 2, y - size / 1.5, size, size * 1.5, 5)
        .fillStyle(index % 2 ? 0xff937f : 0xffc284, 0.9)
        .fillCircle(x, y + size * 0.35, 4);
    }
    this.krakenBarrier = this.add.container(arena.x, arena.y, [water, rim]).setDepth(4);
    this.tweens.add({ targets: water, alpha: 0.5, duration: 850, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: rim, alpha: 0.78, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
  private containSnakeInKrakenArena() {
    if (!this.boss || this.boss.definition.id !== "kraken" || !this.krakenBarrier) return;
    const center = this.krakenBarrier;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * OW.krakenArena.radius;
    const contained = containKrakenArenaPoint(this.snake, center, radius, B.snake.radius + 8);
    if (!contained) return;
    const dx = this.snake.x - center.x, dy = this.snake.y - center.y;
    this.snake.x = contained.x;
    this.snake.y = contained.y;
    const returnAngle = Math.atan2(dy, dx) + Math.PI;
    this.snake.x = contained.x;
    this.snake.y = contained.y;
    this.snake.angle = returnAngle;
    this.snake.body[0].x = contained.x;
    this.snake.body[0].y = contained.y;
    this.snake.moveVector(0, returnAngle, 0, { x: 0, y: 0 });
    this.krakenReturnAngle = returnAngle;
    this.krakenReturnTimer = 0.45;
    this.steering.reset(this.snake.angle);
    this.aim = null;
    if (this.krakenBarrierCooldown <= 0) {
      this.krakenBarrierCooldown = 0.65;
      this.feedback(this.snake.x, this.snake.y, "CORRENTE DO KRAKEN!", 0x73e8ed);
      this.cameras.main.shake(120, 0.0015);
      audio.play("current_flow");
      haptic("coin");
    }
  }
  private createKraken(x: number, y: number) {
    const kraken = this.add.container(x, y).setDepth(19);
    const tentacles: Phaser.GameObjects.Graphics[] = [];
    for (let index = 0; index < 8; index++) {
      const angle = -Math.PI / 2 + index * Math.PI / 4;
      const length = index % 2 === 0 ? 158 : 132;
      const bend = index % 2 === 0 ? 38 : -34;
      const graphics = this.add.graphics();
      graphics.lineStyle(24, 0x102e45, 0.95).beginPath().moveTo(0, 18);
      graphics.lineTo(Math.cos(angle) * 56 + Math.cos(angle + Math.PI / 2) * bend * 0.45, Math.sin(angle) * 56 + Math.sin(angle + Math.PI / 2) * bend * 0.45);
      graphics.lineTo(Math.cos(angle) * length * 0.72 + Math.cos(angle + Math.PI / 2) * bend, Math.sin(angle) * length * 0.72 + Math.sin(angle + Math.PI / 2) * bend);
      graphics.lineStyle(16, 0x327b91, 1).beginPath().moveTo(0, 18);
      graphics.lineTo(Math.cos(angle) * 56 + Math.cos(angle + Math.PI / 2) * bend * 0.45, Math.sin(angle) * 56 + Math.sin(angle + Math.PI / 2) * bend * 0.45);
      graphics.lineTo(Math.cos(angle) * length * 0.72 + Math.cos(angle + Math.PI / 2) * bend, Math.sin(angle) * length * 0.72 + Math.sin(angle + Math.PI / 2) * bend);
      graphics.lineStyle(4, 0x8fe0dc, 0.9);
      for (let sucker = 0; sucker < 5; sucker++) {
        const progress = 0.28 + sucker * 0.12;
        const sx = Math.cos(angle) * length * progress + Math.cos(angle + Math.PI / 2) * bend * progress;
        const sy = Math.sin(angle) * length * progress + Math.sin(angle + Math.PI / 2) * bend * progress;
        graphics.strokeCircle(sx, sy, 5 - sucker * 0.35);
      }
      graphics.setPosition(0, 18).setDepth(0);
      tentacles.push(graphics);
      kraken.add(graphics);
    }
    const mantle = this.add.graphics();
    mantle.fillStyle(0x102e45, 1).fillEllipse(0, -18, 110, 120);
    mantle.fillStyle(0x397f94, 1).fillEllipse(0, -25, 94, 108);
    mantle.fillStyle(0x79b9b4, 0.5).fillEllipse(-20, -53, 30, 18);
    const face = this.add.graphics();
    face.fillStyle(0xffd98a, 1).fillEllipse(-23, -4, 23, 30).fillEllipse(23, -4, 23, 30);
    face.fillStyle(0x17263c, 1).fillCircle(-23, -5, 8).fillCircle(23, -5, 8);
    face.fillStyle(0xffffff, 1).fillCircle(-25, -8, 2.5).fillCircle(21, -8, 2.5);
    face.fillStyle(0x16364b, 1).fillTriangle(-13, 31, 13, 31, 0, 48);
    kraken.add([mantle, face]);
    kraken.setData("tentacles", tentacles);
    return kraken;
  }
  private createCandyBee(x: number, y: number) {
    const outline = 0x633a32;
    const bee = this.add.container(x, y).setDepth(19);
    const wings = this.add.graphics();
    wings.fillStyle(0xffffff, 0.8).lineStyle(4, 0x9dcbd0, 0.9);
    wings.fillEllipse(-27, -47, 36, 54).strokeEllipse(-27, -47, 36, 54);
    wings.fillEllipse(23, -48, 36, 54).strokeEllipse(23, -48, 36, 54);
    wings.fillStyle(0xffffff, 0.36).fillEllipse(-31, -56, 9, 21).fillEllipse(19, -57, 9, 21);
    const body = this.add.graphics();
    body.fillStyle(outline).fillEllipse(0, 4, 106, 96);
    body.fillStyle(0xffc83d).fillEllipse(0, 0, 96, 88);
    body.fillStyle(0x59372f).fillRoundedRect(-33, -41, 19, 81, 9);
    body.fillStyle(0x59372f).fillRoundedRect(14, -41, 19, 81, 9);
    body.fillStyle(0xffe991, 0.8).fillEllipse(-24, -26, 23, 10);
    body.fillStyle(outline).fillEllipse(0, 38, 16, 19);
    const face = this.add.graphics();
    face.fillStyle(0xffa18e, 0.85).fillEllipse(-29, 17, 17, 10).fillEllipse(29, 17, 17, 10);
    face.fillStyle(outline).fillEllipse(-18, 0, 8, 15).fillEllipse(18, 0, 8, 15);
    face.fillStyle(0xffffff).fillCircle(-19, -3, 2.5).fillCircle(17, -3, 2.5);
    face.lineStyle(3, outline, 1).beginPath().arc(0, 13, 11, 0.25, Math.PI - 0.25, false).strokePath();
    const antenna = this.add.graphics();
    antenna.lineStyle(4, outline, 1).lineBetween(-13, -42, -20, -57).lineBetween(13, -42, 20, -57);
    antenna.fillStyle(0xff83ab).fillCircle(-21, -59, 6).fillCircle(21, -59, 6);
    bee.add([wings, body, face, antenna]);
    bee.setSize(120, 120);
    if (!save.profile.settings.reducedMotion) {
      this.tweens.add({ targets: wings, scaleY: 0.62, duration: 130, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    return bee;
  }
  private updateBoss(dt: number) {
    const boss = this.boss!;
    const cfg = boss.definition.combat;
    this.bossFight.update(dt);
    this.candyBossEscapeTimer = Math.max(0, this.candyBossEscapeTimer - dt);
    boss.stateTimer -= dt;
      if (boss.definition.id === "king-snake") this.updateKingBehavior(boss, dt);
    else if (boss.definition.id === "candy-monster") this.updateCandyBehavior(boss, dt);
    else this.updateKrakenBehavior(boss, dt);
    if (!this.boss) return;
    if (boss.definition.id === "king-snake") this.updateKingSnakeVisual(boss, dt);
    else if (boss.definition.id === "kraken") this.updateKrakenVisual(boss);

    if (boss.definition.id !== "king-snake") {
      this.bossCoinsTimer -= dt;
      if (this.bossCoinsTimer <= 0 && this.bossPickups.filter((pickup) => pickup.kind === "boss-coin").length < 3) {
        this.bossCoinsTimer = 5;
        this.spawnBossPickup("boss-coin", 25, "◆", 0xffd35a);
      }
    }
    this.updateBossPickups(dt);

    const dx = this.snake.x - boss.image.x, dy = this.snake.y - boss.image.y;
    const d = Math.hypot(dx, dy) || 1;
    const collisionDistance = Math.hypot(dx, dy);
    const collisionRadius = boss.definition.id === "kraken" ? 84 : 58 + B.snake.radius;
    const canHitKraken = boss.definition.id === "kraken" && boss.state === "EXPOSED" && boss.hazard && Math.hypot(this.snake.x - boss.hazard.x, this.snake.y - boss.hazard.y) < 62;
    const contact = boss.definition.id === "kraken" ? canHitKraken : collisionDistance < collisionRadius;
    if (boss.definition.id === "candy-monster") {
      const touchingHead = distance(this.snake, boss.image) < collisionRadius;
      const touchingSegment = this.snake.body.slice(0, this.snake.length).some((segment) => distance(segment, boss.image) < collisionRadius);
      if (touchingSegment && this.bossCollisionGrace <= 0 && this.candyBossEscapeTimer <= 0) {
        const aura = this.bossFight.combat;
        if (aura.active && aura.source === "candy-aura" && aura.consumeHit(boss.definition.id)) {
          this.bossCollisionGrace = cfg.hitInvulnerability;
          this.candyBossEscapeTimer = 2;
          boss.state = "ATTACK_MODE";
          boss.stateTimer = 2;
          this.damageBoss();
          if (!this.boss) return;
          this.feedback(boss.image.x, boss.image.y, "−1 HP · FUJA!", 0xffb344, true);
          this.particles.explode(14, boss.image.x, boss.image.y);
          audio.play("power"); haptic("power");
          this.tweens.killTweensOf(boss.image);
          this.tweens.add({ targets: boss.image, alpha: 0.25, duration: 200, yoyo: true, repeat: 4 });
          this.tweens.add({ targets: boss.image, x: boss.image.x + (dx / d) * 160, y: boss.image.y + (dy / d) * 160, duration: 350, ease: "Sine.easeOut" });
        } else if (!aura.active && touchingHead && (boss.state === "CHASE" || boss.state === "SUGAR_RUSH") && this.powers.invincible <= 0 && !this.powers.ghostActive) {
          const hadShield = this.powers.shield;
          if (!this.powers.absorb()) {
            if (!this.loseLife()) { this.die(); return; }
          } else if (hadShield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
          this.bossCollisionGrace = cfg.hitInvulnerability;
        }
      }
      this.bossCollisionGrace = Math.max(0, this.bossCollisionGrace - dt);
    } else if (contact) {
      const aura = this.bossFight.combat;
      const vulnerable = boss.definition.id === "king-snake"
        ? boss.state === "STUNNED" && aura.source === "crown-orb"
        : boss.definition.id === "candy-monster"
          ? boss.state === "ATTACK_MODE" && aura.source === "candy-aura"
          : boss.state === "EXPOSED";
      const kingSnake = boss.definition.id === "king-snake";
      const kingChargeContact = kingSnake && boss.state === "CHARGE";
      if (kingChargeContact && this.bossCollisionGrace <= 0) {
        if (this.powers.ghostActive) {
          this.bossCollisionGrace = cfg.hitInvulnerability;
        } else if (aura.active) {
          aura.consumeProtectionHit(boss.definition.id);
          this.bossCollisionGrace = cfg.hitInvulnerability;
          this.feedback(this.snake.x, this.snake.y, "AURA!", 0xffb52e, true);
          audio.play("shield_break"); haptic("power");
        } else if (this.powers.invincible <= 0) {
          if (!this.loseLife()) {
            this.die();
            return;
          }
          this.bossCollisionGrace = cfg.hitInvulnerability;
        }
      } else if (kingSnake && boss.state === "STUNNED" && !aura.active) {
        // The King Snake is harmless while stunned, but cannot be damaged without aura.
      } else if (aura.active && vulnerable && aura.consumeHit(boss.definition.id)) {
        if (boss.definition.id === "kraken") { boss.hazard?.destroy(); boss.hazard = undefined; boss.state = "RECOVER"; boss.stateTimer = 1.5; }
        this.damageBoss();
        if (!this.boss) return;
        this.feedback(boss.image.x, boss.image.y, "−1", 0xffb344, true);
        this.tweens.add({ targets: boss.image, alpha: 0.35, duration: 80, yoyo: true, repeat: 2 });
        this.tweens.add({ targets: boss.image, x: boss.image.x + dx / d * 24, y: boss.image.y + dy / d * 24, duration: 130, yoyo: true, ease: "Sine.easeOut" });
        this.particles.explode(14, boss.image.x, boss.image.y);
        audio.play("power"); haptic("power");
      } else if (!aura.active && boss.definition.id !== "kraken" && !kingSnake && boss.definition.id !== "candy-monster" && this.bossCollisionGrace <= 0 && !this.powers.ghostActive) {
        const hadShield = this.powers.shield;
        if (!this.powers.absorb()) {
          this.snake.length = Math.max(B.snake.initial, this.snake.length - 1);
          this.powers.invincible = Math.max(this.powers.invincible, cfg.hitInvulnerability);
          this.feedback(this.snake.x, this.snake.y, "CUIDADO!", 0xff5b78);
        } else if (hadShield) {
          this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
        }
        this.bossCollisionGrace = cfg.hitInvulnerability;
      }
    } else this.bossCollisionGrace = Math.max(0, this.bossCollisionGrace - dt);

    const combat = this.bossFight.combat;
    if (combat.active) {
      if (!this.bossAuraGraphics) this.bossAuraGraphics = this.add.graphics().setDepth(22);
      this.bossAuraGraphics.clear();
      const color = combat.active ? 0xffad32 : 0x70cfff;
      for (let i = 0; i < Math.min(this.snake.length, 12); i++) {
        const point = this.snake.body[i];
        this.bossAuraGraphics.lineStyle(4, color, 0.85 - i * 0.045).strokeCircle(point.x, point.y, B.snake.radius + 5);
      }
    } else this.bossAuraGraphics?.clear();
    if (this.bossHud) {
      const kingSnake = boss.definition.id === "king-snake";
      const candy = boss.definition.id === "candy-monster";
      const ready = !kingSnake && !candy && this.bossFight.combat.attackCharge >= 100 ? " · ATTACK READY!" : "";
      const aura = this.bossFight.combat.active ? ` · ${candy ? "ESCUDO ATIVO" : `AURA ∞/${this.bossFight.combat.remainingHits} hits`}` : "";
      const attackCharge = kingSnake ? "" : candy ? ` · BOSS COINS ${Math.floor(this.bossFight.combat.attackCharge)}%` : ` · ATTACK ${Math.floor(this.bossFight.combat.attackCharge)}/100`;
      this.bossHud.textContent = `${boss.definition.name} · ${boss.health}/${boss.definition.maxHealth} HP · FASE ${boss.phase + 1}${attackCharge}${ready}${aura}`;
    }
  }
  private bossSafePoint(minDistance = 180) {
    const arena = B.arena;
    for (let attempt = 0; attempt < 40; attempt++) {
      const point = { x: Phaser.Math.Between(arena.left + 100, arena.right - 100), y: Phaser.Math.Between(arena.top + 100, arena.bottom - 100) };
      if (distance(point, this.snake) < minDistance) continue;
      if (this.boss && distance(point, this.boss.image) < 150) continue;
      if (this.obstacles.some((obstacle) => distance(point, obstacle) < 100)) continue;
      if (this.bossPickups.some((pickup) => distance(point, pickup) < 75)) continue;
      return point;
    }
    return { x: Phaser.Math.Clamp(this.snake.x + 220, arena.left + 80, arena.right - 80), y: Phaser.Math.Clamp(this.snake.y + 180, arena.top + 80, arena.bottom - 80) };
  }
  private spawnBossPickup(kind: "boss-coin" | "loot-boss-coin" | "crown-orb" | "sugar-shield" | "attack-pearl" | "candy-aura" | "candy-shield", _charge: number, symbol?: string, tint?: number) {
    const point = this.bossSafePoint(180);
    this.spawnBossPickupAt(kind, point.x, point.y, symbol, tint);
  }
  private spawnBossPickupAt(kind: "boss-coin" | "loot-boss-coin" | "crown-orb" | "sugar-shield" | "attack-pearl" | "candy-aura" | "candy-shield", x: number, y: number, symbol?: string, tint?: number) {
    const point = { x, y };
    const color = tint ?? (kind === "crown-orb" ? 0xffb52e : kind === "attack-pearl" ? 0x9df8ff : 0xff76d7);
    const graphic = this.add.graphics().fillStyle(color, 0.28).fillCircle(0, 0, 28).lineStyle(4, color, 0.95).strokeCircle(0, 0, 23);
    const label = this.add.text(0, 0, symbol ?? (kind === "crown-orb" ? "♛" : kind === "sugar-shield" || kind === "candy-shield" ? "S" : "✦"), { fontSize: "25px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    const image = this.add.container(point.x, point.y, [graphic, label]).setDepth(24);
    this.tweens.add({ targets: image, scale: 1.16, duration: 500, yoyo: true, repeat: -1 });
    this.bossPickups.push({ ...point, life: kind === "boss-coin" || kind === "loot-boss-coin" ? Number.POSITIVE_INFINITY : kind === "candy-aura" ? Number.POSITIVE_INFINITY : 14, kind, image });
  }
  private dropBossCoins(amount: number, x: number, y: number) {
    for (let index = 0; index < amount; index++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 35 + Math.sqrt(Math.random()) * 145;
      const dropX = Phaser.Math.Clamp(x + Math.cos(angle) * radius, B.arena.left + 40, B.arena.right - 40);
      const dropY = Phaser.Math.Clamp(y + Math.sin(angle) * radius, B.arena.top + 40, B.arena.bottom - 40);
      this.spawnBossPickupAt("loot-boss-coin", dropX, dropY, "◆", 0xffd35a);
    }
  }
  private updateBossPickups(dt: number) {
    for (const pickup of [...this.bossPickups]) {
      pickup.life -= dt;
      if (pickup.life <= 0) { pickup.image.destroy(); this.bossPickups.splice(this.bossPickups.indexOf(pickup), 1); continue; }
      if (distance(pickup, this.snake) >= 39) continue;
      pickup.image.destroy(); this.bossPickups.splice(this.bossPickups.indexOf(pickup), 1);
      const boss = this.boss;
      if (pickup.kind === "loot-boss-coin" || pickup.kind === "boss-coin") {
        if (boss) {
          this.bossFight.combat.addCharge(boss.definition.combat.attackChargePerBossCoin);
          this.run.bossCoins++;
        }
        creditBossCoins(save.profile, 1);
        audio.play("coin_golden"); haptic("coin");
        this.feedback(pickup.x, pickup.y, boss ? "+1 BOSS COIN · AURA" : "+1 BOSS COIN", 0xffd35a, true);
        void save.save();
        if (boss?.definition.id === "candy-monster" && this.bossFight.combat.attackCharge >= 100 && !this.bossFight.combat.active && !this.bossPickups.some((item) => item.kind === "candy-aura"))
          this.spawnBossPickup("candy-aura", 0, "✦", 0xff76d7);
        continue;
      }
      if (!boss) return;
      if (pickup.kind === "candy-aura") {
        this.bossFight.combat.activateAttackAura({ maxHits: 1, source: "candy-aura", bossId: boss.definition.id });
        boss.state = "ATTACK_MODE";
        audio.play("power"); haptic("power");
        this.feedback(pickup.x, pickup.y, "AURA! PERSIGA O CHEFE!", 0xffa52f, true);
      } else if (pickup.kind === "candy-shield") {
        this.powers.activate("shield");
        audio.play("power"); haptic("power");
        this.feedback(pickup.x, pickup.y, "ESCUDO!", 0x70cfff, true);
      } else {
        const source = pickup.kind;
        this.bossFight.combat.addCharge(pickup.kind === "crown-orb" ? 100 : pickup.kind === "attack-pearl" ? 50 : 25);
        const activated = this.bossFight.combat.activateAttackAura({ maxHits: pickup.kind === "sugar-shield" ? 2 : boss.definition.combat.auraMaxHits, source, bossId: boss.definition.id });
        if (activated) {
          if (pickup.kind === "sugar-shield" && boss.definition.id !== "candy-monster") boss.state = "ATTACK_MODE";
          audio.play("power"); haptic("power");
          this.feedback(pickup.x, pickup.y, pickup.kind === "sugar-shield" ? "ATTACK MODE!" : "ATTACK AURA!", 0xffa52f, true);
        }
      }
    }
  }
  private moveBossToward(boss: NonNullable<GameScene["boss"]>, point: Point, speed: number, dt: number) {
    const dx = point.x - boss.image.x, dy = point.y - boss.image.y, length = Math.hypot(dx, dy) || 1;
    const step = Math.min(length, speed * dt);
    boss.image.x += dx / length * step; boss.image.y += dy / length * step;
  }
  private updateKingSnakeVisual(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const dx = boss.image.x - boss.lastVisualX, dy = boss.image.y - boss.lastVisualY;
    if (Math.hypot(dx, dy) >= 8) {
      boss.trail.unshift({ x: boss.image.x, y: boss.image.y });
      boss.trail.length = Math.min(boss.trail.length, 33);
      boss.lastVisualX = boss.image.x;
      boss.lastVisualY = boss.image.y;
    }
    if (Math.hypot(dx, dy) > 0.01) {
      const targetAngle = Math.atan2(dy, dx);
      boss.visualAngle = Phaser.Math.Angle.RotateTo(boss.visualAngle, targetAngle, 7 * dt);
    }
    const stunnedWobble = boss.state === "STUNNED" ? Math.sin(this.run.elapsed * 18) * 0.12 : 0;
    boss.image.rotation = boss.visualAngle + stunnedWobble;
    for (let index = 0; index < boss.bodySegments.length; index++) {
      const trailIndex = (index + 1) * 6;
      const point = boss.trail[Math.min(trailIndex, boss.trail.length - 1)];
      const next = boss.trail[Math.max(0, trailIndex - 1)];
      const segment = boss.bodySegments[index];
      segment.setPosition(point.x, point.y);
      segment.rotation = Math.atan2(next.y - point.y, next.x - point.x);
    }
  }
  private updateKrakenVisual(boss: NonNullable<GameScene["boss"]>) {
    if (!(boss.image instanceof Phaser.GameObjects.Container) || !boss.krakenTentacles) return;
    const phaseScale = 1 + boss.phase * 0.055;
    const telegraph = boss.state === "TELEGRAPH_SLAM" ? 1 + Math.sin(this.run.elapsed * 18) * 0.08 : 1;
    boss.image.setScale(phaseScale * telegraph);
    boss.image.rotation = Math.sin(this.run.elapsed * 1.6) * 0.025;
    boss.krakenTentacles.forEach((tentacle, index) => {
      tentacle.rotation = Math.sin(this.run.elapsed * 2.3 + index * 0.9) * 0.11;
      tentacle.y = 18 + Math.sin(this.run.elapsed * 2.8 + index) * 5;
    });
    if (boss.state === "TELEGRAPH_SLAM" && boss.hazard) {
      boss.hazard.setAlpha(0.62 + Math.sin(this.run.elapsed * 16) * 0.25);
    }
  }
  private updateKingBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const arena = B.arena;
    const preference = save.profile.settings.speedPreference;
    const telegraph = (duration: number, minimum = 0.45) => bossAttackTiming(duration, preference, minimum);
    const furious = boss.health <= 2;
    if (boss.state === "CHASE") {
      this.moveBossToward(boss, this.snake, boss.speed * (furious ? 1.28 : boss.phase === 0 ? 1 : 1.12), dt);
      if (boss.stateTimer <= 0) {
        boss.state = "PREPARE_CHARGE"; boss.stateTimer = telegraph(Math.max(furious ? 0.65 : 0.8, boss.definition.combat.telegraphDuration - boss.phase * (furious ? 0.16 : 0.08)));
        boss.chargeX = this.snake.x - boss.image.x; boss.chargeY = this.snake.y - boss.image.y;
        const length = Math.hypot(boss.chargeX, boss.chargeY) || 1; boss.chargeX /= length; boss.chargeY /= length;
        const marker = this.add.graphics().lineStyle(8, 0xff544e, 0.62).lineBetween(boss.image.x, boss.image.y, boss.image.x + boss.chargeX * 440, boss.image.y + boss.chargeY * 440).setDepth(8);
        this.bossMarkers.push(marker);
        audio.play("error"); haptic("coin"); this.feedback(boss.image.x, boss.image.y, furious ? "FURIOUS ROYAL CHARGE!" : "ROYAL CHARGE!", furious ? 0xff554e : 0xffd66f, true);
      }
    } else if (boss.state === "PREPARE_CHARGE") {
      if (boss.stateTimer <= 0) { boss.state = "CHARGE"; boss.stateTimer = 1.25; audio.play("power"); }
    } else if (boss.state === "CHARGE") {
      const speed = boss.speed * (furious ? 5.8 : 5);
      boss.image.x += boss.chargeX * speed * dt; boss.image.y += boss.chargeY * speed * dt;
      if (boss.image.x < arena.left + 70 || boss.image.x > arena.right - 70 || boss.image.y < arena.top + 70 || boss.image.y > arena.bottom - 70) {
        boss.image.x = Phaser.Math.Clamp(boss.image.x, arena.left + 70, arena.right - 70); boss.image.y = Phaser.Math.Clamp(boss.image.y, arena.top + 70, arena.bottom - 70);
        boss.state = "STUNNED"; boss.stateTimer = boss.definition.combat.stunDuration; boss.doubleCharge = furious && boss.doubleCharge === 0 ? 1 : 0;
        for (const marker of this.bossMarkers) marker.destroy(); this.bossMarkers = [];
        audio.play("error"); haptic("power"); this.particles.explode(18, boss.image.x, boss.image.y);
        this.spawnBossPickup("crown-orb", 100, "♛", 0xffb52e);
      }
    } else if (boss.state === "STUNNED") {
      if (boss.stateTimer <= 0) {
        if (boss.doubleCharge > 0) { boss.doubleCharge--; boss.state = "RECOVER"; boss.stateTimer = 0.7; }
        else { boss.state = "CHASE"; boss.stateTimer = telegraph(boss.definition.combat.attackCooldown * (furious ? 0.7 : 1), 1.5); }
      }
    } else if (boss.state === "RECOVER" && boss.stateTimer <= 0) {
      if (furious && boss.doubleCharge === 0 && boss.attack < 0) { boss.state = "PREPARE_CHARGE"; boss.stateTimer = 0.65; boss.doubleCharge = 2; }
      else { boss.state = "CHASE"; boss.stateTimer = telegraph(boss.definition.combat.attackCooldown * (furious ? 0.7 : 1), 1.5); }
    }
  }
  private updateCandyBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const preference = save.profile.settings.speedPreference;
    const attackCooldown = bossAttackTiming(boss.definition.combat.attackCooldown * (boss.phase === 0 ? 1 : boss.phase === 1 ? 0.88 : 0.76), preference, 1.5);
    if (this.candyBossEscapeTimer > 0) {
      const away = { x: boss.image.x - this.snake.x, y: boss.image.y - this.snake.y }, length = Math.hypot(away.x, away.y) || 1;
      const destination = { x: Phaser.Math.Clamp(boss.image.x + away.x / length * 260, B.arena.left + 90, B.arena.right - 90), y: Phaser.Math.Clamp(boss.image.y + away.y / length * 260, B.arena.top + 90, B.arena.bottom - 90) };
      this.moveBossToward(boss, destination, boss.speed * 1.5, dt);
      return;
    }
    if (boss.state === "DROP_ATTACK") {
      if (boss.stateTimer <= 0) {
        const marker = this.bossMarkers.pop(); marker?.destroy();
        const attackRadius = 64;
        const splat = this.add.graphics().fillStyle(0xdb4c93, 0.48).fillCircle(0, 0, attackRadius).lineStyle(4, 0xb72b75).strokeCircle(0, 0, attackRadius);
        const targetX = boss.targetX, targetY = boss.targetY;
        const zone = this.add.container(targetX, targetY, [splat]).setDepth(7);
        this.tweens.add({ targets: zone, alpha: 0, delay: 4500, duration: 400, onComplete: () => { zone.destroy(); this.stickyZones = this.stickyZones.filter((item) => Math.hypot(item.x - targetX, item.y - targetY) > 100); this.renderStickyZones(); } });
        const headHit = distance(this.snake, { x: targetX, y: targetY }) < attackRadius + B.snake.radius;
          const bodyHit = this.snake.body.slice(1, this.snake.length).some((segment) => distance(segment, { x: targetX, y: targetY }) < attackRadius + B.snake.radius);
        if (headHit && !this.powers.ghostActive) {
          const hadShield = this.powers.shield;
          const hadInvincibility = this.powers.invincible > 0;
          if (!this.powers.absorb()) {
            if (!this.loseLife()) { this.die(); return; }
            this.feedback(this.snake.x, this.snake.y, `VIDA PERDIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
          } else if (hadShield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
          else if (hadInvincibility) this.feedback(this.snake.x, this.snake.y, "PROTEGIDO!", 0x70cfff);
        } else if (!headHit && bodyHit && !this.powers.ghostActive) {
          if (this.powers.shield || this.powers.invincible > 0) {
            const hadShield = this.powers.shield;
            const hadInvincibility = this.powers.invincible > 0;
            this.powers.absorb();
            this.feedback(targetX, targetY, hadShield ? "ESCUDO!" : hadInvincibility ? "PROTEGIDO!" : "BLOQUEADO!", 0x70cfff);
          } else if (this.snake.length <= B.snake.initial) {
            if (!this.loseLife()) { this.die(); return; }
            this.feedback(this.snake.x, this.snake.y, `VIDA PERDIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
          } else {
            this.snake.length = Math.max(B.snake.initial, this.snake.length - Math.max(1, Math.ceil(this.snake.length * 0.2)));
            this.feedback(targetX, targetY, "CORPO ENCURTADO!", 0xff76d7);
          }
        }
        if (!headHit && !bodyHit && this.stickyZones.length < 4) { this.stickyZones.push({ x: targetX, y: targetY, radius: attackRadius - 2 }); this.renderStickyZones(); }
        boss.state = "CHASE"; boss.stateTimer = attackCooldown;
      }
    } else if (boss.state === "ATTACK_MODE") {
      const away = { x: boss.image.x - this.snake.x, y: boss.image.y - this.snake.y }, length = Math.hypot(away.x, away.y) || 1;
      const destination = { x: Phaser.Math.Clamp(boss.image.x + away.x / length * 260, B.arena.left + 90, B.arena.right - 90), y: Phaser.Math.Clamp(boss.image.y + away.y / length * 260, B.arena.top + 90, B.arena.bottom - 90) };
      this.moveBossToward(boss, destination, boss.speed * 1.25, dt);
      if (!this.bossFight.combat.active) {
        boss.state = "CHASE";
        boss.stateTimer = attackCooldown;
      }
    } else {
      this.moveBossToward(boss, this.snake, boss.speed, dt);
      if (boss.stateTimer <= 0) {
        boss.state = "DROP_ATTACK"; boss.stateTimer = bossAttackTiming(boss.definition.combat.telegraphDuration * (boss.phase === 0 ? 1 : boss.phase === 1 ? 0.92 : 0.84), preference, 0.45);
        boss.targetX = this.snake.x; boss.targetY = this.snake.y;
        const markerRadius = 58;
        const marker = this.add.graphics().fillStyle(0xff5e8b, 0.28).fillCircle(boss.targetX, boss.targetY, markerRadius).lineStyle(6, 0xff5283).strokeCircle(boss.targetX, boss.targetY, markerRadius).setDepth(8);
        this.bossMarkers.push(marker); audio.play("error");
      }
    }
    if (boss.definition.id !== "candy-monster" && boss.phase >= 1 && !this.bossPickups.some((item) => item.kind === "sugar-shield") && !this.bossFight.combat.active) this.spawnBossPickup("sugar-shield", 0, "S", 0xff76d7);
    if (boss.definition.id === "candy-monster" && boss.phase >= 1 && !this.powers.shield && !this.bossPickups.some((item) => item.kind === "candy-shield") && Math.random() < dt * 0.08) this.spawnBossPickup("candy-shield", 0, "S", 0x70cfff);
  }
  private updateKrakenBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const preference = save.profile.settings.speedPreference;
    boss.image.x = B.arena.left + (B.arena.right - B.arena.left) * 0.78;
    boss.image.y = B.arena.top + (B.arena.bottom - B.arena.top) * 0.74;
    if (boss.phase >= 1 && !this.bossCurrent) {
      this.bossCurrent = { x: B.arena.left + 700, y: B.arena.top + 650, direction: Math.PI, force: boss.phase >= 2 ? 20 : 13, life: 7, graphics: this.add.graphics().setDepth(5) };
    }
    if (boss.phase >= 2) {
      if (!this.bossWhirlpool) { this.bossWhirlpool = this.add.graphics().setDepth(5); audio.play("current_flow"); }
      this.bossWhirlpool.clear().lineStyle(9, 0x75dce8, 0.44).strokeCircle(boss.image.x, boss.image.y, 165 + Math.sin(this.run.elapsed * 3) * 12).lineStyle(5, 0xb8f7ff, 0.55).strokeCircle(boss.image.x, boss.image.y, 108 - Math.sin(this.run.elapsed * 3) * 8);
      const vx = this.snake.x - boss.image.x, vy = this.snake.y - boss.image.y;
      if (Math.hypot(vx, vy) < 280) this.snake.moveVector(dt, this.snake.angle, B.snake.speed, { x: -vy * 0.025, y: vx * 0.025 }, controls.turnSpeed, OW.maxEffectiveSpeed);
    }
    if (this.bossCurrent) {
      const current = this.bossCurrent; current.life -= dt;
      current.graphics.clear().lineStyle(14, 0x4ac7db, 0.32).lineBetween(current.x - 220, current.y, current.x + 220, current.y).lineStyle(5, 0xc3f8fb, 0.58).lineBetween(current.x - 170, current.y + Math.sin(this.run.elapsed * 4) * 14, current.x + 170, current.y + Math.sin(this.run.elapsed * 4) * 14);
      if (Math.abs(this.snake.y - current.y) < 100 && Math.abs(this.snake.x - current.x) < 260) this.snake.moveVector(dt, this.snake.angle, B.snake.speed, { x: current.force * Math.cos(current.direction), y: current.force * Math.sin(current.direction) }, controls.turnSpeed, OW.maxEffectiveSpeed);
      if (current.life <= 0) { current.graphics.destroy(); this.bossCurrent = undefined; }
    }
    if (boss.state === "IDLE" && boss.stateTimer <= 0) {
      boss.state = "TELEGRAPH_SLAM"; boss.stateTimer = bossAttackTiming(boss.definition.combat.telegraphDuration, preference, 0.7);
      const target = this.bossSafePoint(120); boss.targetX = target.x; boss.targetY = target.y;
      const marker = this.add.graphics().lineStyle(8, 0x53d7e5, 0.85).strokeCircle(target.x, target.y, 66).lineStyle(4, 0xc6fbff, 0.8).strokeCircle(target.x, target.y, 92).setDepth(8);
      this.bossMarkers.push(marker); audio.play("error"); haptic("coin"); this.feedback(target.x, target.y, "TENTACLE!", 0x60dfeb, true);
    } else if (boss.state === "TELEGRAPH_SLAM" && boss.stateTimer <= 0) {
      for (const marker of this.bossMarkers) marker.destroy(); this.bossMarkers = [];
      const hit = Math.hypot(this.snake.x - boss.targetX, this.snake.y - boss.targetY) < 90;
      const attackHit = hit && !this.powers.blocksAttack();
      if (attackHit) { this.snake.length = Math.max(B.snake.initial, this.snake.length - 1); this.powers.invincible = Math.max(this.powers.invincible, 0.8); }
      const tentacleGraphic = this.add.graphics();
      const startX = boss.image.x - boss.targetX;
      const startY = boss.image.y - boss.targetY;
      const bendX = startX * 0.48;
      const bendY = startY * 0.48 - 36;
      tentacleGraphic.lineStyle(34, 0x102e45, 0.96).beginPath().moveTo(startX, startY).lineTo(bendX, bendY).lineTo(0, 0);
      tentacleGraphic.lineStyle(23, 0x397f94, 1).beginPath().moveTo(startX, startY).lineTo(bendX, bendY).lineTo(0, 0);
      tentacleGraphic.lineStyle(5, 0xa8faff, 0.95).strokeCircle(0, 0, 22).strokeCircle(bendX * 0.48, bendY * 0.48, 7).strokeCircle(bendX * 0.72, bendY * 0.72, 6);
      boss.hazard = this.add.container(boss.targetX, boss.targetY, [tentacleGraphic]).setDepth(10);
      boss.state = attackHit ? "RECOVER" : "EXPOSED"; boss.stateTimer = attackHit ? 1.2 : 2.8;
      if (!attackHit) { this.spawnBossPickup("attack-pearl", 50, "●", 0xa8faff); audio.play("pearl_coin"); }
      else { audio.play("current_flow"); }
    } else if (boss.state === "EXPOSED" && boss.stateTimer <= 0) {
      boss.hazard?.destroy(); boss.hazard = undefined; boss.state = "RECOVER"; boss.stateTimer = 1.2;
    } else if (boss.state === "RECOVER" && boss.stateTimer <= 0) {
      boss.hazard?.destroy(); boss.hazard = undefined;
      boss.state = "IDLE"; boss.stateTimer = bossAttackTiming(Math.max(2, boss.definition.combat.attackCooldown - boss.phase * 0.45), preference, 1.5);
    }
  }
  private damageBoss() {
    if (!this.boss) return;
    this.boss.health--;
    if (this.boss.health > 0) {
      const thresholds = this.boss.definition.phases;
      const nextPhase = this.boss.definition.id === "candy-monster"
        ? this.boss.health <= 2 ? 2 : this.boss.health <= 5 ? 1 : 0
        : thresholds.findIndex((threshold) => this.boss!.health <= threshold);
      if (nextPhase > this.boss.phase) {
        this.boss.phase = nextPhase;
        this.boss.state = this.boss.definition.id === "kraken" ? "RECOVER" : "CHASE";
        this.boss.stateTimer = 1.2;
        const phaseSpeed = this.boss.definition.id === "candy-monster" ? this.boss.definition.movementSpeed : this.boss.definition.movementSpeed * (1 + nextPhase * 0.12);
        this.boss.speed = bossMovementSpeed(phaseSpeed, save.profile.settings.speedPreference);
        this.feedback(this.boss.image.x, this.boss.image.y, `FASE ${nextPhase + 1}`, 0xffd66f, true);
        if (this.boss.definition.id === "king-snake" && this.boss.health <= 2) {
          this.tweens.add({ targets: this.boss.image, alpha: 0.45, scale: 1.12, duration: 140, yoyo: true, repeat: 2 });
          this.ui.toast("KING SNAKE FURIOSO! Agora ele investe mais rápido e em sequência!");
          this.feedback(this.boss.image.x, this.boss.image.y, "FURIOSO!", 0xff554e, true);
          audio.play("power"); haptic("power");
        }
        if (this.boss.definition.id === "king-snake") this.spawnBossPickup("crown-orb", 100, "♛", 0xffb52e);
        if (this.boss.definition.id === "kraken") { this.bossCurrent = undefined; this.bossWhirlpool?.clear(); }
      }
      return;
    }
    const defeated = this.boss.definition;
    const defeatedX = this.boss.image.x, defeatedY = this.boss.image.y;
    this.particles.explode(30, defeatedX, defeatedY);
    for (const segment of this.boss.bodySegments) segment.destroy();
    this.boss.image.destroy(); this.boss = undefined;
    this.krakenBarrier?.destroy(); this.krakenBarrier = undefined;
    this.krakenBarrierCooldown = 0;
    this.krakenReturnAngle = undefined;
    this.krakenReturnTimer = 0;
    this.bossFight.finish();
    for (const passage of this.worldPassages) passage.setVisible(true);
    for (const pickup of this.bossPickups) {
      if (pickup.kind === "boss-coin") {
        pickup.kind = "loot-boss-coin";
        pickup.image.setDepth(24);
        continue;
      }
      pickup.image.destroy();
    }
    this.bossPickups = this.bossPickups.filter((pickup) => pickup.kind === "loot-boss-coin");
    for (const marker of this.bossMarkers) marker.destroy(); this.bossMarkers = [];
    this.bossCurrent?.graphics.destroy(); this.bossCurrent = undefined;
    this.bossWhirlpool?.destroy(); this.bossWhirlpool = undefined;
    this.bossAuraGraphics?.destroy(); this.bossAuraGraphics = undefined;
    this.bossHud!.hidden = true;
    if (this.bossEnergyHud) this.bossEnergyHud.hidden = false;
    this.dropBossCoins(defeated.bossCoinDrop, defeatedX, defeatedY);
    const first = !save.profile.bossesDefeated.includes(defeated.id);
    if (first) {
      save.profile.bossesDefeated.push(defeated.id);
      const petRewards = [...new Set([defeated.petReward, ...(defeated.additionalPetRewards ?? []), ...pets.filter((pet) => pet.bossRewardId === defeated.id && pet.requiredBossIds?.every((bossId) => save.profile.bossesDefeated.includes(bossId))).map((pet) => pet.id)].filter((id): id is string => Boolean(id)))];
      save.profile.availablePets = [...new Set([...save.profile.availablePets, ...petRewards])];
      const freePetRewards = petRewards.filter((id) => pets.find((pet) => pet.id === id)?.unlockType === "BOSS" && !pets.find((pet) => pet.id === id)?.coinPrice);
      save.profile.unlockedPets = [...new Set([...save.profile.unlockedPets, ...freePetRewards])];
      const skinRewards = getBossSkinRewards(defeated.id);
      save.profile.unlockedSkins = [...new Set([...save.profile.unlockedSkins, ...skinRewards.map((skin) => skin.id)])];
      save.profile.totalCoins += defeated.rewardCoins;
      addXP(save.profile, defeated.rewardXP);
    }
    const newlyUnlocked = first ? reconcileWorldUnlocks(save.profile) : [];
    const nextWorld = worlds.find((world) => world.requiredBossId === defeated.id && world.isImplemented);
    const portalGuidance = nextWorld
      ? save.profile.worldsUnlocked.includes(nextWorld.id)
        ? `🌀 Portal para ${nextWorld.name} liberado! Ele está na borda da arena. Leve a cobrinha até a passagem e atravesse para viajar.`
        : `🔒 Você derrotou o chefe, mas ainda precisa alcançar o nível ${nextWorld.requiredLevel} para liberar o portal de ${nextWorld.name}. Continue jogando para ganhar XP; ao atingir o nível, a passagem aparecerá na borda da arena.`
      : "";
    this.run.bossDefeats++;
    const petRewards = [...new Set([defeated.petReward, ...(defeated.additionalPetRewards ?? []), ...pets.filter((pet) => pet.bossRewardId === defeated.id && pet.requiredBossIds?.every((bossId) => save.profile.bossesDefeated.includes(bossId))).map((pet) => pet.id)].filter((id): id is string => Boolean(id)))];
    if (first && petRewards.length) {
      awardAchievement(save.profile, "boss-hunter");
      awardAchievement(save.profile, "pet-collector");
    } else if (first) {
      awardAchievement(save.profile, "boss-hunter");
    }
    const rewardedSkins = first ? getBossSkinRewards(defeated.id) : [];
    const rewardLines = [
      portalGuidance,
      first && petRewards.length
        ? `🐾 ${petRewards.map((id) => {
            const pet = pets.find((entry) => entry.id === id);
            if (!pet) return id;
            return pet.coinPrice ? `${pet.name} disponível por ${pet.coinPrice} Boss Coins` : `${pet.name} liberado grátis`;
          }).join(" e ")}`
        : "",
      first && rewardedSkins.length
        ? `✨ Skin${rewardedSkins.length > 1 ? "s" : ""} desbloqueada${rewardedSkins.length > 1 ? "s" : ""}: ${rewardedSkins.map((skin) => skin.name).join(", ")}`
        : "",
      first ? `🪙 +${defeated.rewardCoins} moedas · +${defeated.rewardXP} XP` : "",
      `◆ ${defeated.bossCoinDrop} Boss Coins caíram no chão`,
    ].filter(Boolean);
    if (first && newlyUnlocked.length) this.ui.toast(`Mundo desbloqueado: ${newlyUnlocked.map((world) => world.name).join(", ")}.`);
    if (first) {
      this.halted = true;
      this.pauseKind = "pause";
      this.resetControls();
      this.overlay = this.ui.modal(
        `🏆 ${defeated.name} derrotado!`,
        `Parabéns, vitória incrível!${rewardLines.length ? `\n\n${rewardLines.join("\n")}` : ""}`,
        [{ label: "OK · Continuar", run: () => this.continue() }],
      );
    }
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
      ...(this.currentWorld === "ocean" ? [
        ["Ocean: gerar Pearl", () => { const slot = this.coins.find((coin) => !coin.active); const point = this.validPoint(B.spawn.bodyClearance, 150); if (slot && point) slot.spawnPearl(point.x, point.y); }] as [string, () => void],
        ["Ocean: Bonus Bubble", () => this.addOceanBubble(true)] as [string, () => void],
        ["Ocean: Strong Current", () => { const zone = this.oceanCurrents.find((item) => item.type === "STRONG"); if (zone) { this.snake.reset(zone.x, zone.y); this.steering.reset(this.snake.angle); } }] as [string, () => void],
      ] : []),
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
    const completedMissions = reportRun(save.profile, this.run, true);
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
    for (const id of completedMissions) {
      const mission = missionsForProfile(save.profile.dailyMissionIds).find((entry) => entry.id === id);
      if (mission) this.ui.toast(`Missão concluída: ${mission.title} · +${mission.reward} moedas e +${B.xp.perMission} XP`);
    }
    awardAchievement(save.profile, "first-run");
    analytics.track("gameEnded", { score: this.run.score, coins: this.run.matchCoins });
    void save.save();
  }
}
