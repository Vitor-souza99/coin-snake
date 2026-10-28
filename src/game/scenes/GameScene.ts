import Phaser from "phaser";
import { B } from "../data/balance";
import { Snake } from "../entities/Snake";
import { Coin } from "../entities/Coin";
import { Obstacle } from "../entities/Obstacle";
import { PowerUp } from "../entities/PowerUp";
import { ComboSystem } from "../systems/ComboSystem";
import { PowerUpSystem } from "../systems/PowerUpSystem";
import { bossAttackTiming, bossMovementSpeed, candyTelegraphTiming, difficulty, difficultyProfile, powerUpSpawnInterval } from "../systems/DifficultySystem";
import { save } from "../systems/SaveSystem";
import { getLanguage, localizedBossHint, t } from "../services/LocalizationService";
import { creditCoins, creditBossCoins, finishRun, addXP, coinCollectionXP, bossCoinCollectionXP } from "../systems/EconomySystem";
import { reportRun, startMissionRun } from "../systems/MissionSystem";
import { newRun, type RunState, type Point, type GameDifficulty } from "../types/game";
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
import { audio } from "../services/AudioService";
import { haptic } from "../services/HapticsService";
import { worlds, worldById, worldRequirements, type WorldDefinition } from "../data/worlds";
import { bosses, type BossDefinition } from "../data/bosses";
import { BossFightSystem } from "../systems/BossFightSystem";
import { attractSpiderlingCoin } from "../systems/SpiderlingSystem";
import { dragonAttackCooldown, dragonAttackDuration, dragonBossDamage, dragonCanDamageBoss } from "../systems/DragonPetSystem";
import { activateCandyAura, bossAuraPickupKind, bossUsesTimedCoins, regularCoinAuraCharge, resolveCandyAuraHit } from "../systems/BossCombatSystem";
import { pets } from "../data/pets";
import { PortalSystem } from "../systems/PortalSystem";
import { App } from "@capacitor/app";
import { awardAchievement } from "../systems/AchievementSystem";
import { analytics, platform } from "../services/AnalyticsService";
import { sanitizeRunMetrics } from "../services/RunSummary";
import { getBossSkinRewards, getSkin } from "../data/skins";
import { reconcileWorldUnlocks, rememberWorld, traversableWorlds } from "../systems/WorldSystem";
import { candyWorldConfig as CW, candyRegions, candyObstacleSafe, candyCoinSpawnAllowed, candyFinalSpeed, inCandyRiver, stickySpeedMultiplier, type StickyZone } from "../data/candyWorld";
import { oceanWorldConfig as OW, oceanRegions, oceanCurrentZones, currentForceAt, isSafeOceanSpawn, isOutsideKrakenArena, pearlCoinSpawnAllowed, containKrakenArenaPoint, krakenAttackTarget, krakenHitZone, type CurrentZone, type CoralObstacle } from "../data/oceanWorld";
import { applyWorldOrientation } from "../services/OrientationService";
import { missionsForProfile } from "../data/missions";
import { scorpionlingSlowMultiplier, scorpionlingWindForce } from "../systems/ScorpionlingSystem";
import { desertWorldConfig as DW, desertRegions, desertGusts, desertRouteGustAt, desertRouteAt, desertRareCoinSpots, inDesertOasis, containDesertArenaPoint, blockDesertArenaCrossing, circleIntersectsDesertWall, isDesertArenaPickupAccessible, scorpionStingHitZone, scorpionStingEffect, scorpionJumpHitZone, scorpionJumpEffect, scorpionPoisonStrikeEffect, type SandGust } from "../data/desertWorld";
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
  private skinTrail!: Phaser.GameObjects.Graphics;
  private selectedCosmetic = getSkin("classic")!;
  private ring!: Phaser.GameObjects.Graphics;
  private hud!: GameplayHUD;
  private ui!: ScreenUI;
  private joystick!: FloatingJoystick;
  private turboButton!: TurboButton;
  private freezeButton?: HTMLButtonElement;
  private freezeReward?: Phaser.GameObjects.Container;
  private freezePortal?: Phaser.GameObjects.Container;
  private freezePortalCooldown = 0;
  private freezeModalPending = false;
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
  private runNumberInSession = 0;
  private startingWorld = "green-valley";
  private worldEnteredAt = 0;
  private visitedWorlds = new Set<string>();
  private worldEntryType: "normal_portal" | "secret_portal" | "return" = "return";
  private coinCounts: Record<string, number> = { normal: 0, blue: 0, diamond: 0, golden: 0, special: 0 };
  private maxSnakeLength = 5;
  private bossAttempts: Record<string, number> = {};
  private bossStartedAt = 0;
  private bossDamageTaken = 0;
  private shieldUses = 0;
  private lastReportedTurboUses = 0;
  private currentEndReason: "death" | "quit" | "restart" | "app_background_timeout" | "unknown" = "unknown";
  private currentDeathReason = "unknown";
  private backgroundTimer?: ReturnType<typeof setTimeout>;
  private appStateHandle?: { remove: () => Promise<void> };
  private appStateListenerToken = 0;
  private runFinalized = false;
  private runStarted = false;
  private activeElapsed = 0;
  private sessionStartedAt = 0;
  private attemptedBossCount = 0;
  private completedBossCount = 0;
  private secretWorldsVisited = new Set<string>();
  private firstPortalEntered = false;
  private abyssChallengeElapsed = 0;
  private abyssObstacleTimer = 0;
  private abyssMovingObstacles: Array<{ obstacle: Obstacle; graphics: Phaser.GameObjects.Graphics; moveIn: number; start?: Point; target?: Point; moveDuration: number; moveElapsed: number }> = [];
  private abyssRewardPending = false;
  private abyssChallengeTimer?: HTMLElement;
  private abyssSanctuaryHud?: HTMLElement;
  private abyssPortal?: Phaser.GameObjects.Container;
  private worldTransitioning = false;
  private passageCooldown = 0;
  private worldPortal?: Phaser.GameObjects.Container;
  private worldPassages: Phaser.GameObjects.Container[] = [];
  private secretSpiderPassage?: Phaser.GameObjects.Container;
  private spiderExitWeb?: Phaser.GameObjects.Graphics;
  private cloverPassage?: Phaser.GameObjects.Container;
  private cloverRevengePortal?: Phaser.GameObjects.Container;
  private cloverRevengePortalNeedsExit = false;
  private cloverReturnPortalPosition?: { x: number; y: number };
  private bossPortal?: Phaser.GameObjects.Container;
  private bossIntroOpen = false;
  private bossPortalExpiresAt = 0;
  private boss?: { definition: BossDefinition; health: number; krakenHealAttempted?: boolean; krakenHitFlash?: number; krakenTentacleTimers?: number[]; krakenSuckers?: Phaser.GameObjects.Graphics[]; scorpionPoisonSequence?: boolean; scorpionJumpAttackPending?: boolean; scorpionJumpAttackActive?: boolean; scorpionJumpStartX?: number; scorpionJumpStartY?: number; scorpionPoisonAttacks?: number; phase: number; attack: number; speed: number; image: Phaser.GameObjects.Image | Phaser.GameObjects.Container; bodySegments: Phaser.GameObjects.Image[]; trail: Point[]; visualAngle: number; lastVisualX: number; lastVisualY: number; state: "CHASE" | "PREPARE_CHARGE" | "CHARGE" | "STUNNED" | "RECOVER" | "DROP_ATTACK" | "ATTACK_MODE" | "CANDY_FLEE" | "SUGAR_RUSH" | "IDLE" | "KRAKEN_HEAL" | "TELEGRAPH_SLAM" | "ATTACK_EXTEND" | "SLAM" | "EXPOSED" | "WHIRLPOOL" | "SCORPION_STING_TELEGRAPH" | "SCORPION_STING" | "SCORPION_LAND" | "SCORPION_POISON_JUMP" | "SCORPION_POISON_TELEGRAPH" | "SCORPION_POISON_STRIKE" | "SCORPION_POISON" | "SCORPION_POISON_RETURN" | "SCORPION_JUMP_TELEGRAPH" | "SCORPION_JUMP" | "SCORPION_JUMP_LAND"; stateTimer: number; stateTargetX?: number; stateTargetY?: number; targetX: number; targetY: number; chargeX: number; chargeY: number; doubleCharge: number; hazard?: Phaser.GameObjects.Container; krakenTentacles?: Phaser.GameObjects.Graphics[]; scorpionTail?: Phaser.GameObjects.Container; scorpionStinger?: Phaser.GameObjects.Graphics; scorpionStingerRetracting?: boolean };
  private scorpionPoisonPuddles: Array<{ x: number; y: number; life: number; image: Phaser.GameObjects.Graphics }> = [];
  private scorpionPoisonTouching = false;
  private bossFight = new BossFightSystem();
  private bossPickups: Array<{ x: number; y: number; life: number; kind: "boss-coin" | "loot-boss-coin" | "crown-orb" | "sugar-shield" | "attack-pearl" | "candy-aura" | "candy-shield" | "life-reward"; image: Phaser.GameObjects.Container }> = [];
  private bossMarkers: Phaser.GameObjects.GameObject[] = [];
  private bossCurrent?: { x: number; y: number; direction: number; force: number; life: number; graphics: Phaser.GameObjects.Graphics };
  private bossWhirlpool?: Phaser.GameObjects.Graphics;
  private bossCoinsTimer = 2;
  private bossAuraGraphics?: Phaser.GameObjects.Graphics;
  private bossCollisionGrace = 0;
  private bossHud?: HTMLElement;
  private bossDirectionIndicator?: Phaser.GameObjects.Graphics;
  private bossEnergyHud?: HTMLElement;
  private auraStatusHud?: HTMLElement;
  private petSprite?: Phaser.GameObjects.Container;
  private celestialSerpentBody: Point[] = [];
  private gameDifficulty: GameDifficulty = "normal";
  private bossDefinition?: BossDefinition;
  private portalSystem = new PortalSystem();
  private worldSpeedMultiplier = 1;
  private stickyZones: StickyZone[] = [];
  private spiderWebZones: Array<{ zone: StickyZone; graphic: Phaser.GameObjects.Graphics; expiresAt: number }> = [];
  private spiderWebSlow = 1;
  private stickyGraphics?: Phaser.GameObjects.Graphics;
  private stickySpeed = 1;
  private stickyFeedbackAt = 0;
  private candyCoinSpawned = false;
  private candyCoinTimer = CW.candyCoin.opportunitySeconds;
  private candyAttackSlow = 0;
  private candyHoneyZones: Array<{ x: number; y: number; radius: number; expiresAt: number }> = [];
  private candyWorldObjects: Phaser.GameObjects.GameObject[] = [];
  private oceanObjects: Phaser.GameObjects.GameObject[] = [];
  private oceanDecorations: Phaser.GameObjects.GameObject[] = [];
  private worldArenaGraphics?: Phaser.GameObjects.Graphics;
  private oceanCurrents: CurrentZone[] = [];
  private oceanCorals: CoralObstacle[] = [];
  private currentGraphics?: Phaser.GameObjects.Graphics;
  private pearlTimer: number = OW.pearlCooldown;
  private currentZoneId?: string;
  private deepTrenchActive = false;
  private abyssPortalNeedsExit = false;
  private clam?: { x: number; y: number; state: "CLOSED" | "OPENING" | "OPEN" | "EMPTY"; image: Phaser.GameObjects.Container; timer: number; coin?: Coin };
  private krakenBarrier?: Phaser.GameObjects.Container;
  private krakenBarrierGate?: Phaser.GameObjects.Graphics;
  private krakenBarrierCooldown = 0;
  private krakenHealExitTimer = 0;
  private krakenReturnAngle?: number;
  private krakenReturnTimer = 0;
  private desertObjects: Phaser.GameObjects.GameObject[] = [];
  private desertGustZones: SandGust[] = [];
  private desertGustGraphics?: Phaser.GameObjects.Graphics;
  private desertRouteCoins: Phaser.GameObjects.GameObject[] = [];
  private cloverObjects: Phaser.GameObjects.Container[] = [];
  private desertArenaBarrier?: Phaser.GameObjects.Container;
  private scorpionArenaClosed = false;
  private desertBarrierCooldown = 0;
  private desertCheckpointGrace = false;
  private spiderArena?: Phaser.GameObjects.Container;
  private spiderArenaOpen = false;
  private spiderStalactite?: Phaser.GameObjects.Container;
  private spiderStalactiteBaseY = 0;
  private spiderStalactiteReady = false;
  private spiderStalactiteFalling = false;
  private spiderWebTimer = 0;
  private spiderBossCoinTimer = 0;
  private spiderArenaCooldown = 0;
  private spiderlings: Array<{ image: Phaser.GameObjects.Container; x: number; y: number; speed: number }> = [];
  private spiderlingTimer = 9;
  private spiderlingWave = 0;
  private scorpionlingCooldown = 0;
  private scorpionlingAttack?: { target: Phaser.GameObjects.Container; startX: number; startY: number; phase: "outbound" | "returning"; elapsed: number };
  private petActionCooldown = 0;
  private turtleShieldCooldown: number = B.power.turtleShieldInterval;
  private phoenixRevived = false;
  private phoenixReviving = false;
  private phoenixAuras: Phaser.GameObjects.Arc[] = [];
  private phoenixWings: Phaser.GameObjects.Container | undefined;
  private petRewardCount = 0;
  private cloverGardenBoss?: Phaser.GameObjects.Container;
  private cloverGardenHazard?: Phaser.GameObjects.Container;
  private dragonAttack?: { x: number; y: number; targetX: number; targetY: number; elapsed: number; duration: number; kind: "enemy" | "boss" };
  private dragonFlame?: Phaser.GameObjects.Graphics;
  private sanctuaryObjects: Phaser.GameObjects.Container[] = [];
  private masteryCredited = false;
  constructor() {
    super("Game");
  }
  create() {
    const listenerToken = ++this.appStateListenerToken;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive && !this.dead && !this.run.finished) {
        this.halted = true;
        if (this.backgroundTimer) clearTimeout(this.backgroundTimer);
        this.backgroundTimer = setTimeout(() => {
          if (this.run.finished) return;
          this.currentEndReason = "app_background_timeout";
          if (this.runStarted) {
            analytics.track("run_abandoned", { endReason: "app_background_timeout", worldId: this.currentWorld, durationSeconds: Math.max(0, Math.round(this.activeElapsed)) });
            this.finalize();
          }
        }, 120_000);
      } else if (isActive) {
        if (this.backgroundTimer) clearTimeout(this.backgroundTimer);
        this.backgroundTimer = undefined;
        if (!this.dead && !this.run.finished && !this.overlay) this.halted = false;
      }
    }).then((handle) => { if (listenerToken !== this.appStateListenerToken) void handle.remove(); else this.appStateHandle = handle; });
    audio.setGameplayActive(this, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      audio.setGameplayActive(this, false),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { if (this.backgroundTimer) clearTimeout(this.backgroundTimer); void this.appStateHandle?.remove(); });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this.appStateListenerToken++; void this.appStateHandle?.remove(); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.backgroundTimer) clearTimeout(this.backgroundTimer);
      if (this.runStarted && !this.runFinalized && !this.run.finished) {
        const abandonmentReason = this.currentEndReason === "restart" || this.currentEndReason === "app_background_timeout" ? this.currentEndReason : "quit";
        analytics.track("run_abandoned", { endReason: abandonmentReason, worldId: this.currentWorld, durationSeconds: Math.max(0, Math.round(this.activeElapsed)) });
        this.finalize();
      }
    });
    const initData = (this.scene.settings.data ?? {}) as { startWorld?: string; cloverGarden?: boolean; cloverReturn?: boolean; cloverRevenge?: boolean; cloverOrigin?: "candy-world" | "ocean"; returnWorld?: string; bossEnergy?: number; desertExpedition?: boolean; gameDifficulty?: GameDifficulty };
    this.gameDifficulty = initData.gameDifficulty === "easy" || initData.gameDifficulty === "hard" || initData.gameDifficulty === "normal"
      ? initData.gameDifficulty
      : save.profile.settings.gameDifficulty;
    save.profile.settings.gameDifficulty = this.gameDifficulty;
    reconcileWorldUnlocks(save.profile);
    const requestedWorld = initData.startWorld ?? save.profile.selectedWorld;
    const selected = worldById(requestedWorld);
    const desertExpeditionActive = initData.desertExpedition === true && save.profile.bossesDefeated.includes("scorpion-king")
      || initData.startWorld === "desert-labyrinth" && save.profile.desertExpeditionActive && save.profile.bossesDefeated.includes("scorpion-king");
    const gardenOrigin = initData.cloverOrigin === "ocean" ? "ocean" : "candy-world";
    const returningFromGarden = initData.cloverReturn === true;
    this.cloverReturnPortalPosition = returningFromGarden ? { x: B.arena.left + 90, y: (B.arena.top + B.arena.bottom) / 2 } : undefined;
    const canEnterGarden = !returningFromGarden && (initData.cloverGarden === true || requestedWorld === "clover-garden")
      && save.profile.selectedSkin === "abyssal-serpent"
      && (gardenOrigin === "candy-world" ? save.profile.worldsUnlocked.includes("candy-world") : save.profile.worldsUnlocked.includes("ocean"));
    this.currentWorld = desertExpeditionActive ? "desert-labyrinth" : canEnterGarden
      ? "clover-garden"
      : selected.isImplemented && (save.profile.worldsUnlocked.includes(selected.id) || selected.id === "desert-labyrinth" && save.profile.bossesDefeated.includes("scorpion-king")) ? selected.id : "green-valley";
    this.abyssChallengeElapsed = 0;
    this.abyssObstacleTimer = 0;
    this.abyssMovingObstacles = [];
    this.abyssRewardPending = false;
    this.abyssPortal?.destroy(); this.abyssPortal = undefined;
    this.abyssChallengeTimer = undefined;
    this.abyssSanctuaryHud = undefined;
    void applyWorldOrientation(this.currentWorld, save.profile.settings.orientation);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => void applyWorldOrientation("green-valley", save.profile.settings.orientation));
    this.selectedCosmetic = getSkin(save.profile.selectedSkin) ?? getSkin("classic")!;
    this.worldSpeedMultiplier = worldById(this.currentWorld).speedMultiplier;
    this.masteryCredited = false;
    this.worldPortal = undefined;
    this.worldPassages = [];
    this.secretSpiderPassage?.destroy(); this.secretSpiderPassage = undefined;
    this.spiderExitWeb = undefined;
    this.cloverPassage?.destroy(); this.cloverPassage = undefined;
    this.cloverObjects = [];
    this.cloverGardenBoss?.destroy(); this.cloverGardenBoss = undefined;
    this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = undefined;
    this.worldTransitioning = false;
    this.passageCooldown = 0;
    this.desertCheckpointGrace = false;
    this.bossPortal = undefined;
    this.krakenBarrier?.destroy();
    this.krakenBarrier = undefined;
    this.krakenBarrierGate = undefined;
    this.krakenBarrierCooldown = 0;
    this.krakenHealExitTimer = 0;
    this.krakenReturnAngle = undefined;
    this.krakenReturnTimer = 0;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.krakenBarrier?.destroy();
      this.krakenBarrier = undefined;
    });
    this.bossIntroOpen = false;
    this.bossPortalExpiresAt = 0;
    this.boss?.image.destroy();
    this.boss = undefined;
    this.spiderArena?.destroy(); this.spiderArena = undefined;
    this.spiderArenaOpen = false;
    this.spiderStalactite?.destroy(); this.spiderStalactite = undefined;
    this.spiderArenaCooldown = 0;
    this.spiderStalactiteReady = false; this.spiderStalactiteFalling = false;
    this.spiderWebTimer = 0; this.spiderBossCoinTimer = 0;
    this.spiderlings.forEach(({ image }) => image.destroy()); this.spiderlings = [];
    this.spiderArenaCooldown = 0; this.spiderlingTimer = 9; this.spiderlingWave = 0;
    this.scorpionlingCooldown = 0;
    this.scorpionlingAttack = undefined;
    this.petActionCooldown = save.profile.selectedPet === "bee" ? 18 : save.profile.selectedPet === "tiny-dragon" ? 2 : save.profile.selectedPet === "celestial-serpent" ? 3 : 0;
    this.petRewardCount = 0; this.dragonAttack = undefined;
    this.dragonFlame?.destroy(); this.dragonFlame = undefined;
    this.sanctuaryObjects = [];
    this.bossPickups = [];
    this.bossMarkers = [];
    this.bossCurrent = undefined;
    this.bossWhirlpool?.destroy(); this.bossWhirlpool = undefined;
    this.bossAuraGraphics?.destroy(); this.bossAuraGraphics = undefined;
    this.bossCollisionGrace = 0;
    this.bossDefinition = undefined;
    this.petSprite?.destroy();
    this.petSprite = undefined;
    this.celestialSerpentBody = [];
    this.snake = new Snake();
    this.selectedCosmetic = getSkin(save.profile.selectedSkin) ?? getSkin("classic")!;
    const labyrinthStart = this.currentWorld === "desert-labyrinth" ? this.desertLabyrinthEntry() : undefined;
    this.snake.reset(labyrinthStart?.x ?? 700, labyrinthStart?.y ?? 750, labyrinthStart ? 0 : undefined);
    this.turbo = new TurboSystem();
    this.steering = new SteeringSystem();
    this.shrinkTimer = shrinkCooldown();
    this.lastOrientation = undefined;
    this.cameraX = this.snake.x;
    this.cameraY = this.snake.y;
    this.run = newRun();
    analytics.resetSession();
    this.sessionStartedAt = this.sessionStartedAt || Date.now();
    this.runNumberInSession = analytics.getRunNumber();
    this.activeElapsed = 0;
    this.runStarted = false;
    this.activeElapsed = 0;
    this.runFinalized = false;
    this.startingWorld = this.currentWorld;
    this.visitedWorlds = new Set([this.currentWorld]);
    this.worldEntryType = "return";
    this.coinCounts = { normal: 0, blue: 0, diamond: 0, golden: 0, special: 0 };
    this.secretWorldsVisited = new Set();
    this.bossAttempts = {};
    this.shieldUses = 0;
    this.lastReportedTurboUses = 0;
    this.worldEnteredAt = this.run.elapsed;
    this.maxSnakeLength = this.snake.length;
    this.firstPortalEntered = false;
    this.currentEndReason = "unknown";
    this.currentDeathReason = "unknown";
    this.runFinalized = false;
    if (Number.isFinite(initData.bossEnergy)) this.run.bossEnergy = Math.max(0, initData.bossEnergy!);
    startMissionRun(save.profile, this.run);
    if (save.profile.missionDate === this.run.missionDate) void save.save();
    this.run.gameDifficulty = this.gameDifficulty;
    this.combo = new ComboSystem();
    this.powers = new PowerUpSystem();
    this.turtleShieldCooldown = B.power.turtleShieldInterval;
    this.phoenixRevived = false;
    this.phoenixReviving = false;
    this.phoenixWings?.destroy();
    this.phoenixWings = undefined;
    this.coins = [];
    this.obstacles = [];
    this.abyssMovingObstacles = [];
    this.abyssObstacleTimer = 0;
    this.abyssRewardPending = false;
    this.worldPortal = undefined;
    this.stickyZones = [];
    this.candyWorldObjects = [];
    this.stickySpeed = 1;
    this.stickyFeedbackAt = 0;
    this.candyCoinSpawned = false;
    this.candyCoinTimer = CW.candyCoin.opportunitySeconds;
    this.candyAttackSlow = 0;
    this.candyHoneyZones = [];
    this.oceanObjects = [];
    this.oceanDecorations = [];
    this.oceanCurrents = [];
    this.oceanCorals = [];
    this.pearlTimer = OW.pearlCooldown;
    this.currentZoneId = undefined;
    this.deepTrenchActive = false;
    this.desertObjects = [];
    this.desertGustZones = [];
    this.desertGustGraphics = undefined;
    this.desertRouteCoins = [];
    this.desertArenaBarrier?.destroy(); this.desertArenaBarrier = undefined;
    this.scorpionArenaClosed = false;
    this.desertBarrierCooldown = 0;
    this.clam = undefined;
    this.power = undefined;
    this.poison?.image.destroy();
    this.poison = undefined;
    this.clearScorpionPoisonPuddles();
    this.sprites = [];
    this.aim = null;
    this.countdown = powerUpSpawnInterval(this.gameDifficulty);
    this.accumulator = 0;
    this.halted = false;
    this.dead = false;
    this.overlay = undefined;
    this.cameras.main.setBackgroundColor(worldById(this.currentWorld).background);
    const a = B.arena,
      g = this.worldArenaGraphics = this.add.graphics().setDepth(-10);
    g.fillStyle(this.currentWorld === "silent-abyss" ? 0x09111e : this.currentWorld === "spider-lair" ? 0x171923 : this.currentWorld === "desert" ? 0x996136 : 0x9ac582).fillRoundedRect(
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
    if (this.currentWorld !== "silent-abyss" && this.currentWorld !== "spider-lair" && this.currentWorld !== "desert-labyrinth") this.drawWorldPassageMarkers(g);
    for (let i = 0; i < 650; i++) {
      const x = a.left + 22 + ((i * 73) % (a.right - a.left - 44)),
        y = a.top + 22 + ((i * 137) % (a.bottom - a.top - 44));
      const candy = this.currentWorld === "candy-world", ocean = this.currentWorld === "ocean", abyss = this.currentWorld === "silent-abyss", spider = this.currentWorld === "spider-lair", desert = this.currentWorld === "desert" || this.currentWorld === "desert-labyrinth", clover = this.currentWorld === "clover-garden";
      g.fillStyle(clover ? (i % 3 ? 0x75a953 : 0xb5d866) : spider ? (i % 3 ? 0x55435f : 0xb98bd5) : abyss ? (i % 3 ? 0x31556a : 0x397e78) : desert ? (i % 3 ? 0xc58945 : 0xf1ca79) : ocean ? (i % 3 ? 0xb5dfe1 : 0xd3e5c8) : candy ? (i % 3 ? 0xf5b8d8 : 0xffd6a5) : (i % 3 ? 0xbbd09e : 0xcbdca9), spider || abyss ? 0.2 : desert ? 0.42 : ocean ? 0.24 : 0.55).fillEllipse(
        x,
        y,
        5 + (i % 4),
        3,
      );
    }
    if (this.currentWorld === "candy-world") this.buildCandyWorld(g);
    if (this.currentWorld === "ocean") this.buildOceanWorld(g);
    if (this.currentWorld === "silent-abyss") this.buildSilentAbyss(g);
    if (this.currentWorld === "desert") this.buildDesertWorld(g);
    if (this.currentWorld === "spider-lair") this.buildSpiderLair(g);
    if (this.currentWorld === "clover-garden") this.buildCloverGarden(g);
    this.coins = Array.from(
      { length: B.difficulty.maxCoins },
      () => new Coin(this),
    );
    if (this.currentWorld === "clover-garden") {
      for (const coin of this.coins) coin.hide();
      this.worldPassages = [];
    }
    if (this.currentWorld !== "candy-world" && this.currentWorld !== "ocean" && this.currentWorld !== "silent-abyss" && this.currentWorld !== "desert" && this.currentWorld !== "spider-lair" && this.currentWorld !== "desert-labyrinth" && this.currentWorld !== "clover-garden")
      for (let i = 0; i < B.difficulty.initialObstacles; i++)
        this.spawnObstacle(true);
    if (this.currentWorld === "ocean") this.spawnOceanCorals();
    if (this.currentWorld === "silent-abyss" && !save.profile.abyssChallengeCompleted) this.spawnAbyssObstacles(16);
    if (this.currentWorld === "desert") {
      this.spawnDesertRuins();
      this.createDesertArenaBarrier();
      this.refreshDesertExpeditionEntrance();
    }
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
    this.ui = new ScreenUI(this, "game-ui");
    this.ui.root.classList.toggle(
      "left-handed",
      save.profile.settings.leftHanded,
    );
    this.ui.html(
      `<div class="hud"><div class="hud-stats"><div><span class="hud-label">PONTOS</span><b class="hud-value" id="score">0</b></div><div><span class="hud-label">MOEDAS</span><b class="hud-value" id="coins">0</b></div><div><span class="hud-label">COMBO</span><b class="hud-value" id="combo">×1</b></div></div><div id="lives" class="lives-indicator" aria-label="Vidas restantes">♥ 2</div><button id="pause" class="action small pause-button" aria-label="Pausar partida">Ⅱ</button></div><div class="player-level"><div class="player-level__label"><b id="player-level-value">NÍVEL ${save.profile.playerLevel}</b><span id="player-xp-value"></span></div><div class="player-level__track"><i id="player-xp-bar"></i></div></div><div id="effects" class="effects"></div><div class="world-tag" id="world-tag">${worldById(this.currentWorld).name.toUpperCase()}</div>${this.currentWorld === "silent-abyss" && !save.profile.abyssChallengeCompleted ? '<div id="abyss-timer" class="world-tag">DESAFIO · 90 s</div>' : ""}${this.currentWorld === "silent-abyss" && save.profile.abyssSanctuaryProgress < 3 ? `<div id="abyss-sanctuaries" class="world-tag">SANTUÁRIOS · ${save.profile.abyssSanctuaryProgress}/3</div>` : ""}<div id="boss-energy" class="boss-energy">BOSS ENERGY 0/350</div><section id="boss-hud" class="boss-health-hud" aria-label="Vida do chefe" aria-live="polite" hidden><div class="boss-health-hud__heading"><strong data-boss-name></strong><span data-boss-hp></span></div><div class="boss-health-hud__track" role="meter" aria-label="Vida do chefe" aria-valuemin="0" aria-valuemax="1" aria-valuenow="1"><i data-boss-health-bar></i></div><div class="boss-health-hud__status" data-boss-status></div></section><div id="aura-status" class="aura-status" hidden></div><div id="joystick" class="joystick-zone" aria-label="Área do joystick"></div><div class="turbo-control"><button id="turbo" class="turbo-button" aria-label="Segure para acelerar">⚡ TURBO</button><button id="freeze" class="turbo-button freeze-button" aria-label="Ativar Freeze" hidden>❄ FREEZE</button><div class="track"><i id="turbo-bar" style="width:100%"></i></div><small id="turbo-value">100 / 100</small></div>`,
    );
    if (save.profile.selectedPet) {
      const petColor = save.profile.selectedPet === "bee" ? 0xffd84d : save.profile.selectedPet === "snow-pup" ? 0x9edfff : save.profile.selectedPet === "tiny-dragon" ? 0xaaa59b : save.profile.selectedPet === "firefly" ? 0xc7ff72 : save.profile.selectedPet === "tidal-turtle" ? 0x56c9b0 : save.profile.selectedPet === "phoenix" ? 0xff793f : save.profile.selectedPet === "celestial-serpent" ? 0x42c978 : save.profile.selectedPet === "scorpionling" ? 0xf5a642 : save.profile.selectedPet === "baby-octopus" ? 0x9f7aea : 0xe783d0;
      const petGraphic = this.add.graphics();
      if (save.profile.selectedPet === "snow-pup") {
        // A small aurora spirit: rounded icy body, luminous crest, and frost sparkles.
        petGraphic.fillStyle(0x78e8e1, 0.2).fillCircle(0, 0, 20);
        petGraphic.fillStyle(0x5487d9, 1).fillEllipse(0, 3, 25, 22)
          .fillStyle(0x9be9f0, 1).fillEllipse(0, 0, 21, 20)
          .fillStyle(0xe2fcff, 1).fillEllipse(-2, 5, 12, 10)
          .fillStyle(0x7edfcf, 1).fillTriangle(-8, -7, -5, -19, 0, -6)
          .fillStyle(0x85c9ff, 1).fillTriangle(-1, -7, 7, -20, 8, -5)
          .fillStyle(0xc296ff, 1).fillTriangle(4, -7, 15, -13, 10, -2)
          .fillStyle(0x263d69, 1).fillCircle(-5, -1, 1.7).fillCircle(5, -1, 1.7)
          .fillStyle(0xffffff, 1).fillCircle(-5.4, -1.5, 0.55).fillCircle(4.6, -1.5, 0.55)
          .fillStyle(0x5279b7, 1).fillCircle(0, 4, 1.5)
          .lineStyle(1.4, 0xecffff, 0.95).strokeEllipse(0, 1, 27, 25)
          .fillStyle(0xffffff, 0.95).fillCircle(-16, -8, 1.5).fillCircle(16, -5, 1.2).fillCircle(11, 13, 1);
      } else if (save.profile.selectedPet === "tidal-turtle") {
        // Recognizable sea turtle: segmented domed shell, forward head, and four flippers.
        petGraphic.fillStyle(0x42c8bd, 0.16).fillEllipse(0, 1, 38, 34);
        petGraphic.fillStyle(0x2b8f83, 1).fillTriangle(-7, -3, -20, -12, -13, 3)
          .fillTriangle(8, -3, 21, -12, 14, 4)
          .fillTriangle(-7, 7, -17, 18, -3, 13)
          .fillTriangle(7, 7, 17, 18, 3, 13);
        petGraphic.lineStyle(1.5, 0x174f5a, 1).beginPath().moveTo(-7, -3).lineTo(-20, -12).lineTo(-13, 3)
          .moveTo(8, -3).lineTo(21, -12).lineTo(14, 4).moveTo(-7, 7).lineTo(-17, 18).lineTo(-3, 13)
          .moveTo(7, 7).lineTo(17, 18).lineTo(3, 13).strokePath();
        petGraphic.fillStyle(0x155d69, 1).fillEllipse(0, 1, 25, 24)
          .fillStyle(0x36a99a, 1).fillEllipse(0, 0, 21, 20)
          .fillStyle(0x78d9bd, 1).fillEllipse(0, -2, 15, 13)
          .lineStyle(1.4, 0xd0ffe7, 0.9).strokeEllipse(0, 0, 23, 22);
        petGraphic.lineStyle(1.2, 0x176c70, 1).beginPath().moveTo(0, -10).lineTo(0, 10)
          .moveTo(-8, -6).lineTo(8, -6).moveTo(-10, 1).lineTo(10, 1).moveTo(-7, 8).lineTo(7, 8).strokePath();
        petGraphic.fillStyle(0x67cfb4, 1).fillEllipse(0, -11, 14, 13)
          .fillStyle(0x173e54, 1).fillCircle(-3, -13, 1.5).fillCircle(3, -13, 1.5)
          .fillStyle(0xffffff, 1).fillCircle(-3.4, -13.5, 0.5).fillCircle(2.6, -13.5, 0.5)
          .lineStyle(1, 0x287b7d, 1).lineBetween(-2, -8, 2, -8);
      } else if (save.profile.selectedPet === "celestial-serpent") {
        // The head is separate; animated body segments follow behind it below.
        petGraphic.fillStyle(0x38bc71, 1).fillEllipse(7, -2, 18, 14)
          .fillStyle(0x91e777, 1).fillEllipse(7, -4, 14, 10)
          .fillStyle(0x4acb78, 1).fillTriangle(1, -7, 1, -14, 7, -7)
          .fillStyle(0x38bc71, 1).fillTriangle(8, -7, 13, -13, 13, -4)
          .fillStyle(0x173e38, 1).fillCircle(10, -4, 1.4)
          .fillStyle(0xffffff, 1).fillCircle(10.4, -4.5, 0.45)
          .fillStyle(0xf3d66f, 1).fillTriangle(13, -2, 20, 0, 13, 2)
          .fillStyle(0xfff1a3, 1).fillCircle(4, -9, 1.1);
      } else if (save.profile.selectedPet === "phoenix") {
        petGraphic.fillStyle(0xff6b35).fillTriangle(-3, 9, -13, 22, 1, 16).fillTriangle(3, 9, 14, 22, -1, 16)
          .fillTriangle(-1, 8, -4, 25, 2, 18).fillTriangle(1, 8, 5, 25, -2, 18)
          .fillStyle(0xffcf55).fillEllipse(0, 2, 16, 20)
          .fillStyle(0xff9e32).fillEllipse(0, 6, 10, 12)
          .fillStyle(0xffe8a0).fillTriangle(-3, -5, -2, -15, 1, -5).fillTriangle(0, -5, 7, -12, 4, -3)
          .fillStyle(0x203044).fillCircle(3, -1, 1.5)
          .fillStyle(0xd94b32).fillTriangle(4, 1, 11, 3, 5, 5)
          .fillStyle(0xffdf65).fillTriangle(5, 1, 10, 3, 5, 4)
          .lineStyle(0.8, 0x9e382f, 1).lineBetween(5, 3, 9, 3)
          .fillStyle(0x9e382f).fillCircle(4.5, 1.5, 0.55);
        const leftWing = this.add.graphics().setPosition(-5, 0);
        leftWing.fillStyle(0xb93836).fillTriangle(0, 0, -19, -12, -13, 5)
          .fillStyle(0xff6a32).fillTriangle(-2, 1, -22, -5, -12, 8)
          .fillStyle(0xffbd42).fillTriangle(-2, 2, -17, 3, -9, 11)
          .lineStyle(1, 0xffe89a, 0.9).lineBetween(-4, 1, -18, -9).lineBetween(-5, 4, -18, 0);
        const rightWing = this.add.graphics().setPosition(5, 0);
        rightWing.fillStyle(0xb93836).fillTriangle(0, 0, 19, -12, 13, 5)
          .fillStyle(0xff6a32).fillTriangle(2, 1, 22, -5, 12, 8)
          .fillStyle(0xffbd42).fillTriangle(2, 2, 17, 3, 9, 11)
          .lineStyle(1, 0xffe89a, 0.9).lineBetween(4, 1, 18, -9).lineBetween(5, 4, 18, 0);
        this.phoenixWings = this.add.container(0, -1, [leftWing, rightWing]);
      } else if (save.profile.selectedPet === "bee") {
        // A tiny, clearly striped bee with translucent wings, antennae, and a stinger.
        petGraphic.fillStyle(0xdff8ff, 0.82).fillEllipse(-6, -12, 12, 18).fillEllipse(6, -12, 12, 18);
        petGraphic.lineStyle(1.5, 0xffffff, 0.95).strokeEllipse(-6, -12, 12, 18).strokeEllipse(6, -12, 12, 18);
        petGraphic.fillStyle(0xffd92e, 1).fillEllipse(0, 1, 24, 19);
        petGraphic.fillStyle(0x171717, 1).fillEllipse(-5, 1, 4, 17).fillEllipse(2, 1, 4, 18).fillEllipse(8, 1, 3, 15);
        petGraphic.fillStyle(0xffe24a, 1).fillCircle(0, -8, 7);
        petGraphic.lineStyle(1.7, 0x171717, 1).beginPath().moveTo(-3, -13).lineTo(-6, -18).lineTo(-8, -18)
          .moveTo(3, -13).lineTo(6, -18).lineTo(8, -18).strokePath();
        petGraphic.fillStyle(0x171717, 1).fillCircle(-2.5, -9, 1.15).fillCircle(2.5, -9, 1.15);
        petGraphic.fillStyle(0xffffff, 1).fillCircle(-2.8, -9.4, 0.38).fillCircle(2.2, -9.4, 0.38);
        petGraphic.fillStyle(0x171717, 1).fillTriangle(11, 1, 17, 3, 11, 5);
        petGraphic.lineStyle(1.5, 0x171717, 1).lineBetween(-5, 8, -7, 11).lineBetween(1, 9, 1, 12).lineBetween(7, 7, 9, 10);
      } else if (save.profile.selectedPet !== "scorpionling" && save.profile.selectedPet !== "tiny-dragon") {
        petGraphic.fillStyle(petColor).fillCircle(0, 0, 12);
        petGraphic.lineStyle(2, 0xffffff).strokeCircle(0, 0, 12);
      }
      if (save.profile.selectedPet === "firefly") petGraphic.lineStyle(2, 0xffffff).lineBetween(-17, -8, -9, -3).lineBetween(9, -3, 17, -8);
      if (save.profile.selectedPet === "scorpionling") {
        // Miniature of the Scorpion King's silhouette: broad armored shell,
        // forward claws, six side legs, and a large curled tail overhead.
        petGraphic.lineStyle(2, 0x57331f, 1);
        for (const side of [-1, 1]) {
          for (let leg = 0; leg < 3; leg++) {
            const startY = -1 + leg * 4;
            petGraphic.beginPath().moveTo(side * 5, startY).lineTo(side * 10, startY + 2).lineTo(side * 13, startY + 6).strokePath();
            petGraphic.fillStyle(0xe6a34c, 1).fillCircle(side * 10, startY + 2, 1.2);
          }
        }
        const tailPoints = [[2, 6], [7, 8], [11, 5], [13, 1], [12, -4], [9, -8], [5, -9]];
        petGraphic.lineStyle(4, 0x57331f, 1).beginPath().moveTo(tailPoints[0][0], tailPoints[0][1]);
        for (const [x, y] of tailPoints.slice(1)) petGraphic.lineTo(x, y);
        petGraphic.strokePath();
        petGraphic.lineStyle(2.5, 0xc87932, 1).beginPath().moveTo(tailPoints[0][0], tailPoints[0][1]);
        for (const [x, y] of tailPoints.slice(1)) petGraphic.lineTo(x, y);
        petGraphic.strokePath();
        petGraphic.fillStyle(0xf5c35c, 1);
        for (const [x, y] of tailPoints) petGraphic.fillCircle(x, y, 1.8);
        petGraphic.fillStyle(0x57331f, 1).fillEllipse(0, 3, 20, 15);
        petGraphic.fillStyle(0xb9672c, 1).fillEllipse(0, 2, 17, 12);
        petGraphic.fillStyle(0xe39a3f, 1).fillEllipse(0, 0, 13, 9);
        petGraphic.fillStyle(0xffd275, 0.8).fillEllipse(-3, -2, 5, 2.5);
        petGraphic.lineStyle(1, 0x8c4928, 1).lineBetween(-5, 1, -2, 3).lineBetween(0, 0, 2, 3).lineBetween(5, 1, 3, 4);
        petGraphic.lineStyle(3, 0x57331f, 1).beginPath().moveTo(-5, -1).lineTo(-10, 1).lineTo(-13, -2).strokePath()
          .beginPath().moveTo(5, -1).lineTo(10, 1).lineTo(13, -2).strokePath();
        petGraphic.lineStyle(1.5, 0xf5c35c, 1).beginPath().moveTo(-10, 1).lineTo(-13, 4).moveTo(-10, 1).lineTo(-14, 0)
          .moveTo(10, 1).lineTo(13, 4).moveTo(10, 1).lineTo(14, 0).strokePath();
        petGraphic.fillStyle(0xffe992, 1).fillCircle(-3, -2, 1.2).fillCircle(3, -2, 1.2);
        petGraphic.fillStyle(0x3b251d, 1).fillCircle(-3, -2, 0.6).fillCircle(3, -2, 0.6);
        petGraphic.fillStyle(0x533020, 1).fillTriangle(5, -9, 2, -6, 7, -6);
        petGraphic.fillStyle(0xffb347, 1).fillTriangle(5, -8, 3, -6, 6, -6);
        petGraphic.lineStyle(1.5, 0xffffff, 0.9).strokeEllipse(0, 1, 31, 31);
      }
      if (save.profile.selectedPet === "tiny-dragon") {
        petGraphic.fillStyle(0x74716b).fillEllipse(-2, 12, 21, 7)
          .fillStyle(0x8d8981).fillTriangle(-8, 3, -23, 11, -10, 9)
          .fillStyle(0xb9b5ac).fillTriangle(-7, -5, -22, -19, -16, 1)
          .fillStyle(0x77736c).fillTriangle(-7, -5, -18, -15, -13, 1)
          .fillStyle(0xd1ccc2).fillTriangle(1, -6, 19, -18, 13, 2)
          .fillStyle(0x89857e).fillTriangle(1, -6, 15, -14, 10, 2)
          .fillStyle(0xaaa59b).fillEllipse(0, 1, 29, 20)
          .fillStyle(0xd6d0c4).fillEllipse(-4, 7, 14, 8)
          .fillStyle(0x77736c).fillTriangle(8, -3, 17, -12, 15, 0)
          .fillStyle(0x35322e).fillCircle(8, -3, 2)
          .fillStyle(0xffd36a).fillCircle(8.5, -3.5, 0.8)
          .fillStyle(0xb9b5ac).fillTriangle(11, 3, 23, 5, 11, 8)
          .fillStyle(0xf18735).fillTriangle(21, 5, 28, 6, 21, 8)
          .lineStyle(1.5, 0x625e58, 0.85).lineBetween(-6, 8, 5, 8).lineBetween(-3, 10, 6, 10);
      }
      const serpentSegments: Phaser.GameObjects.Graphics[] = [];
      if (save.profile.selectedPet === "celestial-serpent") {
        this.celestialSerpentBody = Array.from({ length: 6 }, () => ({ x: this.snake.x + 42, y: this.snake.y + 28 }));
        for (let index = 0; index < this.celestialSerpentBody.length - 1; index++) {
          const segment = this.add.graphics();
          const width = 15;
          const height = 13;
          const green = index % 2 === 0 ? 0x38bc71 : 0x4acb78;
          segment.fillStyle(0x173e38, 1).fillEllipse(0, 0, width + 3, height + 2.8)
            .fillStyle(green, 1).fillEllipse(0, -0.2, width, height)
            .fillStyle(0x91e777, 0.96).fillEllipse(-1.3, -1.8, width * 0.62, height * 0.48)
            .fillStyle(0xd4ee9a, 1).fillEllipse(0, height * 0.2, width * 0.74, height * 0.42)
            .lineStyle(1, 0x24754a, 0.9).strokeEllipse(0, 0, width * 0.88, height * 0.88);
          serpentSegments.push(segment);
        }
      }
      this.petSprite = this.add.container(this.snake.x, this.snake.y + 28, [
        ...(this.phoenixWings ? [this.phoenixWings] : []), ...serpentSegments, petGraphic,
      ]).setDepth(25).setScale(save.profile.selectedPet === "phoenix" ? 1.35 : 1);
      if (save.profile.selectedPet === "tiny-dragon") this.dragonFlame = this.add.graphics().setDepth(26);
    }
    this.ui.on("#pause", () => this.requestPause());
    this.hud = new GameplayHUD(this.ui);
    this.bossHud = this.ui.get("#boss-hud");
    this.bossEnergyHud = this.ui.get("#boss-energy");
    this.auraStatusHud = this.ui.get("#aura-status");
    if (this.currentWorld === "clover-garden") this.activateCloverGarden();
    this.abyssChallengeTimer = this.ui.root.querySelector("#abyss-timer") ?? undefined;
    this.abyssSanctuaryHud = this.ui.root.querySelector("#abyss-sanctuaries") ?? undefined;
    this.bossHud?.classList.add("boss-fight-hud");
    this.joystick = new FloatingJoystick(this.ui.get("#joystick"));
    this.turboButton = new TurboButton(
      this.ui.get<HTMLButtonElement>("#turbo"),
    );
    this.freezeButton = this.ui.get<HTMLButtonElement>("#freeze");
    this.freezeButton.addEventListener("click", () => this.activateFreeze());
    if (this.currentWorld === "spider-lair" && save.profile.bossesDefeated.includes("spider-queen")) this.createFreezePortal();
    this.fruit = new ShrinkFruit(this);
    this.events.on("coinCollected", this.collectCoin, this);
    if (import.meta.env.DEV) this.installDebug();
    this.startAnalyticsRun();
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
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC,SPACE,SHIFT,F",
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
    if (!save.profile.tutorialCompleted || !save.profile.hints.joystick) {
      this.halted = true;
      this.pauseKind = "tutorial";
      this.overlay = this.ui.modal(
        t("tutorialTitle"),
        t("tutorialBody"),
        [
          {
            label: t("tutorialStart"),
            run: () => {
              this.startAnalyticsRun();
              analytics.track("tutorial_started", { tutorialId: "initial_controls" });
              if (!save.profile.tutorialCompleted) analytics.track("tutorial_completed", { tutorialId: "initial_controls" });
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
  private startAnalyticsRun() {
    if (this.runStarted) return;
    this.runStarted = true;
    analytics.beginRun(this.runNumberInSession);
    this.sessionStartedAt ||= Date.now();
    analytics.track("run_started", { gameVersion: "0.9.0-beta", platform, worldId: this.startingWorld, gameMode: this.run.rushMode ? "coin_rush" : "standard", difficulty: this.gameDifficulty, orientation: this.scale.width > this.scale.height ? "landscape" : "portrait", controlMode: save.profile.settings.leftHanded ? "touch_left_handed" : "touch_right_handed", selectedSkin: save.profile.selectedSkin, selectedPet: save.profile.selectedPet, runNumberInSession: this.runNumberInSession });
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
      if (this.currentWorld === "spider-lair") {
        const a = B.arena;
        const cavePoints = [
          ...this.worldPassages.map(({ x, y }) => ({ x, y })),
          { x: a.left + 90, y: a.top + (a.bottom - a.top) * 0.5 },
        ];
        const center = { x: (a.left + a.right) / 2, y: (a.top + a.bottom) / 2 };
        const spiderArenaRadius = Math.min(a.right - a.left, a.bottom - a.top) * 0.2;
        if (cavePoints.some((point) => distance(p, point) < 150)
          || distance(p, center) < spiderArenaRadius + 135) continue;
      }
      if (this.currentWorld === "green-valley" && this.secretSpiderPassage?.active
        && distance(p, this.secretSpiderPassage) < 150) continue;
      let valid = true;
      for (let i = 0; i < this.snake.length; i++)
        if (distance(p, this.snake.body[i]) < clearance) {
          valid = false;
          break;
        }
      if (
        !valid ||
        this.obstacles.some((o) => distance(p, o) < (this.currentWorld === "desert" ? o.radius + 24 : 95)) ||
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
    if (this.currentWorld === "spider-lair") {
      this.fillSpiderLairCoins(count);
      return;
    }
    let active = this.coins.filter((c) => c.active).length;
    for (const coin of this.coins) {
      if (active >= count) break;
      if (coin.active) continue;
      let p = this.validPoint(B.spawn.bodyClearance, 65);
      if (!p) break;
      if (this.currentWorld === "desert") {
        const regions = desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom);
        for (let attempt = 0; attempt < 12; attempt++) {
          const route = desertRouteAt(p, regions);
          if (route !== "oasis" && (route !== "ruins" || Math.random() < 0.58)) break;
          p = this.validPoint(B.spawn.bodyClearance, 65);
          if (!p) break;
        }
        if (!p || desertRouteAt(p, regions) === "oasis") continue;
      }
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
  private fillSpiderLairCoins(count: number) {
    const arena = B.arena;
    const width = arena.right - arena.left;
    const height = arena.bottom - arena.top;
    const center = { x: (arena.left + arena.right) / 2, y: (arena.top + arena.bottom) / 2 };
    const safeRadius = Math.min(width, height) * 0.2 + 150;
    const cavePoints = [
      ...this.worldPassages.map(({ x, y }) => ({ x, y })),
      { x: arena.left + 90, y: arena.top + height * 0.5 },
    ];
    const candidates = [
      { x: arena.left + width * 0.12, y: arena.top + height * 0.22 },
      { x: arena.left + width * 0.5, y: arena.top + height * 0.2 },
      { x: arena.left + width * 0.88, y: arena.top + height * 0.22 },
      { x: arena.left + width * 0.12, y: arena.top + height * 0.78 },
      { x: arena.left + width * 0.5, y: arena.top + height * 0.8 },
      { x: arena.left + width * 0.88, y: arena.top + height * 0.78 },
      { x: arena.left + width * 0.2, y: arena.top + height * 0.5 },
      { x: arena.left + width * 0.8, y: arena.top + height * 0.5 },
      { x: arena.left + width * 0.35, y: arena.top + height * 0.12 },
      { x: arena.left + width * 0.65, y: arena.top + height * 0.88 },
    ];
    const canUse = (point: Point) =>
      Math.hypot(point.x - center.x, point.y - center.y) >= safeRadius
      && cavePoints.every((cave) => Math.hypot(point.x - cave.x, point.y - cave.y) >= 150)
      && Math.hypot(point.x - this.snake.x, point.y - this.snake.y) >= 100
      && !this.snake.body.some((segment) => Math.hypot(point.x - segment.x, point.y - segment.y) < B.spawn.bodyClearance)
      && !this.obstacles.some((obstacle) => Math.hypot(point.x - obstacle.x, point.y - obstacle.y) < obstacle.radius + 55)
      && !this.coins.some((coin) => coin.active && Math.hypot(point.x - coin.x, point.y - coin.y) < 65)
      && (!this.boss || Math.hypot(point.x - this.boss.image.x, point.y - this.boss.image.y) >= 120);

    let active = this.coins.filter((coin) => coin.active).length;
    for (const coin of this.coins) {
      if (active >= count) break;
      if (coin.active) continue;
      let point: Point | null = candidates.find(canUse) ?? null;
      if (!point) point = this.validPoint(B.spawn.bodyClearance, 100);
      if (!point) break;
      coin.spawn(point.x, point.y, ["firefly", "bee"].includes(save.profile.selectedPet ?? "") ? "firefly" : false, this.powers.luckyStar > 0);
      active++;
    }
  }
  private spawnObstacle(initial = false) {
    let p = this.validPoint(85, B.spawn.headClearance);
    if (this.currentWorld === "ocean" || this.currentWorld === "silent-abyss") return;
    if (this.currentWorld === "desert") {
      if (!p) return;
      const regions = desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom);
      if (desertRouteAt(p, regions) !== "ruins" || Math.random() > DW.routes.ruinsObstacleChance) return;
      const graphics = this.add.graphics().setPosition(p.x, p.y).setDepth(5);
      const radius = Phaser.Math.Between(20, 31);
      graphics.fillStyle(0x775238, 0.3).fillEllipse(0, radius * 0.65, radius * 2.4, radius)
        .fillStyle(Phaser.Utils.Array.GetRandom([0x9d7045, 0xb3814c, 0x87613f]), 1)
        .fillPoints([
          new Phaser.Geom.Point(-radius, radius * 0.25), new Phaser.Geom.Point(-radius * 0.7, -radius * 0.65),
          new Phaser.Geom.Point(0, -radius), new Phaser.Geom.Point(radius * 0.78, -radius * 0.55),
          new Phaser.Geom.Point(radius, radius * 0.28), new Phaser.Geom.Point(radius * 0.42, radius * 0.8),
          new Phaser.Geom.Point(-radius * 0.6, radius * 0.72),
        ], true).lineStyle(3, 0xe2b46d, 0.5).strokeCircle(-radius * 0.18, -radius * 0.15, radius * 0.4);
      this.desertObjects.push(graphics);
      this.obstacles.push(new Obstacle(p.x, p.y, graphics as unknown as Phaser.GameObjects.Image, initial, radius));
      return;
    }
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
  private spawnAbyssObstacles(count: number) {
    const colors = [0x172633, 0x1b2d3a, 0x202f3b];
    for (let index = 0; index < count; index++) {
      const point = this.validPoint(100, B.spawn.headClearance);
      if (!point) break;
      const radius = Phaser.Math.Between(25, 38);
      const graphics = this.add.graphics().setPosition(point.x, point.y).setDepth(5);
      const color = colors[index % colors.length]!;
      graphics.fillStyle(0x01070d, 0.4).fillEllipse(0, radius * 0.65, radius * 2.35, radius * 0.9)
        .fillStyle(color, 1).fillPoints([
          new Phaser.Geom.Point(-radius, radius * 0.22), new Phaser.Geom.Point(-radius * 0.72, -radius * 0.58),
          new Phaser.Geom.Point(-radius * 0.12, -radius), new Phaser.Geom.Point(radius * 0.62, -radius * 0.76),
          new Phaser.Geom.Point(radius, radius * 0.18), new Phaser.Geom.Point(radius * 0.48, radius * 0.78),
          new Phaser.Geom.Point(-radius * 0.5, radius * 0.72),
        ], true).lineStyle(3, 0x37616a, 0.56).strokeCircle(-radius * 0.18, -radius * 0.16, radius * 0.38);
      const obstacle = new Obstacle(point.x, point.y, graphics as unknown as Phaser.GameObjects.Image, true, radius);
      this.obstacles.push(obstacle);
      this.abyssMovingObstacles.push({ obstacle, graphics, moveIn: 2 + Math.random() * 5, moveDuration: 0, moveElapsed: 0 });
    }
    if (this.abyssMovingObstacles.length > 0) this.abyssObstacleTimer = 5 + Math.random() * 4;
  }
  private updateAbyssObstacles(dt: number) {
    if (this.currentWorld !== "silent-abyss" || save.profile.abyssChallengeCompleted) return;
    this.abyssObstacleTimer -= dt;
    if (this.abyssObstacleTimer <= 0 && this.abyssMovingObstacles.length < 24) {
      this.abyssObstacleTimer = 5 + Math.random() * 4;
      this.spawnAbyssObstacles(1);
    }
    for (const moving of this.abyssMovingObstacles) {
      if (!moving.target) {
        moving.moveIn -= dt;
        if (moving.moveIn > 0) continue;
        const point = this.validPoint(115, 170);
        if (!point || distance(point, moving.obstacle) < 260) {
          moving.moveIn = 1 + Math.random() * 2;
          continue;
        }
        moving.target = point;
        moving.start = { x: moving.graphics.x, y: moving.graphics.y };
        moving.moveDuration = 0.85;
        moving.moveElapsed = 0;
        moving.obstacle.warning = moving.moveDuration;
        continue;
      }
      moving.moveElapsed = Math.min(moving.moveDuration, moving.moveElapsed + dt);
      const progress = moving.moveElapsed / moving.moveDuration;
      const eased = progress * progress * (3 - 2 * progress);
      moving.graphics.setPosition(Phaser.Math.Linear(moving.start!.x, moving.target.x, eased), Phaser.Math.Linear(moving.start!.y, moving.target.y, eased));
      moving.obstacle.x = moving.graphics.x;
      moving.obstacle.y = moving.graphics.y;
      if (progress >= 1) {
        moving.start = undefined;
        moving.target = undefined;
        moving.moveIn = 2 + Math.random() * 5;
      }
    }
  }
  private updateCelestialSanctuaries() {
    const progress = save.profile.abyssSanctuaryProgress;
    if (progress >= 3) return;
    const arena = B.arena;
    const spots = [
      { x: arena.left + 150, y: arena.top + 155 },
      { x: arena.right - 150, y: arena.top + 155 },
      { x: (arena.left + arena.right) / 2, y: arena.bottom - 155 },
    ];
    while (this.sanctuaryObjects.length < 3) {
      const index = this.sanctuaryObjects.length, spot = spots[index]!;
      const art = this.add.graphics().fillStyle(0x5bd5df, 0.18).fillCircle(0, 0, 34)
        .lineStyle(4, 0x9cf7ff, 0.9).strokeCircle(0, 0, 26)
        .lineStyle(3, 0xffffff, 0.85).beginPath().moveTo(0, -18).lineTo(13, 10).lineTo(-13, 10).closePath().strokePath();
      const shrine = this.add.container(spot.x, spot.y, [art]).setDepth(8).setVisible(index >= progress);
      shrine.setData("sanctuaryIndex", index); this.sanctuaryObjects.push(shrine);
    }
    for (const shrine of this.sanctuaryObjects) {
      const index = shrine.getData("sanctuaryIndex") as number;
      shrine.setVisible(index === save.profile.abyssSanctuaryProgress);
      if (index !== save.profile.abyssSanctuaryProgress || distance(this.snake, shrine) >= 48) continue;
      save.profile.abyssSanctuaryProgress++;
      shrine.setVisible(false); void save.save(); audio.play("power"); haptic("power");
      if (save.profile.abyssSanctuaryProgress >= 3) {
        if (!save.profile.unlockedPets.includes("celestial-serpent")) save.profile.unlockedPets.push("celestial-serpent");
        this.feedback(shrine.x, shrine.y, "SERPENTE CELESTIAL DESBLOQUEADA!", 0x81efff, true);
        this.halted = true;
        this.overlay = this.ui.modal(
          t("sanctuaryTitle"),
          t("sanctuaryBody"),
          [{ label: t("continue"), run: () => this.continue() }],
        );
      } else this.feedback(shrine.x, shrine.y, `SANTUÁRIO ${save.profile.abyssSanctuaryProgress}/3`, 0x81efff, true);
      void save.save();
      break;
    }
  }
  private clearAbyssObstacles() {
    for (const moving of this.abyssMovingObstacles) {
      moving.obstacle.destroy();
      const index = this.obstacles.indexOf(moving.obstacle);
      if (index >= 0) this.obstacles.splice(index, 1);
    }
    this.abyssMovingObstacles = [];
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
  }
  private buildSilentAbyss(g: Phaser.GameObjects.Graphics) {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    g.fillStyle(0x020913, 0.96).fillRoundedRect(a.left, a.top, w, h, 24);
    g.fillStyle(0x142b3b, 0.72).fillEllipse(a.left + w * 0.5, a.top + h * 0.51, w * 0.7, h * 0.68);
    g.lineStyle(5, 0x254c59, 0.72).strokeEllipse(a.left + w * 0.5, a.top + h * 0.51, w * 0.7, h * 0.68);
    for (let i = 0; i < 14; i++) {
      const x = a.left + w * (0.08 + ((i * 37) % 84) / 100), y = a.top + h * (0.08 + ((i * 53) % 82) / 100);
      const glow = this.add.circle(x, y, 4 + i % 4, i % 3 === 0 ? 0x58c7b8 : 0x477c9b, 0.38).setDepth(2);
      this.oceanDecorations.push(glow);
      this.tweens.add({ targets: glow, alpha: 0.12, duration: 1700 + i * 90, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    for (let i = 0; i < 6; i++) {
      const x = a.left + w * (0.12 + i * 0.15), y = a.top + h * (i % 2 ? 0.2 : 0.79);
      g.fillStyle(0x132c39, 0.95).fillRoundedRect(x - 15, y - 34, 30, 68, 8);
      g.lineStyle(2, 0x398d91, 0.4).strokeRoundedRect(x - 15, y - 34, 30, 68, 8);
    }
    const exit = this.add.graphics().fillStyle(0x193747, 0.38).fillEllipse(0, 0, 80, 80).lineStyle(4, 0x398d91, 0.65).strokeEllipse(0, 0, 62, 62);
    const portalLabel = this.add.text(0, 57, "RETORNO", { fontSize: "12px", color: "#a1ddd2", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(a.left + 90, a.top + h * 0.5, [exit, portalLabel]).setDepth(9);
    this.worldPortal.setData("destination", "ocean");
    this.worldPortal.setData("side", "left");
    this.worldPassages = [this.worldPortal];
  }
  private buildDesertWorld(g: Phaser.GameObjects.Graphics) {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    const regions = desertRegions(a.left, a.top, a.right, a.bottom);
    this.desertObjects.push(g);
    // Keep the oasis visibly calm and leave its route open; ruins are riskier.
    const oasisPath = this.add.graphics().lineStyle(7, 0xf0d28d, 0.34).beginPath()
      .moveTo(a.left + w * 0.08, a.top + h * 0.72).lineTo(a.left + w * 0.15, a.top + h * 0.61)
      .lineTo(a.left + w * 0.24, a.top + h * 0.72).lineTo(a.left + w * 0.4, a.top + h * 0.72).strokePath().setDepth(2);
    this.desertObjects.push(oasisPath);
    const ruinsPath = this.add.graphics().lineStyle(7, 0xb97b45, 0.42).beginPath()
      .moveTo(a.left + w * 0.08, a.top + h * 0.28).lineTo(a.left + w * 0.17, a.top + h * 0.36)
      .lineTo(a.left + w * 0.26, a.top + h * 0.25).lineTo(a.left + w * 0.4, a.top + h * 0.28).strokePath().setDepth(2);
    this.desertObjects.push(ruinsPath);
    for (let index = 0; index < 11; index++) {
      const y = a.top + h * (0.08 + index * 0.085);
      g.lineStyle(index % 2 ? 12 : 7, index % 2 ? 0xd29a50 : 0xf5d58c, 0.22)
        .beginPath().moveTo(a.left + 20, y + Math.sin(index * 1.7) * 30)
        .lineTo(a.left + w * 0.34, y - 25)
        .lineTo(a.left + w * 0.68, y + 22)
        .lineTo(a.right - 20, y - Math.sin(index * 1.3) * 34).strokePath();
    }
    const oasis = regions.find((region) => region.id === "oasis")!;
    const water = this.add.graphics().fillStyle(0x41b9b0, 0.28).fillEllipse(0, 0, oasis.width * 0.9, oasis.height * 0.72)
      .lineStyle(6, 0x58bca3, 0.78).strokeEllipse(0, 0, oasis.width * 0.9, oasis.height * 0.72)
      .fillStyle(0x9fc85d, 0.88).fillEllipse(-oasis.width * 0.31, -oasis.height * 0.15, 34, 62)
      .fillEllipse(oasis.width * 0.32, oasis.height * 0.18, 30, 55);
    const oasisLabel = this.add.text(0, oasis.height * 0.55, "OÁSIS", { fontSize: "17px", color: "#fff4c8", fontStyle: "bold", stroke: "#65452b", strokeThickness: 4 }).setOrigin(0.5);
    this.desertObjects.push(this.add.container(oasis.x, oasis.y, [water, oasisLabel]).setDepth(3));
    const calmMarker = this.add.graphics().lineStyle(3, 0x7fe0bd, 0.42).strokeEllipse(oasis.x, oasis.y, oasis.width * 1.16, oasis.height * 1.16).setDepth(2);
    this.desertObjects.push(calmMarker);

    const ruins = regions.find((region) => region.id === "ruins")!;
    g.fillStyle(0x875c3d, 0.3).fillEllipse(ruins.x, ruins.y, ruins.width * 1.35, ruins.height * 1.12);
    g.lineStyle(3, 0xd39a55, 0.45).strokeEllipse(ruins.x, ruins.y, ruins.width * 1.28, ruins.height * 1.08);
    for (let index = 0; index < 7; index++) {
      const x = ruins.x - ruins.width * 0.38 + (index % 4) * ruins.width * 0.23;
      const y = ruins.y - ruins.height * 0.22 + Math.floor(index / 4) * ruins.height * 0.48;
      const height = 54 + (index * 29) % 48;
      g.fillStyle(0x815637, 0.95).fillRoundedRect(x - 16, y - height / 2, 32, height, 5)
        .fillStyle(0xc18a4f, 0.95).fillRoundedRect(x - 12, y - height / 2 + 4, 24, height - 8, 4)
        .lineStyle(2, 0xf0c77b, 0.45).lineBetween(x - 9, y - height / 2 + 14, x - 9, y + height / 2 - 12);
    }

    this.desertGustZones = desertGusts(a.left, a.top, a.right, a.bottom);
    this.desertGustGraphics = this.add.graphics().setDepth(4);
    this.desertObjects.push(this.desertGustGraphics);
    for (const gust of this.desertGustZones) {
      const marker = this.add.graphics().fillStyle(0xffd47a, 0.2).fillRoundedRect(-gust.width / 2, -gust.height / 2, gust.width, gust.height, 30)
        .lineStyle(3, 0xe8a84c, 0.3).strokeRoundedRect(-gust.width / 2, -gust.height / 2, gust.width, gust.height, 30);
      const arrows = this.add.text(0, 0, gust.direction.x ? "↔   ↔   ↔   ↔   ↔" : "↑\n↑\n↑\n↑", { fontSize: "25px", color: "#ffe5a5", fontStyle: "bold", align: "center" }).setOrigin(0.5).setAlpha(0.45);
      const zone = this.add.container(gust.x, gust.y, [marker, arrows]).setDepth(4);
      this.desertObjects.push(zone);
    }
    const arena = regions.find((region) => region.id === "scorpion_arena")!;
    g.lineStyle(7, 0xaa7039, 0.24).strokeEllipse(arena.x, arena.y, arena.width, arena.height);
    g.lineStyle(3, 0xffd47a, 0.28).strokeEllipse(arena.x, arena.y, arena.width * 0.9, arena.height * 0.9);
  }
  private desertLabyrinthSectors() {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    const checkpoint = save.profile.desertExpeditionCheckpoint;
    const left = a.left + 90, right = a.right - 90, top = a.top + 100, bottom = a.bottom - 100;
    const wall = (x: number, y: number, width: number, height: number) => {
      const graphic = this.add.graphics().fillStyle(0x5d4634, 1).fillRoundedRect(x, y, width, height, 8).lineStyle(3, 0xb89460, 0.85).strokeRoundedRect(x, y, width, height, 8).setDepth(5);
      graphic.setData("desertWallBounds", { left: x, right: x + width, top: y, bottom: y + height });
      this.desertObjects.push(graphic);
      this.obstacles.push(new Obstacle(x + width / 2, y + height / 2, graphic as unknown as Phaser.GameObjects.Image, true, Math.max(width, height) / 2));
    };
    const sectors = [
      { x: left + w * 0.25, y: top + h * 0.25 },
      { x: left + w * 0.75, y: top + h * 0.75 },
      { x: (left + right) / 2, y: (top + bottom) / 2 },
    ];
    const centerY = top + h / 2;
    const gates = [
      { x: (left + right) / 2, y: centerY, vertical: false },
      { x: right - w * 0.23, y: centerY, vertical: true },
    ];
    gates.forEach((gate, index) => {
      const open = checkpoint > index;
      if (gate.vertical) {
        wall(gate.x - 15, top, 30, (gate.y - 75) - top);
        wall(gate.x - 15, gate.y + 75, 30, bottom - gate.y - 75);
        if (!open) wall(gate.x - 18, gate.y - 75, 36, 150);
      } else {
        wall(left, gate.y - 15, (gate.x - 75) - left, 30);
        wall(gate.x + 75, gate.y - 15, right - gate.x - 75, 30);
        if (!open) wall(gate.x - 75, gate.y - 18, 150, 36);
      }
      const mark = this.add.text(gate.x, gate.y, open ? "✦" : "⛧", { fontSize: "30px", color: open ? "#91e2b5" : "#ef8f67" }).setOrigin(0.5).setDepth(7);
      this.desertObjects.push(mark);
    });
    const portal = this.add.graphics().fillStyle(0x683a8f, 0.6).fillEllipse(0, 0, 88, 104).lineStyle(5, 0xc493ef, 0.9).strokeEllipse(0, 0, 66, 82);
    const portalLabel = this.add.text(0, 57, save.profile.desertRelicFound ? "SAIR · DESERTO" : "RETORNO", { fontSize: "12px", color: "#f0ddff", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(save.profile.desertRelicFound ? left + 130 : left + 50, top + h * 0.12, [portal, portalLabel]).setDepth(9);
    this.desertObjects.push(this.worldPortal);
    sectors.slice(0, checkpoint).forEach((point) => {
      const glow = this.add.graphics().fillStyle(0x68dcb1, 0.25).fillCircle(point.x, point.y, 64).lineStyle(4, 0x8fffd1, 0.85).strokeCircle(point.x, point.y, 46).setDepth(7);
      this.desertObjects.push(glow);
    });
    if (checkpoint === 0) {
      const next = sectors[0]!;
      const checkpointItem = this.add.container(next.x, next.y, [this.add.graphics().fillStyle(0x7fe0bd, 0.35).fillCircle(0, 0, 48).lineStyle(4, 0xc2ffe7, 0.9).strokeCircle(0, 0, 34), this.add.text(0, -48, `CHECKPOINT ${checkpoint + 1}`, { fontSize: "15px", color: "#e1fff3", fontStyle: "bold" }).setOrigin(0.5)]).setDepth(8).setSize(80, 80);
      checkpointItem.setData("checkpoint", checkpoint + 1);
      this.desertObjects.push(checkpointItem);
    } else if (checkpoint === 1 && !save.profile.desertRelicFound) {
      const next = sectors[1]!;
      const checkpointItem = this.add.container(next.x, next.y, [this.add.graphics().fillStyle(0x7fe0bd, 0.35).fillCircle(0, 0, 48).lineStyle(4, 0xc2ffe7, 0.9).strokeCircle(0, 0, 34), this.add.text(0, -48, "CHECKPOINT 2", { fontSize: "15px", color: "#e1fff3", fontStyle: "bold" }).setOrigin(0.5)]).setDepth(8).setSize(80, 80);
      checkpointItem.setData("checkpoint", 2);
      this.desertObjects.push(checkpointItem);
    } else if (!save.profile.desertRelicFound) {
      const relic = this.add.container(sectors[2]!.x, sectors[2]!.y, [this.add.graphics().fillStyle(0xf6cb69, 0.35).fillCircle(0, 0, 55).lineStyle(4, 0xffe5a1, 1).strokeCircle(0, 0, 38).fillStyle(0xffd15c, 1).fillTriangle(0, -23, -19, 8, 19, 8), this.add.text(0, 64, "RELÍQUIA · ENCONTRAR", { fontSize: "15px", color: "#fff1ba", fontStyle: "bold" }).setOrigin(0.5)]).setDepth(8).setSize(100, 100);
      relic.setData("desertRelic", true);
      this.desertObjects.push(relic);
    }
  }
  private desertLabyrinthEntry(): Point {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top, checkpoint = save.profile.desertExpeditionCheckpoint;
    return checkpoint === 0 ? { x: a.left + 135, y: a.top + 150 }
      : checkpoint === 1 ? { x: a.left + w * 0.25, y: a.top + h * 0.25 }
        : { x: a.left + w * 0.75, y: a.top + h * 0.75 };
  }
  private buildDesertLabyrinth(arenaGraphics: Phaser.GameObjects.Graphics) {
    arenaGraphics.setDepth(1);
    this.currentWorld = "desert-labyrinth";
    this.worldPortal?.destroy(); this.worldPortal = undefined;
    this.worldPassages = [];
    for (const obstacle of [...this.obstacles]) { obstacle.destroy(); this.obstacles.splice(this.obstacles.indexOf(obstacle), 1); }
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    const cave = this.add.graphics().fillStyle(0x201a17, 0.99).fillRoundedRect(a.left, a.top, w, h, 22).fillStyle(0x49382a, 1).fillRoundedRect(a.left + 20, a.top + 20, w - 40, h - 40, 18).setDepth(-8);
    this.desertObjects.push(cave);
    const maze = this.add.graphics().lineStyle(13, 0x846746, 0.96);
    const left = a.left + 90, right = a.right - 90, top = a.top + 100, bottom = a.bottom - 100, cx = (left + right) / 2, cy = (top + bottom) / 2;
    maze.lineBetween(left, cy, cx - 75, cy).lineBetween(cx + 75, cy, right, cy)
      .lineBetween(cx, top, cx, cy - 75).lineBetween(cx, cy + 75, cx, bottom)
      .lineBetween(left, top + 100, cx - 80, top + 100).lineBetween(cx + 80, bottom - 100, right, bottom - 100);
    maze.lineStyle(3, 0xc69b61, 0.8).lineBetween(left, cy, cx - 75, cy).lineBetween(cx + 75, cy, right, cy).lineBetween(cx, top, cx, cy - 75).lineBetween(cx, cy + 75, cx, bottom);
    maze.setDepth(3); this.desertObjects.push(maze);
    const entranceGraphic = this.add.graphics().fillStyle(0x593514, 0.45).fillEllipse(0, 0, 108, 110).lineStyle(6, 0xffb44a, 0.95).strokeEllipse(0, 0, 82, 86);
    const entranceLabel = this.add.text(0, 60, "DESERTO", { fontSize: "13px", color: "#ffe1a1", fontStyle: "bold" }).setOrigin(0.5);
    const entranceX = left + 50;
    const returnGraphics = this.add.graphics().fillStyle(0x683a8f, 0.6).fillEllipse(0, 0, 88, 104).lineStyle(5, 0xc493ef, 0.9).strokeEllipse(0, 0, 66, 82);
    const returnLabel = this.add.text(0, 57, save.profile.desertRelicFound ? "SAIR · DESERTO" : "RETORNO", { fontSize: "12px", color: "#f0ddff", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(save.profile.desertRelicFound ? left + 130 : entranceX, top + h * 0.12, [returnGraphics, returnLabel]).setDepth(9);
    this.worldPortal.setData("expeditionExit", true);
    const entrance = this.add.container(entranceX, top + 55, [entranceGraphic, entranceLabel]).setDepth(9);
    entrance.setData("desertExpeditionEntry", true);
    entrance.setSize(100, 100);
    this.desertObjects.push(entrance);
    if (save.profile.desertRelicFound) {
      this.worldPortal.setData("relicExit", true);
      const rubble = this.add.graphics().fillStyle(0x503d30, 0.98).fillRoundedRect(-25, -12, 50, 24, 8).lineStyle(3, 0xc18a4f, 0.9).strokeRoundedRect(-25, -12, 50, 24, 8).setPosition(left + 270, top + 55).setDepth(5);
      this.desertObjects.push(rubble);
    }
    this.desertLabyrinthSectors();
    if (save.profile.desertRelicFound) this.worldPortal.setData("relicExit", true);
    this.obstacles = this.obstacles.filter((obstacle) => {
      if (this.desertObjects.some((object) => object === obstacle.image)) return true;
      obstacle.destroy();
      return false;
    });
    const checkpoint = save.profile.desertExpeditionCheckpoint, entry = this.desertLabyrinthEntry();
    this.snake.reset(entry.x, entry.y, 0); this.steering.reset(0); this.cameraX = entry.x; this.cameraY = entry.y;
    this.cameras.main.setBackgroundColor(0x241d18);
    this.ui?.root.querySelector<HTMLElement>("#world-tag")?.replaceChildren(document.createTextNode("LABIRINTO SOTERRADO"));
    this.ui?.root.querySelector<HTMLElement>("#world-tag")?.setAttribute("aria-label", `Labirinto soterrado, checkpoint ${checkpoint}/2`);
  }
  private showDesertExpeditionIntro() {
    const checkpoint = save.profile.desertExpeditionCheckpoint;
    const en = getLanguage() === "en";
    const steps = en ? ["Find the first stone marker to open the next area.", "Your checkpoint is saved. Cross the open passage and look for the second marker.", "A relic awaits in the final area. The return exit is always accessible."] : ["Encontre o primeiro marco de pedra para abrir o próximo setor.", "Seu progresso está salvo. Cruze a passagem aberta e procure o segundo marco.", "O último setor guarda uma relíquia. A saída de retorno está sempre acessível."];
    this.halted = true;
    this.overlay = this.ui.modal(en ? "Expedition · Desert Labyrinth" : "Expedição · Labirinto do Deserto", steps[Math.min(checkpoint, 2)]!, [{
      label: en ? "EXPLORE" : "EXPLORAR",
      run: () => {
        const overlay = this.overlay;
        this.overlay = undefined;
        overlay?.destroy();
        this.resetControls();
        this.accumulator = 0;
        this.halted = false;
      },
    }]);
  }
  private discoverDesertRelic() {
    if (save.profile.desertRelicFound) return;
    save.profile.desertRelicFound = true;
    save.profile.desertExpeditionCheckpoint = 3;
    save.profile.availablePets = [...new Set([...save.profile.availablePets, "tiny-dragon"])];
    for (const object of this.desertObjects) { this.tweens.killTweensOf(object); object.destroy(); }
    this.desertObjects = [];
    for (const obstacle of [...this.obstacles]) { obstacle.destroy(); this.obstacles.splice(this.obstacles.indexOf(obstacle), 1); }
    const a = B.arena, x = a.left + 130, y = (a.top + a.bottom) / 2;
    const rubble = this.add.graphics().fillStyle(0x503d30, 0.95).fillRoundedRect(-30, -10, 60, 20, 8).lineStyle(3, 0xc18a4f, 0.9).strokeRoundedRect(-30, -10, 60, 20, 8).setPosition(x + 150, y).setDepth(5);
    this.desertObjects.push(rubble);
    const exit = this.add.graphics().fillStyle(0x753c95, 0.45).fillEllipse(0, 0, 100, 110).lineStyle(5, 0xd19aff, 0.95).strokeEllipse(0, 0, 74, 88);
    const label = this.add.text(0, 61, "SAIR · DESERTO", { fontSize: "13px", color: "#f2e2ff", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(a.left + 130, (a.top + a.bottom) / 2, [exit, label]).setDepth(9);
    this.worldPortal.setData("expeditionExit", true);
    this.worldPortal.setData("relicExit", true);
    this.desertObjects.push(this.worldPortal);
    this.ui.toast("Relíquia encontrada! Uma nova oferta misteriosa apareceu na loja. O labirinto desabou — siga pelo portal de saída.");
    void save.save();
  }
  private updateDesertLabyrinth() {
    if (this.currentWorld !== "desert-labyrinth") return false;
    const checkpoint = save.profile.desertExpeditionCheckpoint;
    if (this.worldPortal && distance(this.snake, this.worldPortal) < 72 && this.passageCooldown <= 0) {
      save.profile.desertExpeditionActive = false;
      this.returnFromDesertExpedition();
      return true;
    }
    const target = this.desertObjects.find((object) => object instanceof Phaser.GameObjects.Container && object.getData("checkpoint") === checkpoint + 1) as Phaser.GameObjects.Container | undefined;
    if (target && distance(this.snake, target) < 70) {
      save.profile.desertExpeditionCheckpoint = checkpoint + 1;
      void save.save();
      this.ui.toast(`Checkpoint ${checkpoint + 1} salvo! A passagem para o próximo setor se abriu.`);
      for (const obstacle of [...this.obstacles]) { obstacle.destroy(); this.obstacles.splice(this.obstacles.indexOf(obstacle), 1); }
      for (const object of this.desertObjects) { this.tweens.killTweensOf(object); object.destroy(); }
      this.desertObjects = [];
      this.buildDesertLabyrinth(this.worldArenaGraphics!);
      this.passageCooldown = 1;
      this.desertCheckpointGrace = true;
      this.time.delayedCall(1800, () => { this.desertCheckpointGrace = false; });
      return false;
    }
    const relic = this.desertObjects.find((object) => object instanceof Phaser.GameObjects.Container && object.getData("desertRelic")) as Phaser.GameObjects.Container | undefined;
    if (relic && distance(this.snake, relic) < 78) this.discoverDesertRelic();
    return false;
  }
  private returnFromDesertExpedition() {
    this.worldTransitioning = true;
    const destination = "desert", a = B.arena, entryX = a.left + 130, entryY = a.top + 140;
    save.profile.desertExpeditionActive = false;
    this.snake.reset(entryX, entryY, 0); this.steering.reset(0); this.cameraX = entryX; this.cameraY = entryY;
    for (const obstacle of [...this.obstacles]) { obstacle.destroy(); this.obstacles.splice(this.obstacles.indexOf(obstacle), 1); }
    for (const object of this.desertObjects) { this.tweens.killTweensOf(object); object.destroy(); }
    this.desertObjects = []; this.worldPortal = undefined; this.worldPassages = [];
    this.currentWorld = destination; this.worldSpeedMultiplier = worldById(destination).speedMultiplier;
    this.worldPortal = undefined;
    this.bossPortal?.destroy(); this.bossPortal = undefined; this.bossDefinition = undefined;
    this.desertBarrierCooldown = 0;
    this.cameras.main.setBackgroundColor(worldById(destination).background);
    const arena = this.worldArenaGraphics = this.add.graphics().setDepth(-10);
    arena.fillStyle(0x996136).fillRoundedRect(a.left - 5, a.top - 5, a.right - a.left + 10, a.bottom - a.top + 10, 30)
      .fillStyle(worldById(destination).ground).fillRoundedRect(a.left, a.top, a.right - a.left, a.bottom - a.top, 24);
    this.desertRouteCoins = [];
    this.buildDesertWorld(arena);
    this.spawnDesertRuins();
    this.createDesertArenaBarrier();
    this.refreshDesertExpeditionEntrance();
    this.ui.get("#world-tag").textContent = worldById(destination).name.toUpperCase();
    this.refreshWorldPassages(); this.refreshSecretSpiderPassage();
    this.updateCamera(0, true); this.renderSnake();
    this.worldTransitioning = false; this.passageCooldown = 1;
    this.desertCheckpointGrace = false;
    if (!this.bossPortal && worldById(destination).bossId) this.spawnBossPortal(worldById(destination).bossId!);
    void save.save();
  }
  private spawnDesertRuins() {
    const a = B.arena, regions = desertRegions(a.left, a.top, a.right, a.bottom), ruins = regions.find((region) => region.id === "ruins")!;
    const rareCoins = desertRareCoinSpots(regions);
    for (let index = 0; index < 9; index++) {
      const x = ruins.x + ((index * 97) % (ruins.width * 0.66)) - ruins.width * 0.33;
      const y = ruins.y + ((index * 137) % (ruins.height * 0.66)) - ruins.height * 0.33;
      if (distance({ x, y }, this.snake) < B.spawn.headClearance || rareCoins.some((point) => distance(point, { x, y }) < DW.routes.rareCoinClearance) || this.obstacles.some((obstacle) => distance(obstacle, { x, y }) < 115)) continue;
      const radius = 20 + (index % 3) * 6, graphics = this.add.graphics().setPosition(x, y).setDepth(5);
      graphics.fillStyle(0x795339, 0.28).fillEllipse(0, radius * 0.65, radius * 2.5, radius)
        .fillStyle(index % 2 ? 0xb57a43 : 0x986641, 0.98).fillPoints([
          new Phaser.Geom.Point(-radius, radius * 0.25), new Phaser.Geom.Point(-radius * 0.72, -radius * 0.58),
          new Phaser.Geom.Point(-radius * 0.1, -radius), new Phaser.Geom.Point(radius * 0.72, -radius * 0.54),
          new Phaser.Geom.Point(radius, radius * 0.35), new Phaser.Geom.Point(radius * 0.4, radius * 0.78),
          new Phaser.Geom.Point(-radius * 0.56, radius * 0.75),
        ], true).lineStyle(3, 0xe2b46d, 0.48).strokeCircle(-radius * 0.2, -radius * 0.15, radius * 0.45);
      this.desertObjects.push(graphics);
      this.obstacles.push(new Obstacle(x, y, graphics as unknown as Phaser.GameObjects.Image, true, radius));
    }
    for (let index = 0; index < 6; index++) {
      const x = a.left + (a.right - a.left) * (0.12 + (index * 0.137) % 0.78);
      const y = a.top + (a.bottom - a.top) * (0.12 + (index * 0.191) % 0.76);
      const dunes = regions.find((region) => region.id === "dune_field")!;
      if (Math.abs(x - dunes.x) < dunes.width * 0.42 && Math.abs(y - dunes.y) < dunes.height * 0.42) continue;
      if (inDesertOasis({ x, y }, regions)) continue;
      if (distance({ x, y }, this.snake) < B.spawn.headClearance || this.obstacles.some((obstacle) => distance(obstacle, { x, y }) < 120)) continue;
      const cactus = this.add.graphics().setPosition(x, y).setDepth(5);
      cactus.fillStyle(0x567143, 0.25).fillEllipse(0, 25, 45, 14).fillStyle(0x67904c, 0.96).fillRoundedRect(-9, -28, 18, 57, 8).fillRoundedRect(-27, -11, 13, 33, 7).fillRoundedRect(14, -19, 13, 34, 7)
        .lineStyle(2, 0xd4df99, 0.7).lineBetween(-3, -20, -3, 18).lineBetween(23, -10, 23, 4).lineBetween(-22, -4, -22, 8);
      this.desertObjects.push(cactus);
      this.obstacles.push(new Obstacle(x, y, cactus as unknown as Phaser.GameObjects.Image, true, 20));
    }
    const rareKinds = [B.coins.find((kind) => kind.id === "blue")!, B.coins.find((kind) => kind.id === "diamond")!, B.coins.find((kind) => kind.id === "blue")!];
    for (let index = 0; index < rareCoins.length; index++) {
      const point = rareCoins[index]!;
      if (distance(point, this.snake) < B.spawn.headClearance || this.obstacles.some((obstacle) => distance(obstacle, point) < DW.routes.rareCoinClearance)) continue;
      const coin = this.coins.find((item) => !item.active && !this.desertRouteCoins.includes(item.image));
      if (!coin) break;
      coin.spawn(point.x, point.y);
      const kind = rareKinds[index]!;
      coin.kind = kind;
      coin.image.setTexture(`coin-${kind.id}`);
      coin.label.setText(kind.label);
      this.desertRouteCoins.push(coin.image);
    }
  }
  private updateDesertGusts() {
    const graphics = this.desertGustGraphics;
    if (!graphics) return;
    graphics.clear();
    for (const gust of this.desertGustZones) {
      const inside = this.snake.x >= gust.x - gust.width / 2 && this.snake.x <= gust.x + gust.width / 2 && this.snake.y >= gust.y - gust.height / 2 && this.snake.y <= gust.y + gust.height / 2;
      const pulse = 0.72 + (Math.sin(this.run.elapsed * 2.4 + gust.phase) + 1) * 0.14;
      graphics.lineStyle(inside ? 7 : 4, inside ? 0xffe39a : 0xe8a84c, inside ? 0.85 : 0.38).beginPath()
        .moveTo(gust.x - gust.direction.x * gust.width * 0.2, gust.y - gust.direction.y * gust.height * 0.2)
        .lineTo(gust.x + gust.direction.x * gust.width * 0.2, gust.y + gust.direction.y * gust.height * 0.2).strokePath();
      if (inside && !save.profile.hints.desertGust) {
        save.profile.hints.desertGust = true;
        void save.save();
        this.ui.toast("Rajada de areia! Correntes de vento desviam sua cobra — ajuste a direção para resistir.");
        haptic("coin");
      }
      if (inside) graphics.fillStyle(0xffe7ad, 0.75).fillCircle(gust.x + gust.direction.x * Math.sin(this.run.elapsed * 3 + gust.phase) * gust.width * 0.12, gust.y + gust.direction.y * Math.sin(this.run.elapsed * 3 + gust.phase) * gust.height * 0.12, 4 + pulse * 3);
    }
  }
  private revealAbyssPortal() {
    if (this.currentWorld !== "ocean" || !save.profile.bossesDefeated.includes("kraken") || this.abyssPortal?.active) return;
    const regions = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom);
    const trench = regions.find((region) => region.id === "deep_trench")!;
    const x = trench.x, y = trench.y;
    const g = this.add.graphics().fillStyle(0x123a4a, 0.36).fillEllipse(0, 0, 102, 102).lineStyle(5, 0x53c8bd, 0.76).strokeEllipse(0, 0, 78, 78).lineStyle(2, 0x9affed, 0.54).strokeEllipse(0, 0, 55, 55);
    const label = this.add.text(0, 57, "FENDA", { fontSize: "14px", color: "#9affed", fontStyle: "bold" }).setOrigin(0.5);
    this.abyssPortal = this.add.container(x, y, [g, label]).setDepth(9).setAlpha(0.82);
    this.tweens.add({ targets: this.abyssPortal, alpha: 0.48, duration: 1300, yoyo: true, repeat: -1 });
  }
  private drawOceanCurrents() {
    if (!this.currentGraphics) return;
    const g = this.currentGraphics;
    g.clear();
    for (const zone of this.oceanCurrents) {
      const color = zone.type === "RAPID" ? 0x71d5ee : 0x8fd9e6;
      const alpha = zone.visualIntensity;
      const halfWidth = zone.width / 2;
      const halfHeight = zone.height / 2;
      const directionLength = Math.hypot(zone.direction.x, zone.direction.y) || 1;
      const directionX = zone.direction.x / directionLength;
      const directionY = zone.direction.y / directionLength;
      const arrowLength = Math.min(38, Math.max(24, Math.min(zone.width, zone.height) * 0.24));
      const headLength = 9;
      const headWidth = 6;
      const acrossX = -directionY;
      const acrossY = directionX;

      g.fillStyle(color, 0.1 + alpha * 0.18).fillRoundedRect(zone.x - halfWidth, zone.y - halfHeight, zone.width, zone.height, 30);
      g.lineStyle(2, color, 0.45 + alpha * 0.45);
      const arrowCount = Math.max(3, Math.min(7, Math.floor(zone.width / 100)));
      const spacing = zone.width / (arrowCount + 1);
      for (let i = 1; i <= arrowCount; i++) {
        const centerX = zone.x - halfWidth + spacing * i;
        const centerY = zone.y;
        const startX = centerX - directionX * arrowLength / 2;
        const startY = centerY - directionY * arrowLength / 2;
        const tipX = centerX + directionX * arrowLength / 2;
        const tipY = centerY + directionY * arrowLength / 2;
        const baseX = tipX - directionX * headLength;
        const baseY = tipY - directionY * headLength;

        g.lineBetween(startX, startY, tipX, tipY);
        g.lineBetween(tipX, tipY, baseX + acrossX * headWidth, baseY + acrossY * headWidth);
        g.lineBetween(tipX, tipY, baseX - acrossX * headWidth, baseY - acrossY * headWidth);
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
  private updateOcean(dt: number) {
    if (this.currentWorld !== "ocean") return;
    if (save.profile.bossesDefeated.includes("kraken") && !this.abyssPortal?.active) this.revealAbyssPortal();
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
  private renderStickyZones(){const g=this.stickyGraphics;if(!g)return;g.clear();for(const z of this.stickyZones){if(this.currentWorld==="spider-lair")continue;g.fillStyle(0xd77cbb,0.38).fillEllipse(z.x,z.y,z.radius*2,z.radius*1.25).lineStyle(4,0xa9468a,0.7).strokeEllipse(z.x,z.y,z.radius*2,z.radius*1.25);}}
  private updateSpiderWebs(dt: number) {
    const boss = this.boss;
    if (!boss) return;
    if (boss.health <= 5) {
      this.spiderWebTimer -= dt;
      if (this.spiderWebTimer <= 0) {
        const desperatePhase = boss.health <= 2;
        this.spiderWebTimer = desperatePhase ? 4.5 : 6;
        const arena = B.arena;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.min(arena.right - arena.left, arena.bottom - arena.top) * 0.17;
        const x = Phaser.Math.Clamp(this.spiderArena!.x + Math.cos(angle) * radius, arena.left + 105, arena.right - 105);
        const y = Phaser.Math.Clamp(this.spiderArena!.y + Math.sin(angle) * radius, arena.top + 105, arena.bottom - 105);
        this.spawnSpiderWeb(x, y, desperatePhase ? 118 : 104);
      }
    }
    const inside = this.stickyZones.some((zone) => Math.hypot(this.snake.x - zone.x, this.snake.y - zone.y) < zone.radius);
    const wasSticky = this.stickySpeed < 0.99;
    this.stickySpeed = stickySpeedMultiplier(this.stickySpeed, inside, dt);
    if (inside && !wasSticky && this.run.elapsed >= this.stickyFeedbackAt) {
      this.stickyFeedbackAt = this.run.elapsed + CW.sticky.feedbackCooldown;
      this.feedback(this.snake.x, this.snake.y, "TEIA! VELOCIDADE REDUZIDA", 0xdca9f2);
    }
  }
  private spawnSpiderWeb(x: number, y: number, webRadius: number) {
    const marker = this.add.graphics().setPosition(x, y).setDepth(8)
      .fillStyle(0xdca9f2, 0.12).fillCircle(0, 0, webRadius)
      .lineStyle(4, 0xe7c3ff, 0.85).strokeCircle(0, 0, webRadius * 0.82);
    this.tweens.add({ targets: marker, alpha: 0.22, scale: 1.08, duration: 380, yoyo: true,
      onComplete: () => {
        if (!marker.active) return;
        marker.destroy();
        if (!this.boss || this.boss.definition.id !== "spider-queen") return;
        const web = this.add.graphics().setPosition(x, y).setDepth(7).lineStyle(3, 0xf0c8ff, 0.85);
        for (let ring = 1; ring <= 5; ring++) web.strokeCircle(0, 0, webRadius * ring / 5);
        for (let spoke = 0; spoke < 12; spoke++) {
          const angle = spoke * Math.PI / 6;
          web.lineBetween(0, 0, Math.cos(angle) * webRadius, Math.sin(angle) * webRadius);
        }
        const zone: StickyZone = { x, y, radius: webRadius };
        const maxWebs = this.boss.health <= 4 ? 7 : 4;
        while (this.spiderWebZones.length >= maxWebs) {
          const oldest = this.spiderWebZones.shift()!;
          oldest.graphic.destroy();
          const index = this.stickyZones.indexOf(oldest.zone);
          if (index >= 0) this.stickyZones.splice(index, 1);
        }
        this.spiderWebZones.push({ zone, graphic: web, expiresAt: this.time.now + 15000 });
        this.stickyZones.push(zone);
        this.tweens.add({ targets: web, alpha: 0.62, duration: 900, yoyo: true, repeat: -1 });
        this.renderStickyZones();
      },
    });
  }
  private updateSpiderlings(dt: number) {
    if (this.currentWorld !== "spider-lair" || this.boss?.definition.id !== "spider-queen") {
      for (const spiderling of this.spiderlings) this.tweens.killTweensOf(spiderling.image);
      for (const spiderling of this.spiderlings) spiderling.image.destroy();
      this.spiderlings = [];
      this.scorpionlingAttack = undefined;
      return;
    }
    const attack = this.scorpionlingAttack;
    if (attack && this.petSprite) {
      attack.elapsed += dt;
      if (attack.phase === "outbound") {
        const progress = Math.min(1, attack.elapsed / 0.32);
        this.petSprite.setPosition(
          Phaser.Math.Linear(attack.startX, attack.target.x, progress),
          Phaser.Math.Linear(attack.startY, attack.target.y, progress),
        );
        if (progress >= 1) {
          if (this.spiderlings.some((spiderling) => spiderling.image === attack.target)) {
            attack.target.destroy();
            this.spiderlings = this.spiderlings.filter((spiderling) => spiderling.image !== attack.target);
            this.feedback(attack.target.x, attack.target.y, "ESCORPIÃOZINHO ATACA!", 0xffc35e, true);
            audio.play("shield_break"); haptic("power");
          }
          attack.phase = "returning";
          attack.elapsed = 0;
        }
      } else {
        const tail = this.snake.body[Math.min(this.snake.length - 1, 5)];
        const phase = this.run.elapsed * 3;
        const returnX = tail.x + Math.cos(phase) * 13;
        const returnY = tail.y + 26 + Math.sin(phase) * 5;
        const progress = Math.min(1, attack.elapsed / 0.38);
        this.petSprite.setPosition(
          Phaser.Math.Linear(attack.startX, returnX, progress),
          Phaser.Math.Linear(attack.startY, returnY, progress),
        );
        if (progress >= 1) this.scorpionlingAttack = undefined;
      }
    }
    if (!this.scorpionlingAttack && save.profile.selectedPet === "scorpionling" && this.scorpionlingCooldown <= 0 && this.spiderlings.length > 0 && this.petSprite) {
      const target = [...this.spiderlings]
        .sort((a, b) => distance(a, this.petSprite!) - distance(b, this.petSprite!))[0];
      this.scorpionlingAttack = {
        target: target.image,
        startX: this.petSprite.x,
        startY: this.petSprite.y,
        phase: "outbound",
        elapsed: 0,
      };
      this.scorpionlingCooldown = 4;
      return;
    }
    for (const spiderling of [...this.spiderlings]) {
      const dx = this.snake.x - spiderling.x, dy = this.snake.y - spiderling.y;
      const length = Math.hypot(dx, dy) || 1;
      spiderling.x += dx / length * spiderling.speed * dt;
      spiderling.y += dy / length * spiderling.speed * dt;
      spiderling.image.setPosition(spiderling.x, spiderling.y).setRotation(Math.atan2(dy, dx));
      if (length < B.snake.radius + 12) {
        if (this.powers.blocksAttack()) {
          this.feedback(this.snake.x, this.snake.y, this.powers.shield ? "ESCUDO!" : "PROTEGIDO!", 0x70cfff, true);
        } else if (this.snake.length <= B.snake.initial) {
          if (!this.loseLife()) { this.die(); return; }
          this.feedback(this.snake.x, this.snake.y, `FILHOTE! −1 VIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
        } else {
          this.snake.length = Math.max(B.snake.initial, this.snake.length - 5);
          this.feedback(this.snake.x, this.snake.y, "FILHOTE! −5 SEGMENTOS", 0xdca9f2, true);
        }
        spiderling.image.destroy();
        this.spiderlings.splice(this.spiderlings.indexOf(spiderling), 1);
      }
    }
  }
  private updateFunctionalPets(dt: number) {
    if (!this.petSprite || !save.profile.selectedPet) return;
    this.petActionCooldown = Math.max(0, this.petActionCooldown - dt);
    const pet = save.profile.selectedPet;
    if (pet === "bee" && this.petRewardCount < 3 && this.petActionCooldown <= 0) {
      this.petActionCooldown = 18;
      this.petRewardCount++;
      addXP(save.profile, 8);
      void save.save();
      this.feedback(this.petSprite.x, this.petSprite.y, "+8 XP · PÓLEN!", 0xffd84d);
    }
    if (pet === "bee" && this.petRewardCount > 0 && this.petActionCooldown > 17.5 && this.run.elapsed % 0.18 < (this.game.loop.delta / 1000)) {
      const flower = this.add.circle(this.petSprite.x + Phaser.Math.Between(-18, 18), this.petSprite.y - 8, 3, 0xffe879).setDepth(26);
      this.tweens.add({ targets: flower, y: flower.y - 18, alpha: 0, duration: 500, onComplete: () => flower.destroy() });
    }
    if (pet === "firefly") {
      const blueCoin = this.coins.filter((coin) => coin.active && coin.kind.id === "blue")
        .sort((a, b) => distance(a, this.petSprite!) - distance(b, this.petSprite!))[0];
      if (blueCoin && distance(blueCoin, this.petSprite) < 210) {
        const dx = this.snake.x - blueCoin.x, dy = this.snake.y - blueCoin.y;
        const length = Math.hypot(dx, dy) || 1;
        const move = Math.min(length, 115 * dt);
        blueCoin.x += dx / length * move; blueCoin.y += dy / length * move; blueCoin.render();
      }
    }
    if (pet === "celestial-serpent" && this.currentWorld === "silent-abyss" && this.petActionCooldown <= 0 && this.petRewardCount < 3) {
      const fragment = this.add.circle(Phaser.Math.Between(B.arena.left + 60, B.arena.right - 60), Phaser.Math.Between(B.arena.top + 60, B.arena.bottom - 60), 9, 0xa7f7ff).setDepth(9);
      fragment.setStrokeStyle(3, 0xe5ffff, 0.9);
      this.petActionCooldown = 0.8;
      this.tweens.add({ targets: fragment, x: this.petSprite.x, y: this.petSprite.y, scale: 0.25, alpha: 0.3, duration: 650, onComplete: () => {
        fragment.destroy(); this.petRewardCount++; addXP(save.profile, 15); void save.save();
        this.feedback(this.petSprite?.x ?? this.snake.x, this.petSprite?.y ?? this.snake.y, "+15 XP · FRAGMENTO!", 0x81efff);
      } });
    }
    if (pet === "celestial-serpent" && this.currentWorld !== "silent-abyss") this.petActionCooldown = 3;
    if (pet !== "tiny-dragon") return;
    if (!this.boss && this.currentWorld === "spider-lair" && this.spiderlings.length > 0 && !this.dragonAttack && this.petActionCooldown <= 0) {
      const enemy = [...this.spiderlings].sort((a, b) => distance(a, this.petSprite!) - distance(b, this.petSprite!))[0]!;
      this.dragonAttack = { x: this.petSprite.x, y: this.petSprite.y, targetX: enemy.x, targetY: enemy.y, elapsed: 0, duration: 0.3, kind: "enemy" };
      this.dragonFlame ??= this.add.graphics().setDepth(26);
      this.petActionCooldown = dragonAttackCooldown;
    }
    if (this.dragonAttack) {
      const attack = this.dragonAttack;
      attack.elapsed += dt;
      const progress = Math.min(1, attack.elapsed / attack.duration);
      this.petSprite.setPosition(Phaser.Math.Linear(attack.x, attack.targetX, progress), Phaser.Math.Linear(attack.y, attack.targetY, progress));
      this.petSprite.setRotation(Math.atan2(attack.targetY - attack.y, attack.targetX - attack.x));
      this.dragonFlame?.clear().lineStyle(18, 0xff6b1a, 0.78).lineBetween(attack.x, attack.y, this.petSprite.x, this.petSprite.y)
        .lineStyle(8, 0xffd05a, 0.9).lineBetween(attack.x, attack.y, this.petSprite.x, this.petSprite.y);
      if (progress >= 1) {
        if (attack.kind === "enemy") {
          const target = this.spiderlings.find((enemy) => Math.hypot(enemy.x - attack.targetX, enemy.y - attack.targetY) < 40);
          if (target) { target.image.destroy(); this.spiderlings.splice(this.spiderlings.indexOf(target), 1); this.feedback(target.x, target.y, "SOPRO DE FOGO!", 0xff8a32); }
        } else if (this.boss && this.boss.health > 1) {
          const vulnerable = dragonCanDamageBoss(this.boss.definition.id, this.boss.state);
          if (vulnerable && Math.hypot(this.boss.image.x - attack.targetX, this.boss.image.y - attack.targetY) < 90) {
            for (let hit = 0; hit < dragonBossDamage; hit++) this.damageBoss();
            if (this.boss) this.feedback(this.boss.image.x, this.boss.image.y, `DRAGÃOZINHO · −${dragonBossDamage}`, 0xff8a32, true);
          }
        }
        this.dragonAttack = undefined;
        this.dragonFlame?.clear();
      }
      return;
    }
    if (this.petActionCooldown > 0) return;
    if (this.boss) {
      const boss = this.boss;
      if (dragonCanDamageBoss(boss.definition.id, boss.state)) this.dragonAttack = { x: this.petSprite.x, y: this.petSprite.y, targetX: boss.image.x, targetY: boss.image.y, elapsed: 0, duration: dragonAttackDuration, kind: "boss" };
    }
    if (this.dragonAttack) {
      this.dragonFlame ??= this.add.graphics().setDepth(26);
      this.petActionCooldown = dragonAttackCooldown;
    }
  }
  private spawnSpiderling() {
    this.spiderlingTimer = 12;
    this.spiderlingWave++;
    const waveCount = this.spiderlingWave >= 3 ? 5 : 3;
    const speed = Math.min(110, 74 + (this.spiderlingWave - 1) * 6);
    const startAngle = Math.random() * Math.PI * 2;
    for (let index = 0; index < waveCount; index++) {
      const angle = startAngle + Math.PI * 2 * index / waveCount;
      const x = Phaser.Math.Clamp(this.snake.x + Math.cos(angle) * 420, B.arena.left + 55, B.arena.right - 55);
      const y = Phaser.Math.Clamp(this.snake.y + Math.sin(angle) * 420, B.arena.top + 55, B.arena.bottom - 55);
      const image = this.add.container(x, y).setDepth(19);
      const graphic = this.add.graphics().fillStyle(0x201526).fillCircle(0, 0, 13)
        .fillStyle(0xdfa6ef).fillCircle(-5, -4, 2).fillCircle(5, -4, 2)
        .lineStyle(3, 0x9c70b4).beginPath();
      for (const side of [-1, 1]) for (let leg = 0; leg < 3; leg++) {
        const yy = -4 + leg * 5;
        graphic.moveTo(side * 5, yy).lineTo(side * 13, yy - 5).lineTo(side * 17, yy + 1);
      }
      graphic.strokePath(); image.add(graphic);
      this.spiderlings.push({ image, x, y, speed });
    }
    this.feedback(this.snake.x, this.snake.y, `ONDA ${this.spiderlingWave} · ${waveCount} FILHOTES!`, 0xdca9f2, true);
  }
  private containSnakeInSpiderArena(previous: Point) {
    const boss = this.boss;
    if (this.spiderArenaOpen || !boss || boss.definition.id !== "spider-queen" || !this.spiderArena) return;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * 0.2;
    const dx = this.snake.x - this.spiderArena.x, dy = this.snake.y - this.spiderArena.y;
    const length = Math.hypot(dx, dy);
    if (length >= radius + B.snake.radius + 8) return;
    const angle = length > 0.001 ? Math.atan2(dy, dx) : Math.atan2(previous.y - this.spiderArena.y, previous.x - this.spiderArena.x);
    const safeRadius = radius + B.snake.radius + 9;
    this.snake.x = this.spiderArena.x + Math.cos(angle) * safeRadius;
    this.snake.y = this.spiderArena.y + Math.sin(angle) * safeRadius;
    this.snake.angle = angle;
    this.snake.body[0].x = this.snake.x; this.snake.body[0].y = this.snake.y;
    this.snake.moveVector(0, angle, 0, { x: 0, y: 0 });
    this.steering.reset(angle); this.aim = null;
    if (this.spiderArenaCooldown <= 0) {
      this.spiderArenaCooldown = 0.7;
      this.feedback(this.snake.x, this.snake.y, "ARENA DA ARANHA!", 0xdca9f2);
      audio.play("current_flow"); haptic("coin");
    }
  }
  update(_time: number, delta: number) {
    if (!this.halted && (
      this.keys &&
      (Phaser.Input.Keyboard.JustDown(this.keys.ESC) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE))
    )) {
      if (this.halted && this.pauseKind === "pause") this.continue();
      else this.requestPause();
    }
    if (this.freezeModalPending && this.powers.freezeRemaining > 0) {
      this.powers.update(Math.min(delta / 1000, 0.05));
      if (this.powers.freezeRemaining <= 0) {
        this.freezeModalPending = false;
        this.overlay?.destroy(); this.overlay = undefined;
        this.halted = false; this.accumulator = 0; this.resetControls();
      }
      return;
    }
    if (this.halted || this.dead) return;
    this.accumulator += Math.min(delta / 1000, 0.05);
    while (this.accumulator >= 1 / 120 && !this.dead && (!this.halted || this.freezeModalPending)) {
      this.step(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.renderSnake();
    this.hud.update(this.run, this.combo, this.powers, this.turbo, save.profile);
    this.updateAuraStatusHud();
    if ((this.boss?.definition.id === "spider-queen" || this.cloverGardenBoss) && this.bossEnergyHud)
      this.bossEnergyHud.hidden = true;
    if (this.bossEnergyHud && !this.boss && !this.cloverGardenBoss && !this.bossEnergyHud.hidden) this.bossEnergyHud.textContent = `BOSS ENERGY ${Math.floor(this.run.bossEnergy)}/${this.currentWorld === "clover-garden" ? "—" : this.bossEnergyRequirement()}`;
    this.updateCamera(Math.min(delta / 1000, 0.05));
    this.updateBossDirectionIndicator();
  }
  private updateBossDirectionIndicator() {
    const indicator = this.bossDirectionIndicator ??= this.add.graphics().setScrollFactor(0).setDepth(1000);
    const boss = this.boss?.image ?? this.cloverGardenBoss;
    const camera = this.cameras.main;
    indicator.clear();
    if (!boss || this.halted || this.dead) {
      indicator.setVisible(false);
      return;
    }

    const screenX = (boss.x - camera.scrollX) * camera.zoom;
    const screenY = (boss.y - camera.scrollY) * camera.zoom;
    const halfWidth = camera.width / 2;
    const halfHeight = camera.height / 2;
    const margin = 38;
    if (screenX >= margin && screenX <= camera.width - margin && screenY >= margin && screenY <= camera.height - margin) {
      indicator.setVisible(false);
      return;
    }

    const dx = screenX - halfWidth;
    const dy = screenY - halfHeight;
    const scale = Math.min(
      (halfWidth - margin) / Math.max(Math.abs(dx), 0.001),
      (halfHeight - margin) / Math.max(Math.abs(dy), 0.001),
    );
    const x = halfWidth + dx * scale;
    const y = halfHeight + dy * scale;
    const angle = Math.atan2(dy, dx);
    const length = 15;
    const wing = 8;
    const tipX = x + Math.cos(angle) * length;
    const tipY = y + Math.sin(angle) * length;
    const backX = x - Math.cos(angle) * length * 0.6;
    const backY = y - Math.sin(angle) * length * 0.6;
    indicator.fillStyle(0x10251d, 0.75).fillCircle(x, y, 14);
    indicator.fillStyle(0xffd166, 0.98)
      .fillTriangle(
        tipX, tipY,
        backX + Math.cos(angle + Math.PI / 2) * wing, backY + Math.sin(angle + Math.PI / 2) * wing,
        backX + Math.cos(angle - Math.PI / 2) * wing, backY + Math.sin(angle - Math.PI / 2) * wing,
      );
    indicator.setVisible(true);
  }
  private updateBossHealthHud(status = "") {
    const hud = this.bossHud;
    if (!hud) return;
    const regular = this.boss;
    const garden = !regular && this.cloverGardenBoss?.active ? this.cloverGardenBoss : undefined;
    if (!regular && !garden) {
      hud.hidden = true;
      return;
    }
    const name = regular?.definition.name ?? (this.cloverGardenBossId() === "candy-garden-guardian" ? "SAPO-REI DO TREVO" : this.cloverGardenBossId() === "ocean-garden-guardian" ? "GUARDIÃO ABISSAL" : "GUARDIÃO ESPINHO-DOCE");
    const health = regular?.health ?? (garden?.getData("health") as number | undefined) ?? 0;
    const maxHealth = regular?.definition.maxHealth ?? 4;
    const ratio = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    const state = ratio > 0.5 ? "healthy" : ratio > 0.25 ? "warning" : "critical";
    hud.hidden = false;
    hud.classList.remove("boss-health-hud--healthy", "boss-health-hud--warning", "boss-health-hud--critical");
    hud.classList.add(`boss-health-hud--${state}`);
    hud.querySelector<HTMLElement>("[data-boss-name]")!.textContent = name;
    hud.querySelector<HTMLElement>("[role=meter]")!.setAttribute("aria-label", `${name}: ${health} de ${maxHealth} HP`);
    hud.querySelector<HTMLElement>("[data-boss-hp]")!.textContent = `${health}/${maxHealth} HP`;
    hud.querySelector<HTMLElement>("[data-boss-health-bar]")!.style.width = `${ratio * 100}%`;
    const meter = hud.querySelector<HTMLElement>("[role=meter]")!;
    meter.setAttribute("aria-valuemax", String(maxHealth));
    meter.setAttribute("aria-valuenow", String(health));
    hud.querySelector<HTMLElement>("[data-boss-status]")!.textContent = status;
  }
  private updateAuraStatusHud(message?: string) {
    const hud = this.auraStatusHud;
    const boss = this.boss;
    if (!boss) {
      if (this.cloverGardenBoss?.active) {
        const combat = this.bossFight.combat;
        const gardenId = this.cloverGardenBossId();
        const active = combat.active && combat.bossId === gardenId && combat.remainingHits > 0;
        const charge = Math.floor(this.bossFight.combat.attackCharge);
        const ready = charge >= 100 && !active;
        const isFrogKing = gardenId === "candy-garden-guardian";
        if (hud) {
          hud.textContent = message ?? (active ? `AURA ATIVA${isFrogKing ? " · TOQUE NO SAPO-REI" : ""}` : ready ? "AURA PRONTA · PEGUE A ORBE" : `BOSS COINS · ${charge}/100`);
          hud.hidden = false;
          hud.classList.toggle("aura-status--ready", ready || active || Boolean(message?.includes("PRONTA")));
        }
      } else if (hud) hud.hidden = true;
      return;
    }
    if (!hud) return;
    const combat = this.bossFight.combat;
    const active = combat.active && combat.bossId === boss.definition.id;
    const charge = Math.floor(combat.attackCharge);
      const ready = charge >= 100 && !active;
    const label = message ?? (ready
      ? boss.definition.id === "spider-queen"
        ? "AURA PRONTA · ATINJA A ESTALACTITE"
        : boss.definition.id === "kraken"
          ? "AURA PRONTA · PEGUE A PÉROLA"
          : "AURA PRONTA"
      : active
        ? "AURA ATIVA"
        : `${boss.definition.id === "king-snake" ? "BOSS COIN" : "BOSS COINS"} · ${charge}/100`);
    hud.textContent = label;
    hud.hidden = false;
    hud.classList.toggle("aura-status--ready", ready || Boolean(message?.includes("PRONTA")));
  }
  private activateFreeze() {
    if (!save.profile.freezeUnlocked || !this.powers.activateFreeze()) return;
    this.aim = null;
    this.feedback(this.snake.x, this.snake.y, "FREEZE · 5s", 0x9beaff, true);
    audio.play("power"); haptic("power");
  }
  private collectFreezeReward() {
    if (!this.freezeReward?.active || !save.profile.bossesDefeated.includes("spider-queen")) return;
    const firstUnlock = !save.profile.freezeUnlocked;
    save.profile.freezeUnlocked = true;
    save.profile.freezeRewardClaimed = true;
    this.freezeReward.destroy(); this.freezeReward = undefined;
    void save.save();
    this.feedback(this.snake.x, this.snake.y, "FREEZE DESBLOQUEADO!", 0x9beaff, true);
    audio.play("power"); haptic("power");
    if (firstUnlock) {
      this.freezeModalPending = true;
      this.halted = true; this.pauseKind = "pause"; this.resetControls();
    this.overlay = this.ui.modal("❄ NOVO PODER: FREEZE", "A estrela de gelo desbloqueou o Freeze! Ative-o para parar a cobrinha e ficar invulnerável por 5 segundos. A recarga de 20 segundos começa após o efeito. O Ice World chega em breve!", [{ label: "Continuar", run: () => this.dismissFreezeModal() }]);
    }
  }
  private dismissFreezeModal() {
    this.overlay?.destroy(); this.overlay = undefined;
    this.freezeModalPending = false;
    this.halted = false;
    this.accumulator = 0;
    this.resetControls();
  }
  private createFreezePortal() {
    if (this.currentWorld !== "spider-lair" || !save.profile.bossesDefeated.includes("spider-queen") || this.freezePortal?.active) return;
    const { left, top, right, bottom } = B.arena;
    const x = left + (right - left) * 0.75, y = top + (bottom - top) * 0.5;
    const ring = this.add.graphics().fillStyle(0x91eaff, 0.28).fillEllipse(0, 0, 116, 76).lineStyle(5, 0x9ceeff, 0.9).strokeEllipse(0, 0, 94, 58);
    const label = this.add.text(0, 75, "ICE WORLD · EM BREVE", { fontSize: "11px", color: "#e5faff", fontStyle: "bold", backgroundColor: "#182d3bdd", padding: { x: 5, y: 3 } }).setOrigin(0.5);
    this.freezePortal = this.add.container(x, y, [ring, label]).setDepth(8);
    const star = this.add.container(0, 0, [
      this.add.graphics().fillStyle(0xd9f8ff, 1).fillPoints([new Phaser.Geom.Point(0,-25),new Phaser.Geom.Point(7,-7),new Phaser.Geom.Point(25,0),new Phaser.Geom.Point(7,7),new Phaser.Geom.Point(0,25),new Phaser.Geom.Point(-7,7),new Phaser.Geom.Point(-25,0),new Phaser.Geom.Point(-7,-7)], true).lineStyle(2,0x71d8ff,1).strokePoints([new Phaser.Geom.Point(0,-25),new Phaser.Geom.Point(7,-7),new Phaser.Geom.Point(25,0),new Phaser.Geom.Point(7,7),new Phaser.Geom.Point(0,25),new Phaser.Geom.Point(-7,7),new Phaser.Geom.Point(-25,0),new Phaser.Geom.Point(-7,-7)], true),
      this.add.text(0, 35, "GELO", { fontSize: "12px", color: "#e8fbff", fontStyle: "bold" }).setOrigin(0.5),
    ]).setPosition(x, y).setDepth(12);
    if (!save.profile.freezeRewardClaimed) {
      this.freezeReward = star;
      this.tweens.add({ targets: star, y: y - 16, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else star.destroy();
    this.tweens.add({ targets: ring, alpha: 0.5, duration: 750, yoyo: true, repeat: -1 });
  }
  private step(dt: number) {
    if (this.halted || this.dead) return;
    this.passageCooldown = Math.max(0, this.passageCooldown - dt);
    this.freezePortalCooldown = Math.max(0, this.freezePortalCooldown - dt);
    this.run.elapsed += dt;
    this.activeElapsed += dt;
    this.maxSnakeLength = Math.max(this.maxSnakeLength, this.snake.length);
    this.combo.update(dt);
    this.powers.update(dt);
    if (this.keys?.F && Phaser.Input.Keyboard.JustDown(this.keys.F)) this.activateFreeze();
    if (this.powers.freezeRemaining > 0) {
      this.snake.move(0, this.snake.angle, 0, 0);
      this.renderSnake();
      return;
    }
    this.updateTidalTurtle(dt);
    const d = difficulty(this.run.elapsed, this.run.score, this.snake.length, this.gameDifficulty);
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
    this.desertBarrierCooldown = Math.max(0, this.desertBarrierCooldown - dt);
    if (this.krakenReturnTimer > 0 && this.krakenReturnAngle !== undefined) target = this.krakenReturnAngle;
    const wasTurbo = this.turbo.active;
    this.turbo.update(
      dt,
      this.turboButton.held || !!k?.SHIFT.isDown,
      this.powers.turbo > 0,
    );
    this.run.turboUses = this.turbo.activations;
    if (this.run.turboUses > 0 && this.run.turboUses !== this.lastReportedTurboUses) {
      this.lastReportedTurboUses = this.run.turboUses;
      analytics.track("turbo_used", { worldId: this.currentWorld, activationCount: this.run.turboUses });
    }
    if (wasTurbo !== this.turbo.active) {
      audio.play(this.turbo.active ? "turbo_start" : "turbo_end");
      audio.setTurbo(this.turbo.active);
      if (this.turbo.active) haptic("power");
    }
    const scorpionlingActive = save.profile.selectedPet === "scorpionling";
    const outsideBossEncounter = !this.boss;
    const environmentalSlow = (this.powers.slowed > 0 ? B.hazard.slowMultiplier : 1) * (this.candyAttackSlow > 0 && this.currentWorld === "candy-world" ? 0.72 : 1);
    const playerSpeed = d.speed * this.worldSpeedMultiplier * scorpionlingSlowMultiplier(environmentalSlow, scorpionlingActive, outsideBossEncounter) * (this.powers.precision > 0 ? B.power.precisionSpeed : 1) *
      (this.currentWorld === "candy-world"
        ? candyFinalSpeed(1, this.turbo.active ? B.power.turboSpeed : 1, scorpionlingSlowMultiplier(this.stickySpeed * (inCandyRiver(this.snake, B.arena.left, B.arena.top, B.arena.right, B.arena.bottom) ? CW.river.slowMultiplier : 1), scorpionlingActive, outsideBossEncounter))
        : this.currentWorld === "spider-lair" ? (this.turbo.active ? B.power.turboSpeed : 1) * scorpionlingSlowMultiplier(this.spiderWebSlow, scorpionlingActive, outsideBossEncounter)
        : this.currentWorld === "desert" ? (this.turbo.active ? B.power.turboSpeed : 1) * scorpionlingSlowMultiplier(inDesertOasis(this.snake, desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom)) ? DW.oasisSlowMultiplier : 1, scorpionlingActive, outsideBossEncounter)
        : this.turbo.active ? B.power.turboSpeed : 1);
    const steeringTarget = this.steering.update(target, dt);
    const previousSnakePosition = { x: this.snake.x, y: this.snake.y };
    if (this.currentWorld === "ocean" || this.currentWorld === "silent-abyss" || this.currentWorld === "desert") {
      const environmentalForce = this.currentWorld === "desert" ? desertRouteGustAt(this.snake, this.run.elapsed, this.desertGustZones, desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom)) : currentForceAt(this.snake, this.oceanCurrents);
      const force = scorpionlingWindForce(environmentalForce, scorpionlingActive, !outsideBossEncounter);
      const speedCap = this.currentWorld === "desert" ? DW.maxEffectiveSpeed : OW.maxEffectiveSpeed;
      this.snake.moveVector(dt, steeringTarget, playerSpeed, force, controls.turnSpeed * (this.turbo.active ? controls.turboTurnMultiplier : 1) * (this.powers.precision > 0 ? B.power.precisionTurn : 1), speedCap);
    } else {
      this.snake.move(dt, steeringTarget, playerSpeed, controls.turnSpeed * (this.turbo.active ? controls.turboTurnMultiplier : 1) * (this.powers.precision > 0 ? B.power.precisionTurn : 1));
    }
    if (this.currentWorld === "clover-garden") this.updateCloverGarden(previousSnakePosition);
    this.krakenBarrierCooldown = Math.max(0, this.krakenBarrierCooldown - dt);
    if (this.krakenHealExitTimer > 0) {
      this.krakenHealExitTimer = Math.max(0, this.krakenHealExitTimer - dt);
      const center = this.krakenBarrier;
      const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * OW.krakenArena.radius + B.snake.radius + 8;
      if (this.krakenHealExitTimer <= 0 && center && Math.hypot(this.snake.x - center.x, this.snake.y - center.y) < radius) {
        // Keep the route open until the snake has safely left the arena.
        this.krakenHealExitTimer = 0.1;
      }
      if (this.krakenHealExitTimer <= 0 && this.krakenBarrier) {
        this.tweens.add({ targets: this.krakenBarrier, alpha: 1, duration: 350, ease: "Sine.easeOut" });
        this.krakenBarrierGate?.setVisible(true);
      }
    }
    if (this.currentWorld === "ocean") this.containSnakeInKrakenArena();
    if (this.currentWorld === "spider-lair") this.containSnakeInSpiderArena(previousSnakePosition);
    if ((this.currentWorld === "desert" || this.currentWorld === "desert-labyrinth") && !this.desertCheckpointGrace) this.containSnakeInScorpionArena(previousSnakePosition);
    if (this.boss?.definition.id === "scorpion-king") this.updateScorpionArenaBarrierVisual();
    this.updateScorpionPoisonPuddles(dt);
    this.updateAbyssObstacles(dt);
    if (this.currentWorld === "silent-abyss" && !save.profile.abyssChallengeCompleted) {
      this.abyssChallengeElapsed += dt;
      const remaining = Math.max(0, Math.ceil(90 - this.abyssChallengeElapsed));
      if (this.abyssChallengeTimer) {
        this.abyssChallengeTimer.textContent = `DESAFIO · ${remaining}s`;
        this.abyssChallengeTimer.classList.toggle("urgent", remaining <= 10);
        this.abyssChallengeTimer.setAttribute("aria-label", `Desafio do Abismo: faltam ${remaining} segundos`);
      }
      if (this.abyssChallengeElapsed >= 90) {
        save.profile.abyssChallengeCompleted = true;
        save.profile.abyssChallengeBest = Math.max(save.profile.abyssChallengeBest, 90);
        save.profile.unlockedSkins = [...new Set([...save.profile.unlockedSkins, "abyssal-serpent"] )];
        void save.save();
        this.abyssChallengeTimer?.remove(); this.abyssChallengeTimer = undefined;
        this.abyssRewardPending = true;
        this.halted = true; this.pauseKind = "pause"; this.resetControls();
        this.overlay = this.ui.modal(t("abyssVictoryTitle"), t("abyssVictoryBody"), [{ label: t("continue"), run: () => this.continue() }]);
        return;
      }
    }
    if (this.abyssSanctuaryHud) this.abyssSanctuaryHud.textContent = `SANTUÁRIOS · ${save.profile.abyssSanctuaryProgress}/3`;
    if (this.currentWorld === "candy-world" || this.currentWorld === "spider-lair") {
      if (this.currentWorld === "candy-world") {
        this.candyAttackSlow = Math.max(0, this.candyAttackSlow - dt);
        this.candyHoneyZones = this.candyHoneyZones.filter((zone) => zone.expiresAt > this.run.elapsed);
        const standingInHoney = this.candyHoneyZones.some((zone) => Math.hypot(this.snake.x - zone.x, this.snake.y - zone.y) < zone.radius);
        if (standingInHoney && this.candyAttackSlow > 0) this.candyAttackSlow = Math.max(this.candyAttackSlow, dt + 0.01);
      }
      for (let i = this.spiderWebZones.length - 1; i >= 0; i--) {
        const web = this.spiderWebZones[i];
        if (web.expiresAt <= this.time.now) {
          web.graphic.destroy();
          this.spiderWebZones.splice(i, 1);
          const zoneIndex = this.stickyZones.indexOf(web.zone);
          if (zoneIndex >= 0) this.stickyZones.splice(zoneIndex, 1);
          this.renderStickyZones();
        }
      }
      const snakeSegments = [{ x: this.snake.x, y: this.snake.y }, ...this.snake.body.slice(1, this.snake.length)];
      const insideSpiderWeb = this.currentWorld === "spider-lair" && this.spiderWebZones.some(({ zone }) =>
        snakeSegments.some((segment) => Math.hypot(segment.x - zone.x, segment.y - zone.y) < zone.radius));
      this.spiderWebSlow += ((insideSpiderWeb ? 0.38 : 1) - this.spiderWebSlow) * (1 - Math.exp(-dt / 0.35));
      const insideSticky = this.currentWorld === "candy-world" && this.stickyZones.some((zone) => Math.hypot(this.snake.x-zone.x,this.snake.y-zone.y)<zone.radius);
      const wasSticky = this.stickySpeed < 0.99;
      this.stickySpeed = stickySpeedMultiplier(this.stickySpeed, insideSticky, dt);
      if (insideSticky && !wasSticky && this.run.elapsed >= this.stickyFeedbackAt) {
        this.stickyFeedbackAt=this.run.elapsed+CW.sticky.feedbackCooldown;
        this.feedback(this.snake.x,this.snake.y,"STICKY!",0xd77cbb);
        audio.play("power"); haptic("coin");
      }
      if (this.currentWorld === "candy-world" && Math.floor(this.run.elapsed/CW.sticky.spawnInterval)!==Math.floor((this.run.elapsed-dt)/CW.sticky.spawnInterval) && Math.random()<0.65) this.spawnStickyZones(1);
      // The lair uses fixed cave walls instead of recurring sticky hazards.
      if (this.currentWorld === "spider-lair" && this.boss?.definition.id === "spider-queen") this.updateSpiderWebs(dt);
      this.candyCoinTimer-=dt;
      if(!this.candyCoinSpawned&&this.candyCoinTimer<=0&&candyCoinSpawnAllowed(this.currentWorld,Math.random(),CW.candyCoin.chance)){const slot=this.coins.find(c=>!c.active),p=this.validPoint(B.spawn.bodyClearance,110);if(slot&&p){slot.spawnCandy(p.x,p.y);this.candyCoinSpawned=true;}}
    }
    this.updateOcean(dt);
    if (this.abyssPortalNeedsExit && this.abyssPortal && distance(this.snake, this.abyssPortal) >= 110) {
      this.abyssPortalNeedsExit = false;
    }
    const passage = this.currentWorld === "spider-lair" ? undefined : this.worldPassages.find((item) => item.visible && distance(this.snake, item) < 68);
    if (passage && !this.worldTransitioning && this.passageCooldown <= 0) {
      const arena = B.arena;
      const destination = passage.getData("destination") as string;
      const abyssReturn = this.currentWorld === "silent-abyss" && destination === "ocean";
      const sourceSide = abyssReturn ? "abyss" : passage.x <= (arena.left + arena.right) / 2 ? "left" : "right";
      const direction = abyssReturn ? -Math.PI / 2 : sourceSide === "left" ? Math.PI : 0;
      this.enterWorld(destination, sourceSide, passage.y, direction);
      return;
    }
    if (!this.boss && this.currentWorld === "green-valley" && this.secretSpiderPassage?.visible && distance(this.snake, this.secretSpiderPassage) < 78 && !this.worldTransitioning && this.passageCooldown <= 0) {
      const spiderPassage = this.secretSpiderPassage;
      if (!spiderPassage.getData("unlocked")) {
        this.ui.toast("As teias escondem um covil. Derrote o Escorpião-Rei para revelar o caminho.");
        this.passageCooldown = 1.5;
      } else {
        // The entrance is on Green Valley's upper-right; enterWorld places the snake
        // just inside the opposite (left) edge of the lair, facing inward.
        this.enterWorld("spider-lair", "right", spiderPassage.y, 0);
        return;
      }
    }
    if (this.currentWorld === "spider-lair" && !this.worldTransitioning && this.passageCooldown <= 0) {
      if (this.worldPortal?.visible && distance(this.snake, this.worldPortal) < 72
        && this.worldPortal.getData("blockedByWeb")) {
        this.ui.toast(this.worldPortal.getData("entryHint") as string);
        this.passageCooldown = 1.5;
      }
      const cave = this.worldPassages.find((item) => Math.hypot(this.snake.x - item.x, this.snake.y - item.y) <= B.snake.radius + 6);
      if (cave) {
        const destinations = this.worldPassages.filter((item) => item !== cave);
        const pair = Phaser.Utils.Array.GetRandom(destinations);
        if (pair) {
          // Preserve the side of the entrance where the head was before this
          // frame's movement: left stays left, above stays above, etc.
          // The cave mouths face toward the chamber, so their visible-entry
          // side is opposite the raw world-space offset at the trigger point.
          // Mirror that offset at the paired mouth to emerge through the
          // corresponding side rather than the visually opposite side.
          let offsetX = cave.x - previousSnakePosition.x;
          let offsetY = cave.y - previousSnakePosition.y;
          let offsetLength = Math.hypot(offsetX, offsetY);
          if (offsetLength < 0.001) {
            offsetX = -Math.cos(this.snake.angle);
            offsetY = -Math.sin(this.snake.angle);
            offsetLength = 1;
          }
          const exitAngle = Math.atan2(offsetY, offsetX);
          // Keep the same side but place the head outside the trigger radius.
          const exitDistance = Math.max(100, offsetLength);
          const direction = exitAngle;
          this.snake.reset(pair.x + Math.cos(exitAngle) * exitDistance, pair.y + Math.sin(exitAngle) * exitDistance, direction);
          this.steering.reset(direction);
          this.aim = null;
          this.passageCooldown = 0.75;
          this.cameraX = this.snake.x;
          this.cameraY = this.snake.y;
          this.updateCamera(0, true);
          audio.play("power"); haptic("power");
        }
      }
    }
    if (!this.boss && this.currentWorld === "spider-lair" && this.worldPortal?.visible && !this.worldPortal.getData("blockedByWeb") && distance(this.snake, this.worldPortal) < 58 && !this.worldTransitioning && this.passageCooldown <= 0) {
      if (this.runStarted) analytics.track("portal_entered", { portalType: "return", destinationWorld: "green-valley" });
      this.enterWorld("green-valley", "left", B.arena.top + 140, 0);
      return;
    }
    const desertEntrance = this.desertObjects.find((object) => object instanceof Phaser.GameObjects.Container && object.getData("desertExpeditionEntry")) as Phaser.GameObjects.Container | undefined;
    if (this.currentWorld === "desert" && desertEntrance && distance(this.snake, desertEntrance) < 78 && !this.worldTransitioning && this.passageCooldown <= 0) {
      this.ui.toast("Labirinto do Deserto · Em breve."); this.passageCooldown = 1.5;
    }
    if (this.currentWorld === "desert-labyrinth") {
      this.ui.toast("Labirinto do Deserto · Em breve.");
      this.returnFromDesertExpedition();
      return;
    }
    if (!this.boss && !this.cloverGardenBoss && this.currentWorld === "candy-world" && this.cloverPassage?.visible && distance(this.snake, this.cloverPassage) < 78 && !this.worldTransitioning && this.passageCooldown <= 0) {
      if (save.profile.selectedSkin !== "abyssal-serpent") { this.ui.toast("Equipe a Serpente Abissal para atravessar esta passagem."); this.passageCooldown = 1.5; }
      else {
        this.scene.restart({ cloverGarden: true, cloverOrigin: "candy-world", returnWorld: "candy-world", bossEnergy: this.run.bossEnergy });
        return;
      }
    }
    if (this.cloverRevengePortalNeedsExit && this.cloverRevengePortal && distance(this.snake, this.cloverRevengePortal) >= 110) this.cloverRevengePortalNeedsExit = false;
    if (!this.boss && !this.cloverGardenBoss && this.currentWorld === "clover-garden" && this.cloverRevengePortal?.visible && distance(this.snake, this.cloverRevengePortal) < 78 && !this.bossIntroOpen && !this.cloverRevengePortalNeedsExit) {
      this.openCloverRevengeModal();
      return;
    }
    if (this.currentWorld === "desert-labyrinth" && this.worldPortal && distance(this.snake, this.worldPortal) < 68 && !this.worldTransitioning && this.passageCooldown <= 0) {
      this.returnFromDesertExpedition();
      return;
    }
    if (!this.boss && !this.cloverGardenBoss && this.currentWorld === "clover-garden" && this.worldPortal?.visible && !this.worldPortal.getData("blockedUntilComplete") && distance(this.snake, this.worldPortal) < 78 && !this.worldTransitioning && this.passageCooldown <= 0) {
      this.scene.restart({ startWorld: "candy-world", cloverReturn: true, cloverOrigin: "candy-world", bossEnergy: this.run.bossEnergy });
      return;
    }
    if (!this.boss && this.currentWorld === "ocean" && this.abyssPortal?.visible && !this.abyssPortalNeedsExit && distance(this.snake, this.abyssPortal) < 78 && !this.worldTransitioning && this.passageCooldown <= 0) {
      this.enterWorld("silent-abyss", "left", this.abyssPortal.y, Math.PI);
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
        const startFight = () => {
          if (!this.bossIntroOpen || this.boss || !this.scene.isActive()) return;
          this.overlay?.destroy(); this.overlay = undefined; this.bossIntroOpen = false;
          this.resetControls(); this.accumulator = 0;
          this.run.bossEnergy -= requiredEnergy;
          this.startBoss(definition); this.halted = false;
        };
        const hint = localizedBossHint(definition.id, definition.entryHint);
        if (save.profile.bossTutorialsSeen.includes(definition.id) || save.profile.bossesDefeated.includes(definition.id)) {
          this.overlay = this.ui.modal(`${getLanguage() === "en" ? "Challenge" : "Desafio"}: ${definition.name}`,
            `${hint}\n\n${t("bossOptional")}`, [
              { label: t("bossStart"), run: startFight },
              { label: t("bossLater"), run: () => { if (!this.bossIntroOpen) return; this.bossPortal?.setData("hintDismissed", true); this.bossIntroOpen = false; this.continue(); } },
            ]);
        } else {
          save.profile.bossTutorialsSeen.push(definition.id);
          void save.save();
          const sentences = hint.split(/(?<=[.!?])\s+/).filter(Boolean);
          const midpoint = Math.ceil(sentences.length / 2);
          const tips = [sentences.slice(0, midpoint).join(" "), sentences.slice(midpoint).join(" ") || hint];
          let step = 0;
          let countdown = 6;
          const renderStep = () => {
            if (!this.bossIntroOpen || !this.scene.isActive()) return;
            this.overlay?.destroy();
            this.overlay = undefined;
            const finalStep = step === tips.length - 1;
            const title = `${getLanguage() === "en" ? "Challenge" : "Desafio"}: ${definition.name}`;
            const body = `${t(finalStep ? "bossTutorialWatchOut" : "bossTutorialHowTo")} · ${t("bossTutorialStep", { current: step + 1, total: tips.length })}\n\n${tips[step]}${finalStep ? `\n\n${t("bossOptional")}` : ""}`;
            this.overlay = this.ui.modal(title, body, [
              { label: finalStep ? t("bossTutorialCountdown", { seconds: countdown }) : t("bossTutorialNext"), run: () => {
                if (!this.bossIntroOpen) return;
                if (!finalStep) { step++; renderStep(); return; }
                if (countdown > 0) return;
                startFight();
              } },
              { label: t("bossTutorialSkip"), run: startFight },
            ]);
            if (finalStep && countdown > 0) {
              const tick = () => {
                window.setTimeout(() => {
                  if (!this.bossIntroOpen || !this.scene.isActive()) return;
                  countdown--;
                  if (countdown > 0) tick();
                  else renderStep();
                }, 1000);
              };
              tick();
            }
          };
          renderStep();
        }
      }
    }
    if (this.halted || this.dead) return;
    if (!this.boss && !this.cloverGardenBoss && this.bossPortal && this.bossPortalExpiresAt > 0 && this.run.elapsed >= this.bossPortalExpiresAt) {
      if (this.bossDefinition) analytics.track("portal_ignored", { portalType: "boss", destinationWorld: this.currentWorld, bossId: this.bossDefinition.id });
      this.bossPortal.destroy();
      this.bossPortal = undefined;
      this.bossDefinition = undefined;
      this.bossPortalExpiresAt = 0;
      this.ui.toast(`Portal de chefe expirou. Boss Energy (${Math.floor(this.run.bossEnergy)}) preservada.`);
    }
    if (this.boss) {
      this.updateBoss(dt);
    }
    if (this.cloverGardenBoss) this.updateCloverGardenBoss(dt);
    if (!this.boss && !this.cloverGardenBoss && this.currentWorld === "clover-garden" && save.profile.cloverGardenBossesDefeated.includes(this.cloverGardenBossId()) && !this.cloverRevengePortal?.active) this.createCloverGardenRevengePortal();
    if (!this.boss && this.currentWorld !== "desert-labyrinth") { this.refreshWorldPassages(); this.refreshSecretSpiderPassage(); this.refreshCloverPassage(); }
    if (this.updateDesertLabyrinth()) return;
    this.updateFunctionalPets(dt);
    if (this.currentWorld === "silent-abyss") this.updateCelestialSanctuaries();
    if (this.currentWorld === "desert") this.updateDesertGusts();
    this.updateBossPickups(dt);
    if (this.currentWorld === "spider-lair" && !this.boss) {
      this.createFreezePortal();
      if (!save.profile.freezeRewardClaimed && this.freezeReward?.active && distance(this.snake, this.freezeReward) < 44) this.collectFreezeReward();
      if (this.freezePortal && distance(this.snake, this.freezePortal) < 78) {
        if (save.profile.freezeUnlocked && this.freezePortalCooldown <= 0) {
          this.freezePortalCooldown = 1.5;
          this.ui.toast("Ice World · Em breve! A estrela de gelo está no centro do portal.");
        }
      }
    }
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
    const overlappingObstacle = this.obstacles.find((o) => {
      if (o.warning !== 0) return false;
      if (this.currentWorld === "desert-labyrinth") {
        const bounds = o.image.getData("desertWallBounds") as { left: number; right: number; top: number; bottom: number } | undefined;
        if (bounds) {
          return circleIntersectsDesertWall(this.snake, B.snake.radius, bounds);
        }
      }
      return distance(this.snake, o) < (this.currentWorld === "ocean" ? (this.oceanCorals.find((coral) => coral.x === o.x && coral.y === o.y)?.radius ?? 24) + B.snake.radius : this.currentWorld === "desert" || this.currentWorld === "desert-labyrinth" ? o.radius + B.snake.radius : 44);
    });
    const overlappingBody = this.snake.selfCollision();
    const ghostActive = this.powers.updateGhost(dt, overlappingBody || !!overlappingObstacle);
    const obstacle = ghostActive ? undefined : overlappingObstacle;
    if (wall || obstacle || (!ghostActive && overlappingBody)) {
      const hadShield = this.powers.shield;
      if (this.powers.invincible <= 0 && !this.powers.freezeBlocksDamage()) {
        if (!this.powers.absorb()) {
          if (this.currentWorld === "desert-labyrinth") {
            const checkpointEntry = this.desertLabyrinthEntry();
            this.snake.length = B.snake.initial;
            this.snake.reset(checkpointEntry.x, checkpointEntry.y, 0);
            this.steering.reset(0); this.aim = null;
            this.powers.invincible = B.power.lifeGrace;
            this.desertCheckpointGrace = true;
            this.time.delayedCall(1600, () => { this.desertCheckpointGrace = false; });
            this.feedback(checkpointEntry.x, checkpointEntry.y, "RETORNO AO CHECKPOINT", 0x9be7c5, true);
          } else if (!this.loseLife()) {
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
      if (obstacle && this.currentWorld !== "desert-labyrinth") {
        obstacle.destroy();
        this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
      }
    }
    for (const coin of this.coins) {
      if (!coin.active) continue;
      const dist = distance(coin, this.snake);
      const spiderlingAttracted = save.profile.selectedPet === "spiderling"
        && attractSpiderlingCoin(coin, this.snake, dt);
      if (coin.kind.id !== "mythic" && coin.kind.id !== "candy_coin" && this.powers.magnet > 0 && dist < B.power.magnetRadius && dist > 1) {
        const move = Math.min(dist, B.power.attraction * dt);
        coin.x += ((this.snake.x - coin.x) / dist) * move;
        coin.y += ((this.snake.y - coin.y) / dist) * move;
        coin.render();
      }
      if (spiderlingAttracted) coin.render();
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
          const bonus = kind.id === "turbo" && pet === "tiny-dragon" ? 0.05 : 0;
          const fixedDuration = kind.id === "magnet" && pet === "baby-octopus" ? B.power.octopusMagnetDuration : kind.id === "ghost" && pet === "tidal-turtle" ? B.power.turtleGhostDuration : undefined;
          const shieldHits = kind.id === "shield" && save.profile.selectedPet === "snow-pup" ? 2 : 1;
          this.powers.activate(kind.id, bonus, fixedDuration, shieldHits);
          if (kind.id === "shield") this.shieldUses++;
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
        analytics.track("shrink_fruit_used", { worldId: this.currentWorld });
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
      this.countdown += powerUpSpawnInterval(this.gameDifficulty);
      if (!this.power) {
        const p = this.validPoint(55, 100);
        if (p) {
          const rareLife =
            this.powers.lives < B.power.maxLives &&
            Math.random() < B.power.lifeSpawnChance + (save.profile.unlockedPets.includes("lucky-leprechaun") ? 0.02 : 0);
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
      if (this.currentWorld !== "spider-lair" && this.obstacles.length < d.obstacles) this.spawnObstacle();
    }
  }
  private renderSnake() {
    this.skinTrail.clear();
    const poisoned = this.powers.slowed > 0;
    const gardenAuraActive = this.cloverGardenOrigin() === "candy-world"
      && this.bossFight.combat.active
      && this.bossFight.combat.bossId === "candy-garden-guardian"
      && this.bossFight.combat.remainingHits > 0;
    if (gardenAuraActive && this.snake.length > 1) {
      // Draw the aura as an outer halo around each segment; snake sprites are rendered afterward.
      for (let i = 0; i < this.snake.length; i++) {
        const point = this.snake.body[i];
        const phase = this.run.elapsed * 4 + i * 0.8;
        this.skinTrail.lineStyle(7, 0x55e65d, 0.2).strokeCircle(point.x, point.y, 22 + Math.sin(phase) * 2);
        for (let mote = 0; mote < 3; mote++) {
          const angle = phase + mote * (Math.PI * 2 / 3);
          this.skinTrail.fillStyle(0xbaff78, 0.82)
            .fillCircle(point.x + Math.cos(angle) * 25, point.y + Math.sin(angle) * 25, 2.5);
        }
      }
    }
    if (poisoned && this.snake.length > 1) {
      for (let i = 0; i < this.snake.length; i++) {
        const point = this.snake.body[i];
        const pulse = save.profile.settings.reducedMotion ? 0 : Math.sin(this.run.elapsed * 10 - i * 0.5) * 2;
        this.skinTrail.lineStyle(5, 0x7cff68, 0.22).strokeCircle(point.x, point.y, 20 + pulse);
      }
    }
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
      if (poisoned && !(this.turbo.active && this.selectedCosmetic.turboEffect !== "none" && i === 0))
        image.setTint(0x73e879);
      else if (this.turbo.active && this.selectedCosmetic.turboEffect !== "none" && i === 0)
        image.setTint(this.selectedCosmetic.trailConfig.color);
      else image.clearTint();
    }
    if (this.petSprite) {
      const tail = this.snake.body[Math.min(this.snake.length - 1, 5)];
      const phase = this.run.elapsed * 3;
      const nearbyCoin = save.profile.selectedPet === "spiderling"
        ? this.coins
          .filter((coin) => coin.active && !["mythic", "candy_coin", "pearl_coin"].includes(coin.kind.id)
            && distance(coin, this.snake) <= 185)
          .sort((a, b) => distance(a, this.petSprite!) - distance(b, this.petSprite!))[0]
        : undefined;
      const interceptedSpiderling = this.scorpionlingAttack?.phase === "outbound"
        ? this.spiderlings.find((spiderling) => spiderling.image === this.scorpionlingAttack?.target)
        : undefined;
      const serpentSide = this.snake.angle + Math.PI / 2;
      const serpentOffset = 58;
      const followIndex = Math.min(this.snake.length - 1, 2);
      const serpentAnchor = this.snake.body[followIndex];
      const serpentWave = save.profile.settings.reducedMotion ? 0 : Math.sin(phase * 1.8) * 7;
      const defaultPetX = save.profile.selectedPet === "celestial-serpent"
        ? serpentAnchor.x + Math.cos(serpentSide) * (serpentOffset + serpentWave)
        : tail.x + Math.cos(phase) * 13;
      const defaultPetY = save.profile.selectedPet === "celestial-serpent"
        ? serpentAnchor.y + Math.sin(serpentSide) * (serpentOffset + serpentWave)
        : tail.y + 26 + Math.sin(phase) * 5;
      const targetX = this.dragonAttack ? this.petSprite.x : interceptedSpiderling?.x ?? nearbyCoin?.x ?? defaultPetX;
      const targetY = this.dragonAttack ? this.petSprite.y : interceptedSpiderling?.y ?? nearbyCoin?.y ?? defaultPetY;
      const follow = Math.min(1, (this.game.loop.delta / 1000) * 5);
      if (!this.phoenixReviving && !this.scorpionlingAttack && !this.dragonAttack) {
        this.petSprite.setPosition(
          Phaser.Math.Linear(this.petSprite.x, targetX, follow),
          Phaser.Math.Linear(this.petSprite.y, targetY, follow),
        );
      }
      if (save.profile.selectedPet === "celestial-serpent") {
        const segments = this.petSprite.list.filter(
          (item): item is Phaser.GameObjects.Graphics => item instanceof Phaser.GameObjects.Graphics,
        ).slice(0, this.celestialSerpentBody.length - 1);
        const headX = this.petSprite.x;
        const headY = this.petSprite.y;
        const first = this.celestialSerpentBody[0];
        if (first) {
          first.x += (headX - first.x) * Math.min(1, (this.game.loop.delta / 1000) * 12);
          first.y += (headY - first.y) * Math.min(1, (this.game.loop.delta / 1000) * 12);
        }
        for (let index = 1; index < this.celestialSerpentBody.length; index++) {
          const previous = this.celestialSerpentBody[index - 1];
          const current = this.celestialSerpentBody[index];
          const dx = current.x - previous.x;
          const dy = current.y - previous.y;
          const length = Math.hypot(dx, dy) || 1;
          const spacing = 8.5;
          current.x = previous.x + dx / length * spacing;
          current.y = previous.y + dy / length * spacing;
        }
        const headAngle = Math.atan2(
          this.celestialSerpentBody[1].y - headY || Math.sin(this.snake.angle),
          this.celestialSerpentBody[1].x - headX || Math.cos(this.snake.angle),
        );
        segments.forEach((segment, index) => {
          const point = this.celestialSerpentBody[index + 1];
          const next = this.celestialSerpentBody[index];
          if (!point || !next) return;
          const direction = Math.atan2(next.y - point.y, next.x - point.x);
          const dx = point.x - headX;
          const dy = point.y - headY;
          segment.setPosition(
            dx * Math.cos(headAngle) + dy * Math.sin(headAngle),
            -dx * Math.sin(headAngle) + dy * Math.cos(headAngle),
          );
          segment.setRotation(direction - headAngle);
        });
        this.petSprite.setRotation(headAngle);
      }
      if (!this.phoenixReviving) this.petSprite.setScale((save.profile.selectedPet === "phoenix" ? 1.35 : 1) * (1 + Math.sin(phase) * 0.06));
      if (save.profile.selectedPet === "tidal-turtle" && this.petSprite.list[0] instanceof Phaser.GameObjects.Graphics) {
        const turtle = this.petSprite.list[0];
        const swim = save.profile.settings.reducedMotion ? 0 : Math.sin(phase * 2.2) * 1.8;
        turtle.setAngle(swim);
      }
      if (save.profile.selectedPet === "phoenix" && this.phoenixWings) {
        const flap = save.profile.settings.reducedMotion ? 0 : Math.sin(phase * 10) * 0.42;
        const leftWing = this.phoenixWings.list[0];
        const rightWing = this.phoenixWings.list[1];
        if (leftWing instanceof Phaser.GameObjects.Graphics) leftWing.setRotation(-0.12 - flap);
        if (rightWing instanceof Phaser.GameObjects.Graphics) rightWing.setRotation(0.12 + flap);
      }
      if (save.profile.selectedPet === "tiny-dragon") {
        const wings = this.petSprite.list[0];
        if (wings instanceof Phaser.GameObjects.Graphics) {
          const flap = save.profile.settings.reducedMotion ? 0 : Math.sin(phase * 7) * 5;
          wings.clear().fillStyle(0xaaa59b).fillEllipse(0, 2, 27, 18)
            .fillStyle(0x77736c).fillTriangle(8, -2, 20, -8, 17, 1)
            .fillStyle(0xc3bdb2).fillTriangle(-5, -5, -18, -14 + flap, -13, 2)
            .fillStyle(0xc3bdb2).fillTriangle(1, -5, 14, -14 + flap, 11, 2)
            .fillStyle(0x6c6861).fillTriangle(-5, 8, -14, 15, -2, 11)
            .fillStyle(0x35322e).fillCircle(7, -1, 1.7)
            .fillStyle(0xc3bdb2).fillTriangle(11, 3, 20, 5, 11, 7);
          if (!save.profile.settings.reducedMotion && !this.dragonAttack && this.run.elapsed % 0.18 < (this.game.loop.delta / 1000)) {
            const spark = this.add.circle(this.petSprite.x - Math.cos(this.petSprite.rotation) * 12, this.petSprite.y - Math.sin(this.petSprite.rotation) * 12, Phaser.Math.Between(2, 4), Phaser.Utils.Array.GetRandom([0xff7b24, 0xffc04d, 0xffe8a0]), 0.9).setDepth(26);
            this.tweens.add({ targets: spark, x: spark.x + Phaser.Math.Between(-12, 12), y: spark.y + Phaser.Math.Between(5, 16), alpha: 0, scale: 0.2, duration: 420, onComplete: () => spark.destroy() });
          }
        }
      }
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
    particles = true,
  ) {
    if (particles) {
      this.particles.setParticleTint(color);
      this.particles.explode(special ? 24 : 8, x, y);
    }
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
    if (this.phoenixReviving) return;
    this.dead = true;
    this.currentEndReason = "death";
    this.currentDeathReason = this.boss ? "boss_damage_or_collision" : "collision_or_gameplay";
    if (this.boss) analytics.track("boss_failed", { bossId: this.boss.definition.id, worldId: this.currentWorld, durationSeconds: Math.max(0, Math.round((this.run.elapsed - this.bossStartedAt) * 100) / 100), phaseReached: this.boss.phase, deathReason: this.currentDeathReason, attemptNumber: this.bossAttempts[this.boss.definition.id] ?? 1 });
    analytics.track("player_death", { reason: this.currentDeathReason, worldId: this.currentWorld, score: this.run.score, durationSeconds: Math.max(0, Math.round(this.run.elapsed)), ...(this.boss ? { bossId: this.boss.definition.id } : {}) });
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
      if (mission) this.ui.toast(t("missionReadyToast", { mission: mission.title }));
    }
    void save.save();
    this.renderSnake();
    this.scene.launch("GameOver", { run: this.run });
    this.scene.pause();
  }
  private loseLife(): boolean {
    if (!this.powers.loseLife()) return false;
    if (this.powers.lives === 0 && save.profile.selectedPet === "phoenix" && !this.phoenixRevived && this.powers.reviveWithLife()) {
      this.phoenixRevived = true;
      this.phoenixReviving = true;
      this.powers.invincible = B.power.reviveGrace;
      this.snake.length = B.snake.initial;
      this.snake.reset(700, 750);
      this.steering.reset(this.snake.angle);
      this.aim = null;
      this.cameras.main.shake(450, 0.012);
      this.cameras.main.flash(550, 255, 126, 35);
      this.feedback(this.snake.x, this.snake.y, "RENASCIMENTO DA FÊNIX · +1 VIDA", 0xffbd4a, true);
      for (let i = 0; i < 3; i++) {
        const aura = this.add.circle(this.snake.x, this.snake.y, 24 + i * 14, i === 1 ? 0xff672f : 0xffd85b, 0.3).setDepth(40).setStrokeStyle(4, i === 1 ? 0xffa138 : 0xfff0a0, 0.9);
        this.phoenixAuras.push(aura);
        this.tweens.add({ targets: aura, scale: 4.2, alpha: 0, duration: 1100, delay: i * 120, ease: "Cubic.easeOut", onComplete: () => { aura.destroy(); this.phoenixAuras = this.phoenixAuras.filter((entry) => entry !== aura); } });
      }
      if (this.petSprite?.active === false) this.petSprite = undefined;
      if (this.petSprite) {
        this.petSprite.setPosition(this.snake.x, this.snake.y - 18).setScale(0.2).setAlpha(0);
        this.tweens.add({ targets: this.petSprite, scale: 1.35, alpha: 1, y: this.snake.y - 55, duration: 600, ease: "Back.easeOut", onComplete: () => { this.phoenixReviving = false; } });
      } else this.phoenixReviving = false;
      this.resetControls();
      this.turbo.fill();
      this.accumulator = 0;
      this.updateCamera(0, true);
      this.renderSnake();
      haptic("power");
      return true;
    }
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
  private updateTidalTurtle(dt: number) {
    if (save.profile.selectedPet !== "tidal-turtle") {
      this.turtleShieldCooldown = B.power.turtleShieldInterval;
      return;
    }
    this.turtleShieldCooldown = Math.max(0, this.turtleShieldCooldown - dt);
    if (this.turtleShieldCooldown > 0) return;
    this.turtleShieldCooldown = B.power.turtleShieldInterval;
    if (this.powers.shield) return;
    const appeared = this.powers.activateTimedShield(B.power.turtleShieldDuration);
    if (appeared) this.shieldUses++;
    if (!appeared) return;
    this.feedback(this.snake.x, this.snake.y, "TARTARUGA · ESCUDO!", 0x56c9b0, true);
    audio.play("power");
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
    const en = getLanguage() === "en";
    this.overlay = this.ui.modal(t("pauseTitle"), t("pauseBody"), [
      { label: t("continue"), run: () => this.continue() },
      {
        label: `${t("pauseCamera")}: ${save.profile.settings.cameraMode === "standard" ? (en ? "Standard" : "Padrão") : (en ? "Panoramic" : "Panorâmica")}`,
        run: () => {
          this.overlay?.destroy();
          this.overlay = undefined;
          const previous = save.profile.settings.cameraMode;
          save.profile.settings.cameraMode = previous === "standard" ? "panoramic" : "standard";
          analytics.track("camera_mode_changed", { from: previous, to: save.profile.settings.cameraMode });
          this.applyCameraZoom(this.scale.width, this.scale.height);
          this.updateCamera(0, true);
          void save.save();
          this.showPauseModal();
        },
      },
      {
        label: save.profile.settings.muted ? t("soundOn") : t("soundOff"),
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
        label: t("restart"),
        run: () => {
          this.currentEndReason = "restart";
          this.finalize();
          this.scene.restart();
        },
      },
      {
        label: t("pauseMenu"),
        run: () => {
          this.currentEndReason = "quit";
          this.finalize();
          this.scene.start("Menu");
        },
      },
    ]);
  }
  private continue() {
    this.overlay?.destroy();
    this.overlay = undefined;
    if (this.abyssRewardPending) {
      this.abyssRewardPending = false;
      this.clearAbyssObstacles();
      this.refreshWorldPassages();
    }
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
      this.ui.toast(t("turboHint"));
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
      this.ui.toast(t("shrinkHint"));
    }
  }
  private collectCoin(coin: Coin) {
    if (coin.kind.id === "candy_coin" && this.currentWorld !== "candy-world") return;
    if (coin.kind.id === "pearl_coin" && this.currentWorld !== "ocean") return;
    const combo = this.combo.collect();
    const coinCountKey = coin.kind.id === "blue" ? "blue" : coin.kind.id === "diamond" ? "diamond" : coin.kind.id === "golden" ? "golden" : coin.kind.id === "normal" ? "normal" : "special";
    this.coinCounts[coinCountKey] = (this.coinCounts[coinCountKey] ?? 0) + 1;
    this.run.score +=
      coin.kind.score *
      combo *
      (this.powers.turbo > 0 ? B.power.turboScore : 1);
    this.run.matchCoins += coin.kind.value;
    const coinXP = coinCollectionXP(coin.kind.value);
    this.run.coinXP += coinXP;
    addXP(save.profile, coinXP);
    this.run.coinXPCredited = this.run.coinXP;
    void save.save();
    this.run.maxCombo = this.combo.max;
    if (coin.kind.id === "pearl_coin" && !save.profile.hints.pearl) { save.profile.hints.pearl = true; void save.save(); this.ui.toast("Pearls are rare and valuable!"); }
    if (coin.kind.id === "golden") this.run.golden++;
    this.snake.grow();
    if (coin.kind.id !== "pearl_coin") this.turbo.charge(coin.kind.id);
    if (this.boss) {
      const bossId = this.boss.definition.id;
      const charge = this.boss.definition.combat.attackChargePerBossCoin;
      this.bossFight.combat.addCharge(regularCoinAuraCharge(bossId, coin.kind.id, charge));
    } else {
      this.run.bossEnergy += this.portalSystem.bossEnergy(coin.kind.id);
      const bossId = worldById(this.currentWorld).bossId;
      const requiredEnergy = this.bossEnergyRequirement(bossId);
      if (
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
      false,
      false,
    );
    audio.play(coin.kind.id === "candy_coin" ? "candy_coin" : coin.kind.id === "pearl_coin" ? "pearl_coin" : `coin_${coin.kind.id}`, combo);
    haptic(coin.kind.id === "golden" ? "golden" : coin.kind.id === "candy_coin" || coin.kind.id === "pearl_coin" ? "power" : "coin");
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
  private buildSpiderLair(g: Phaser.GameObjects.Graphics) {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    g.fillStyle(0x11151d, 0.98).fillRoundedRect(a.left, a.top, w, h, 24);
    g.fillStyle(0x292936, 0.98).fillRoundedRect(a.left + 18, a.top + 18, w - 36, h - 36, 20);
    // Jagged cave walls frame a broad, navigable central chamber.
    for (let i = 0; i < 18; i++) {
      const x = a.left + 35 + i * (w - 70) / 17;
      const topDepth = 45 + (i * 53 % 95), bottomDepth = 42 + (i * 71 % 105);
      g.fillStyle(i % 2 ? 0x494552 : 0x393743, 0.96)
        .fillTriangle(x - 44, a.top + 20, x + 42, a.top + 20, x + (i % 2 ? 22 : -18), a.top + topDepth)
        .fillTriangle(x - 40, a.bottom - 20, x + 44, a.bottom - 20, x + (i % 2 ? -20 : 16), a.bottom - bottomDepth);
    }
    // Four fixed cave mouths are distributed across the upper and lower map bands,
    // clear of both the central spider arena and the rock shelves.
    const caveMouths: Point[] = [
      { x: a.left + w * 0.28, y: a.top + h * 0.30 },
      { x: a.left + w * 0.72, y: a.top + h * 0.30 },
      { x: a.left + w * 0.28, y: a.top + h * 0.70 },
      { x: a.left + w * 0.72, y: a.top + h * 0.70 },
    ];
    const center = { x: a.left + w / 2, y: a.top + h / 2 };
    caveMouths.forEach((mouth) => {
      const radius = 14;
      g.fillStyle(0x090a10, 1).fillCircle(mouth.x, mouth.y + 4, radius - 5);
      g.lineStyle(3, 0x77717f, 0.95).strokeCircle(mouth.x, mouth.y, radius);
      g.lineStyle(1, 0xc5a6e3, 0.75).strokeCircle(mouth.x, mouth.y - 1, radius - 3);
      this.worldPassages.push(
        this.add.container(mouth.x, mouth.y).setDepth(2).setSize((radius - 5) * 2, (radius - 5) * 2).setData("destination", "cave-pair"),
      );
    });
    // Fixed rock shelves create a cave silhouette while leaving clear travel
    // lanes from the central chamber to every cave mouth and the world exit.
    const shelves = [
      { x: a.left + w * 0.83, y: a.top + h * 0.13, width: 220, height: 38, flip: true },
      { x: a.left + w * 0.16, y: a.top + h * 0.87, width: 230, height: 40, flip: true },
      { x: a.left + w * 0.84, y: a.top + h * 0.87, width: 250, height: 42, flip: false },
      { x: a.left + w * 0.49, y: a.top + h * 0.92, width: 280, height: 38, flip: true },
    ];
    const safeWallPoints = [
      ...caveMouths,
      { x: a.left + 90, y: a.top + h * 0.5 },
      center,
    ];
    shelves.forEach(({ x, y, width, height, flip }, index) => {
      const half = width / 2;
      const points = flip
        ? [new Phaser.Geom.Point(-half, -height / 2), new Phaser.Geom.Point(-half * 0.68, height / 2), new Phaser.Geom.Point(half * 0.18, height * 0.32), new Phaser.Geom.Point(half, -height / 2)]
        : [new Phaser.Geom.Point(-half, height / 2), new Phaser.Geom.Point(-half * 0.55, -height / 2), new Phaser.Geom.Point(half * 0.25, -height * 0.32), new Phaser.Geom.Point(half, height / 2)];
      g.fillStyle(0x171720, 0.55).fillEllipse(x, y + height * 0.35, width * 1.08, height * 0.9)
        .fillStyle(index % 2 ? 0x45424c : 0x393741, 0.98)
        .fillPoints(points.map((point) => new Phaser.Geom.Point(x + point.x, y + point.y)), true)
        .lineStyle(2, 0x716b78, 0.68)
        .lineBetween(x - half * 0.55, y - height * 0.25, x + half * 0.2, y - height * 0.3);
      // Collision is represented by fixed rock segments only where the
      // shelf cannot obstruct a cave exit, the return portal, or the chamber.
      for (const segment of [-1, 0, 1]) {
        const rockX = x + segment * 58;
        if (safeWallPoints.some((point) => Math.hypot(rockX - point.x, y - point.y) < 190)) continue;
        const rock = this.add.image(rockX, y, "rock").setVisible(false);
        this.obstacles.push(new Obstacle(rockX, y, rock, true, 30));
      }
    });
    const label = this.add.text(a.left + w * 0.5, a.top + h * 0.16, "COVIL DA ARANHA · CAVERNA SUBTERRÂNEA", { fontSize: "20px", color: "#dfc7f1", fontStyle: "bold", backgroundColor: "#171923bb", padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(3);
    this.desertObjects.push(g, label);
    const exit = this.add.graphics().fillStyle(0x36533a, 0.2).fillEllipse(0, 33, 180, 48)
      .fillStyle(0x252a28, 1).fillEllipse(0, 5, 110, 68)
      .fillStyle(0x080b0b, 1).fillEllipse(0, 10, 76, 42)
      .lineStyle(7, 0x777b70, 0.98).strokeEllipse(0, 0, 112, 68)
      .fillStyle(0x4d7046, 1)
      .fillTriangle(-67, -5, -44, -51, -22, -8).fillTriangle(45, -4, 65, -48, 82, 2)
      .fillStyle(0x8a8b7a, 1).fillTriangle(-47, -8, -28, -38, -13, -9).fillTriangle(52, -9, 65, -37, 74, -7);
    const exitLabel = this.add.text(0, 52, "SAÍDA · GREEN VALLEY", { fontSize: "13px", color: "#f0e6c8", fontStyle: "bold", backgroundColor: "#20241dcc", padding: { x: 7, y: 4 } }).setOrigin(0.5);
    this.worldPortal = this.add.container(a.left + 90, a.top + 90, [exit, exitLabel]).setDepth(9);
    this.worldPortal.setData("destination", "green-valley");
    if (!save.profile.bossesDefeated.includes("spider-queen")) {
      this.spiderExitWeb = this.add.graphics().setPosition(this.worldPortal.x, this.worldPortal.y).setDepth(10);
      this.drawSpiderExitWeb();
      this.tweens.add({ targets: this.spiderExitWeb, alpha: 0.48, duration: 620, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.worldPortal.setData("blockedByWeb", true);
      this.worldPortal.setData("entryHint", "A teia bloqueia a saída. Derrote a Aranha Real para escapar do Covil!");
    } else {
      this.worldPortal.setData("blockedByWeb", false);
    }
    this.createFreezePortal();
  }
  private drawSpiderExitWeb() {
    const web = this.spiderExitWeb;
    if (!web) return;
    web.clear();
    web.lineStyle(4, 0xe9d8f5, 0.95);
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = spoke * Math.PI / 4;
      web.lineBetween(0, 0, Math.cos(angle) * 39, Math.sin(angle) * 19);
    }
    for (const radius of [0.35, 0.65, 1]) {
      web.beginPath();
      for (let point = 0; point <= 48; point++) {
        const angle = point * Math.PI * 2 / 48;
        const x = Math.cos(angle) * 39 * radius, y = Math.sin(angle) * 19 * radius;
        if (point === 0) web.moveTo(x, y); else web.lineTo(x, y);
      }
      web.strokePath();
    }
  }
  private buildSpiderEntrance() {
    const a = B.arena;
    const x = a.right - 140, y = a.top + 140;
    const cave = this.add.graphics()
      .fillStyle(0x36533a, 0.2).fillEllipse(0, 33, 180, 48)
      .fillStyle(0x252a28, 1).fillEllipse(0, 5, 110, 68)
      .fillStyle(0x080b0b, 1).fillEllipse(0, 10, 76, 42)
      .lineStyle(7, 0x777b70, 0.98).strokeEllipse(0, 0, 112, 68)
      .fillStyle(0x4d7046, 1)
      .fillTriangle(-67, -5, -44, -51, -22, -8).fillTriangle(45, -4, 65, -48, 82, 2)
      .fillStyle(0x8a8b7a, 1).fillTriangle(-47, -8, -28, -38, -13, -9).fillTriangle(52, -9, 65, -37, 74, -7)
      .setDepth(7);
    cave.setPosition(0, 0);
    const label = this.add.text(0, 52, "COVIL DA ARANHA", { fontSize: "13px", color: "#f0e6c8", fontStyle: "bold", backgroundColor: "#20241dcc", padding: { x: 7, y: 4 } }).setOrigin(0.5);
    const web = this.add.graphics().setPosition(0, 0).setDepth(2);
    web.lineStyle(3, 0xe9d8f5, 0.95);
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = spoke * Math.PI / 4;
      web.lineBetween(0, 0, Math.cos(angle) * 39, Math.sin(angle) * 19);
    }
    for (const radius of [0.35, 0.65, 1]) {
      web.beginPath();
      for (let point = 0; point <= 48; point++) {
        const angle = point * Math.PI * 2 / 48;
        const webX = Math.cos(angle) * 39 * radius, webY = Math.sin(angle) * 19 * radius;
        if (point === 0) web.moveTo(webX, webY); else web.lineTo(webX, webY);
      }
      web.strokePath();
    }
    this.secretSpiderPassage = this.add.container(x, y, [cave, label, web]).setDepth(9).setSize(112, 76);
    analytics.track("secret_portal_found", { worldId: "spider-lair", runNumber: this.runNumberInSession, playerLevel: save.profile.playerLevel });
    for (const obstacle of [...this.obstacles]) {
      if (distance(obstacle, this.secretSpiderPassage) >= 150) continue;
      obstacle.destroy();
      this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
    }
  }
  private drawWorldPassageMarkers(graphics: Phaser.GameObjects.Graphics) {
    this.worldPassages.forEach((passage) => {
      const world = worldById(passage.getData("destination") as string);
      graphics.fillStyle(world.accent, 0.95).fillRoundedRect(passage.x - 7, passage.y - 28, 15, 56, 6);
    });
  }
  private refreshWorldPassages(exits?: { side: "left" | "right"; y: number }) {
    if (this.currentWorld === "spider-lair") return;
    const availableTargets = this.currentWorld === "spider-lair" || this.currentWorld === "clover-garden" ? [] : this.availablePassageWorlds();
    const targets = this.currentWorld === "silent-abyss" && save.profile.abyssChallengeCompleted
      ? availableTargets.filter((world) => world.id === "ocean")
      : availableTargets;
    const targetIds = targets.map((world) => world.id).filter((id) => id !== "clover-garden").join(",");
    const current = this.worldPassages.map((item) => item.getData("destination") as string).join(",");
    if (!exits && current === targetIds && !(this.currentWorld === "silent-abyss" && save.profile.abyssChallengeCompleted && this.worldPortal?.active && !this.worldPassages.includes(this.worldPortal))) return;
    for (const passage of this.worldPassages) passage.destroy();
    if (this.currentWorld === "spider-lair" || this.currentWorld === "clover-garden") { this.worldPassages = []; return; }
    if (this.currentWorld === "silent-abyss" && save.profile.abyssChallengeCompleted && this.worldPortal?.active) {
      this.worldPortal.setPosition(B.arena.left + 90, this.worldPortal.y);
      this.worldPassages = [this.worldPortal];
      return;
    }
    this.worldPassages = targets.filter((world) => world.id !== "clover-garden").map((world, index) => {
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
  private refreshSecretSpiderPassage() {
    const unlocked = save.profile.bossesDefeated.includes("scorpion-king");
    if (this.currentWorld !== "green-valley") {
      this.secretSpiderPassage?.destroy(); this.secretSpiderPassage = undefined;
      return;
    }
    if (!this.secretSpiderPassage?.active) this.buildSpiderEntrance();
    const passage = this.secretSpiderPassage;
    if (!passage) return;
    passage.setData("unlocked", unlocked);
    const caveLabel = passage.getAt(1) as Phaser.GameObjects.Text;
    const entranceWeb = passage.getAt(2) as Phaser.GameObjects.Graphics;
    entranceWeb.setVisible(!unlocked);
    caveLabel.setText(unlocked ? "COVIL DA ARANHA · ENTRAR" : "COVIL? · DERROTE O ESCORPIÃO-REI");
    caveLabel.setColor(unlocked ? "#f0e6c8" : "#ded7c8");
    passage.setAlpha(unlocked ? 1 : 0.72);
    passage.setData("entryHint", unlocked
      ? "Passagem secreta para o Covil da Aranha."
      : "As teias escondem um covil. Derrote o Escorpião-Rei para revelar o caminho.");
  }
  private revealDesertExpeditionPortal() {
    if (this.currentWorld === "desert") this.refreshDesertExpeditionEntrance();
  }
  private refreshCloverPassage() {
    if (this.currentWorld !== "candy-world") { this.cloverPassage?.destroy(); this.cloverPassage = undefined; return; }
    if (this.cloverReturnPortalPosition) return;
    const isEntryWorld = true;
    if (!isEntryWorld) { if (!this.cloverReturnPortalPosition) { this.cloverPassage?.destroy(); this.cloverPassage = undefined; } return; }
    const skinUnlocked = save.profile.unlockedSkins.includes("abyssal-serpent");
    if (!skinUnlocked) { this.cloverPassage?.destroy(); this.cloverPassage = undefined; return; }
    const equipped = save.profile.selectedSkin === "abyssal-serpent";
    if (this.cloverPassage?.active) {
      this.cloverPassage.setData("unlocked", equipped);
      this.cloverPassage.setAlpha(equipped ? 1 : 0.72);
      const label = this.cloverPassage.getAt(1) as Phaser.GameObjects.Text;
      label.setText(equipped ? "JARDIM SECRETO · ENTRAR" : "INDISPONÍVEL — EQUIPE A SKIN SERPENTE ABISSAL");
      return;
    }
    const a = B.arena;
    const gardenArch = this.add.graphics();
    gardenArch.fillStyle(0x294b35, 0.92).fillRoundedRect(-34, -35, 68, 72, 28);
    gardenArch.fillStyle(0x72bd54, 0.92).fillRoundedRect(-25, -27, 50, 61, 22);
    gardenArch.fillStyle(0x152d3b, 0.94).fillEllipse(0, 1, 37, 51);
    gardenArch.lineStyle(5, 0x9bdf69, 0.95).strokeRoundedRect(-34, -35, 68, 72, 28);
    gardenArch.fillStyle(0xffe879).fillCircle(-30, -25, 5).fillStyle(0xf6a3d3).fillCircle(-35, -9, 5).fillStyle(0xffe879).fillCircle(31, -29, 5).fillStyle(0xf6a3d3).fillCircle(35, -8, 5);
    gardenArch.fillStyle(0x82cb53).fillEllipse(-25, 18, 19, 9).fillEllipse(25, 18, 19, 9);
    const label = this.add.text(0, 48, equipped ? "JARDIM SECRETO · ENTRAR" : "INDISPONÍVEL — EQUIPE A SKIN SERPENTE ABISSAL", { fontSize: "12px", color: "#e8ffd1", fontStyle: "bold", backgroundColor: "#24452fee", padding: { x: 8, y: 5 }, align: "center" }).setOrigin(0.5);
    this.cloverPassage = this.add.container((a.left + a.right) / 2, a.top + 52, [gardenArch, label]).setDepth(9).setAlpha(equipped ? 1 : 0.72);
    this.cloverPassage.setData("unlocked", equipped);
    this.tweens.add({ targets: gardenArch, scale: { from: 0.96, to: 1.04 }, alpha: { from: 0.78, to: 1 }, duration: 1050, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }
  private buildCloverGarden(g: Phaser.GameObjects.Graphics) {
    const a = B.arena, w = a.right - a.left, h = a.bottom - a.top;
    g.fillStyle(0x75a953, 0.28).fillEllipse(a.left + w / 2, a.top + h / 2, w * 0.72, h * 0.68);
    const label = this.add.text(a.left + w / 2, a.top + 80, "JARDIM DO TREVO ESQUECIDO", { fontSize: "22px", color: "#f0ffd8", fontStyle: "bold", backgroundColor: "#355b35bb", padding: { x: 12, y: 7 } }).setOrigin(0.5).setDepth(4);
    this.desertObjects.push(g, label);
    this.worldPortal?.destroy(); this.worldPortal = undefined;
  }
  private cloverGardenOrigin(): "candy-world" | "ocean" {
    return "candy-world";
  }
  private cloverGardenBossId() {
    return "candy-garden-guardian";
  }
  private showCloverGardenDefeat() {
    this.halted = true;
    this.pauseKind = "pause";
    this.resetControls();
    this.overlay = this.ui.modal(t("cloverDefeatTitle"), t("cloverDefeatBody"), [
      { label: t("continue"), run: () => this.continue() },
    ]);
  }
  private activateCloverGarden() {
    const bossId = this.cloverGardenBossId();
    this.worldPortal = undefined;
    this.cloverRevengePortal?.destroy(); this.cloverRevengePortal = undefined;
    const initData = (this.scene.settings.data ?? {}) as { cloverRevenge?: boolean };
    if (save.profile.cloverGardenBossesDefeated.includes(bossId) && initData.cloverRevenge !== true) {
      this.createCloverGardenRevengePortal();
    } else {
      this.openCloverGardenBossIntro();
    }
    if (save.profile.cloverGardenProgress >= 4) this.createCloverGardenExit();
  }
  private startCloverGardenBoss() {
    const a = B.arena;
    const boss = this.add.container(a.left + (a.right - a.left) * 0.68, a.top + (a.bottom - a.top) * 0.5).setDepth(19);
    const shell = this.add.graphics();
    shell.fillStyle(0x315d32).fillEllipse(-38, 32, 49, 31).fillEllipse(38, 32, 49, 31);
    shell.fillStyle(0x438d3e).fillEllipse(0, 7, 103, 81).lineStyle(7, 0x20532f).strokeEllipse(0, 7, 103, 81);
    shell.fillStyle(0xc9e88a).fillEllipse(0, 22, 61, 42).fillStyle(0x55a947).fillEllipse(-29, -25, 39, 37).fillEllipse(29, -25, 39, 37);
    shell.fillStyle(0xe6f6c5).fillCircle(-30, -29, 13).fillCircle(30, -29, 13).fillStyle(0x172b24).fillEllipse(-30, -28, 5, 9).fillEllipse(30, -28, 5, 9);
    shell.fillStyle(0x183e2b).fillCircle(-10, -3, 3).fillCircle(10, -3, 3);
    shell.lineStyle(5, 0x245b36).beginPath().arc(0, 8, 24, 0.18, Math.PI - 0.18).strokePath();
    shell.lineStyle(4, 0x326d37).lineBetween(-39, 39, -53, 51).lineBetween(-53, 51, -42, 53).lineBetween(39, 39, 53, 51).lineBetween(53, 51, 42, 53);
    shell.fillStyle(0xf6a2a0, 0.8).fillEllipse(-45, 4, 12, 7).fillEllipse(45, 4, 12, 7);
    boss.add(shell);
    boss.setData("gardenBoss", true); boss.setData("health", 4); boss.setData("attackTimer", 2.2);
    this.cloverGardenBoss = boss;
    this.bossFight.start(); this.bossFight.combat.bossId = this.cloverGardenBossId();
    this.updateBossHealthHud();
    this.bossCoinsTimer = 2;
    this.ui.toast("SAPO-REI: desvie do salto marcado e da língua puxadora; use a aura para atacar!");
  }
  private createCloverGardenExit() {
    this.worldPortal?.destroy();
    this.worldPortal = undefined;
    if (save.profile.cloverGardenProgress < 4) return;
    const exit = this.add.graphics().fillStyle(0x83cb54, 0.3).fillEllipse(0, 0, 80, 80).lineStyle(4, 0xb3ed75, 0.9).strokeEllipse(0, 0, 62, 62);
    const exitLabel = this.add.text(0, 47, "CANDY WORLD", { fontSize: "12px", color: "#f0ffd8", fontStyle: "bold" }).setOrigin(0.5);
    this.worldPortal = this.add.container(B.arena.left + 90, B.arena.top + (B.arena.bottom - B.arena.top) * 0.5, [exit, exitLabel]).setDepth(9);
  }
  private createCloverGardenRevengePortal() {
    if (this.cloverRevengePortal?.active) return;
    const icon = this.add.graphics().fillStyle(0x9bdf69, 0.22).fillCircle(0, 0, 37).lineStyle(4, 0xc5f58b).strokeCircle(0, 0, 29);
    const frog = this.add.graphics();
    frog.fillStyle(0x315d32).fillEllipse(-12, 15, 18, 12).fillEllipse(12, 15, 18, 12);
    frog.fillStyle(0x55a947).fillEllipse(0, 4, 34, 26);
    frog.fillStyle(0xc9e88a).fillEllipse(0, 9, 18, 13);
    frog.fillStyle(0x55a947).fillCircle(-10, -9, 10).fillCircle(10, -9, 10);
    frog.fillStyle(0xe6f6c5).fillCircle(-10, -10, 5).fillCircle(10, -10, 5);
    frog.fillStyle(0x172b24).fillCircle(-10, -10, 2).fillCircle(10, -10, 2);
    frog.lineStyle(2, 0x245b36).beginPath().arc(0, 3, 9, 0.15, Math.PI - 0.15).strokePath();
    const label = this.add.text(0, 44, "DESAFIAR SAPO-REI", { fontSize: "11px", color: "#f0ffd8", fontStyle: "bold" }).setOrigin(0.5);
    this.cloverRevengePortal = this.add.container((B.arena.left + B.arena.right) / 2, (B.arena.top + B.arena.bottom) / 2, [icon, frog, label]).setDepth(9);
  }
  private openCloverRevengeModal() {
    this.halted = true;
    this.bossIntroOpen = true;
    this.resetControls();
    this.overlay = this.ui.modal(t("cloverRevengeTitle"), t("cloverRevengeBody"), [
      { label: t("startFight"), run: () => {
        if (!this.bossIntroOpen || this.cloverGardenBoss || !this.scene.isActive()) return;
        this.overlay?.destroy(); this.overlay = undefined; this.bossIntroOpen = false;
        this.resetControls(); this.accumulator = 0;
        this.startCloverGardenBoss(); this.halted = false;
      } },
      { label: t("notNow"), run: () => {
        if (!this.bossIntroOpen) return;
        this.overlay?.destroy(); this.overlay = undefined; this.bossIntroOpen = false;
        this.cloverRevengePortalNeedsExit = true;
        this.resetControls(); this.accumulator = 0; this.halted = false;
      } },
    ]);
  }
  private openCloverGardenBossIntro() {
    this.halted = true;
    this.bossIntroOpen = true;
    this.resetControls();
    this.overlay = this.ui.modal(
      `${getLanguage() === "en" ? "Challenge" : "Desafio"}: SAPO-REI DO TREVO`,
      `O Sapo-Rei guarda os trevos do Jardim Secreto. Desvie do salto marcado e da língua puxadora; use a aura para atacar.\n\n${t("bossOptional")}`,
      [
        { label: t("bossStart"), run: () => {
          if (!this.bossIntroOpen || this.cloverGardenBoss || !this.scene.isActive()) return;
          this.overlay?.destroy(); this.overlay = undefined; this.bossIntroOpen = false;
          this.resetControls(); this.accumulator = 0;
          this.startCloverGardenBoss(); this.halted = false;
        } },
        { label: t("bossLater"), run: () => {
          if (!this.bossIntroOpen) return;
          this.overlay?.destroy(); this.overlay = undefined; this.bossIntroOpen = false;
          this.continue();
        } },
      ],
    );
  }
  private activateGardenAttackAura() {
    const bossId = this.cloverGardenBossId();
    if (!this.bossFight.combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId })) return;
    this.feedback(this.snake.x, this.snake.y, bossId === "candy-garden-guardian" ? "AURA ATIVA · TOQUE NO SAPO-REI" : "AURA ATIVA · TOQUE NO GUARDIÃO", 0xffdf6c, true);
    if (bossId === "candy-garden-guardian") this.cameras.main.flash(220, 255, 220, 110, false);
          this.updateAuraStatusHud();
    audio.play("power"); haptic("power");
  }
  private updateCloverGardenBoss(dt: number) {
    const boss = this.cloverGardenBoss;
    if (!boss?.active) return;
    this.bossFight.update(dt);
    const activeGardenCoins = this.bossPickups.filter((pickup) => pickup.kind === "boss-coin").length;
    if (this.bossCoinsTimer <= 0 && !this.bossFight.combat.active && activeGardenCoins < 4) {
      this.spawnBossPickup("boss-coin", 25, "●", 0xffd35a);
      this.bossCoinsTimer = 4;
    }
    this.bossCoinsTimer = Math.max(0, this.bossCoinsTimer - dt);
    const ocean = false;
    const currentAttack = boss.getData("attackState") as string | undefined;
    if (!ocean) {
      const vulnerability = Math.max(0, (boss.getData("vulnerabilityTimer") as number || 0) - dt);
      boss.setData("vulnerabilityTimer", vulnerability);
      boss.setAlpha(vulnerability > 0 && Math.floor(this.time.now / 100) % 2 === 0 ? 0.28 : 1);
    } else boss.setAlpha(1);
    if (!ocean) boss.rotation = 0;

    if (!ocean && currentAttack === "jump") {
      const duration = 0.72;
      const remaining = (boss.getData("attackTimer") as number) - dt;
      boss.setData("attackTimer", remaining);
      const progress = Phaser.Math.Clamp(1 - remaining / duration, 0, 1);
      const startX = boss.getData("jumpStartX") as number;
      const startY = boss.getData("jumpStartY") as number;
      const targetX = boss.getData("targetX") as number;
      const targetY = boss.getData("targetY") as number;
      boss.setPosition(
        Phaser.Math.Linear(startX, targetX, progress),
        Phaser.Math.Linear(startY, targetY, progress) - Math.sin(progress * Math.PI) * 105,
      );
      if (remaining <= 0) {
        boss.setPosition(targetX, targetY);
        const hit = this.snake.body.slice(0, this.snake.length).some((segment) => Math.hypot(segment.x - targetX, segment.y - targetY) < 108);
        this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = undefined;
        this.cameras.main.shake(260, 0.004);
        this.particles.explode(18, targetX, targetY);
        if (hit && !this.powers.invincible && !this.powers.ghostActive && !this.bossFight.combat.consumeProtectionHit(this.cloverGardenBossId()) && !this.powers.absorb()) {
          if (!this.loseLife()) { this.die(); return; }
          this.feedback(this.snake.x, this.snake.y, `ESMAGADO! −1 VIDA · ♥ ${this.powers.lives}`, 0xff7659, true);
        }
        if (hit) this.bossCollisionGrace = Math.max(this.bossCollisionGrace, 0.2);
        boss.setData("attackState", ""); boss.setData("attackTimer", 2.4); boss.setData("vulnerabilityTimer", 1.5);
        this.feedback(targetX, targetY, "PLOFT!", 0xa5e66d, true); audio.play("error"); haptic("power");
      }
    } else if (!ocean && currentAttack === "tongue") {
      const remaining = (boss.getData("attackTimer") as number) - dt;
      boss.setData("attackTimer", remaining);
      if (remaining <= 0) {
        const targetX = boss.getData("targetX") as number, targetY = boss.getData("targetY") as number;
        const dx = targetX - boss.x, dy = targetY - boss.y, lineLengthSquared = dx * dx + dy * dy || 1;
        const headProjection = Phaser.Math.Clamp(((this.snake.x - boss.x) * dx + (this.snake.y - boss.y) * dy) / lineLengthSquared, 0, 1);
        const headHit = Math.hypot(this.snake.x - (boss.x + headProjection * dx), this.snake.y - (boss.y + headProjection * dy)) < 38;
        const bodyHit = this.snake.body.slice(1, this.snake.length).some((segment) => {
          const projection = Phaser.Math.Clamp(((segment.x - boss.x) * dx + (segment.y - boss.y) * dy) / lineLengthSquared, 0, 1);
          return Math.hypot(segment.x - (boss.x + projection * dx), segment.y - (boss.y + projection * dy)) < 34;
        });
        this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = undefined;
        if ((headHit || bodyHit) && !this.powers.ghostActive && !this.powers.invincible && !this.bossFight.combat.consumeProtectionHit(this.cloverGardenBossId()) && !this.powers.absorb()) {
          if (headHit || this.snake.length <= B.snake.initial) {
            if (!this.loseLife()) { this.die(); return; }
            this.feedback(this.snake.x, this.snake.y, `PUXADO PELA LÍNGUA! −1 VIDA · ♥ ${this.powers.lives}`, 0xff7659, true);
          } else {
            this.snake.length = Math.max(B.snake.initial, this.snake.length - 1);
            this.feedback(this.snake.x, this.snake.y, "LÍNGUA! −1 SEGMENTO", 0xffa6bb, true);
          }
          this.bossCollisionGrace = Math.max(this.bossCollisionGrace, 0.2);
        }
        boss.setData("attackState", ""); boss.setData("attackTimer", 2.1);
      }
    }
    const attackTimer = (boss.getData("attackTimer") as number) - (currentAttack ? 0 : dt);
    boss.setData("attackTimer", attackTimer);
    if (attackTimer <= 1 && !boss.getData("telegraph") && !currentAttack) {
      boss.setData("telegraph", true);
      this.cloverGardenHazard?.destroy();
      const marker = this.add.graphics();
      let hx = boss.x, hy = boss.y;
      if (ocean) marker.lineStyle(7, 0x58e7ef, 0.85).strokeCircle(0, 0, 140);
      else if ((boss.getData("nextAttack") as string) === "tongue") {
        hx = this.snake.x; hy = this.snake.y;
        marker.lineStyle(12, 0xff6d9a, 0.28).lineBetween(boss.x, boss.y + 5, hx, hy)
          .lineStyle(5, 0xffa6bb, 0.95).lineBetween(boss.x, boss.y + 5, hx, hy)
          .fillStyle(0xff7195, 0.85).fillCircle(hx, hy, 32);
        boss.setData("targetX", hx); boss.setData("targetY", hy);
        this.feedback(boss.x, boss.y, "LÍNGUA! DESVIE!", 0xffa6bb, true);
      } else {
        hx = Phaser.Math.Clamp(this.snake.x, B.arena.left + 70, B.arena.right - 70);
        hy = Phaser.Math.Clamp(this.snake.y, B.arena.top + 70, B.arena.bottom - 70);
        marker.fillStyle(0xf1a7ff, 0.24).fillCircle(hx, hy, 92).lineStyle(7, 0xffdc72, 0.95).strokeCircle(hx, hy, 82);
        boss.setData("targetX", hx); boss.setData("targetY", hy);
        this.feedback(hx, hy, "SALTO! SAIA DA MARCA!", 0xffdc72, true);
      }
      const hazard = this.cloverGardenHazard = this.add.container(0, 0, [marker]).setDepth(10);
      if (!save.profile.settings.reducedMotion) this.tweens.add({ targets: hazard, alpha: 0.25, duration: 180, yoyo: true, repeat: 3 });
    }
    if (!currentAttack && attackTimer <= 0) {
      const distance = Math.hypot(this.snake.x - boss.x, this.snake.y - boss.y);
      if (!ocean) {
        const next = (boss.getData("nextAttack") as string) || "jump";
        boss.setData("nextAttack", next === "jump" ? "tongue" : "jump");
        boss.setData("attackState", next);
        boss.setData("telegraph", false);
        if (next === "jump") {
          boss.setData("jumpStartX", boss.x); boss.setData("jumpStartY", boss.y); boss.setData("attackTimer", 0.72);
          this.cloverGardenHazard?.destroy();
          const targetX = boss.getData("targetX") as number, targetY = boss.getData("targetY") as number;
          const marker = this.add.graphics().fillStyle(0xf1a7ff, 0.26).fillCircle(targetX, targetY, 92)
            .lineStyle(8, 0xffdc72, 0.95).strokeCircle(targetX, targetY, 82).setDepth(10);
          this.cloverGardenHazard = this.add.container(0, 0, [marker]).setDepth(10);
        } else {
          boss.setData("attackTimer", 0.28);
          const tongue = this.add.graphics().lineStyle(14, 0xc33165, 1).lineBetween(boss.x, boss.y + 7, boss.getData("targetX") as number, boss.getData("targetY") as number)
            .lineStyle(7, 0xff779c, 1).lineBetween(boss.x, boss.y + 7, boss.getData("targetX") as number, boss.getData("targetY") as number).setDepth(10);
          this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = this.add.container(0, 0, [tongue]).setDepth(10);
        }
        audio.play("power"); haptic("coin");
        return;
      }
      const hit = distance < 140;
      const auraBlocked = hit && this.bossFight.combat.consumeProtectionHit(this.cloverGardenBossId());
      if (hit && !auraBlocked && this.bossCollisionGrace <= 0 && !this.powers.invincible && !this.powers.ghostActive && !this.powers.absorb()) {
        if (!this.loseLife()) { this.die(); return; }
        this.feedback(this.snake.x, this.snake.y, ocean ? "ONDA! −1 VIDA" : "INVESTIDA! −1 VIDA", 0xff7659, true);
      }
      if (hit) this.bossCollisionGrace = 0.8;
      this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = undefined;
      boss.setData("telegraph", false); boss.setData("attackTimer", ocean ? 3.4 : 2.6);
    }
    const auraActive = this.bossFight.combat.active && this.bossFight.combat.bossId === this.cloverGardenBossId() && this.bossFight.combat.remainingHits > 0;
    const vulnerable = ocean || (boss.getData("vulnerabilityTimer") as number || 0) > 0;
    if (auraActive && vulnerable && Math.hypot(this.snake.x - boss.x, this.snake.y - boss.y) < 78 && this.bossFight.combat.hitInvulnerability <= 0 && this.bossFight.combat.consumeHit(this.cloverGardenBossId())) {
      const health = Math.max(0, (boss.getData("health") as number) - 1);
      boss.setData("health", health);
      this.updateBossHealthHud();
      this.tweens.add({ targets: boss, alpha: 0.35, duration: 80, yoyo: true, repeat: 2 });
      const hitDx = this.snake.x - boss.x, hitDy = this.snake.y - boss.y;
      const hitDistance = Math.hypot(hitDx, hitDy) || 1;
      this.tweens.add({ targets: boss, x: boss.x + hitDx / hitDistance * 24, y: boss.y + hitDy / hitDistance * 24, duration: 130, yoyo: true, ease: "Sine.easeOut" });
      this.feedback(boss.x, boss.y, "−1 HP", 0xffdf6c, true); audio.play("power"); haptic("power");
      if (health <= 0) {
        const bossId = this.cloverGardenBossId();
        const defeatedFrogKing = bossId === "candy-garden-guardian";
        const firstVictory = !save.profile.cloverGardenBossesDefeated.includes(bossId);
        if (firstVictory) save.profile.cloverGardenBossesDefeated.push(bossId);
        boss.destroy(); this.cloverGardenBoss = undefined;
        this.updateBossHealthHud();
        this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = undefined;
        if (defeatedFrogKing) {
          this.bossPickups.filter((pickup) => pickup.kind === "crown-orb").forEach((pickup) => pickup.image.destroy());
          this.bossPickups = this.bossPickups.filter((pickup) => pickup.kind !== "crown-orb");
          this.dropBossCoins(15, boss.x, boss.y);
          this.feedback(boss.x, boss.y, firstVictory ? "SAPO REI ELIMINADO" : "SAPO-REI DERROTADO NOVAMENTE", 0xbaff78, true);
        }
        this.bossFight.finish();
        this.updateBossHealthHud();
        this.cloverRevengePortal?.destroy(); this.cloverRevengePortal = undefined;
        if (firstVictory && save.profile.cloverGardenProgress < 4) {
          this.worldPortal?.destroy();
          this.worldPortal = undefined;
        } else this.createCloverGardenExit();
        if (defeatedFrogKing) this.createCloverGardenRevengePortal();
        void save.save();
        if (defeatedFrogKing && firstVictory) this.showCloverGardenDefeat();
      }
    }
  }
  private updateCloverGarden(previousSnakePosition: Point = this.snake) {
    const a = B.arena;
    let originProgress = save.profile.cloverGardenProgress;
    const spots = [
      { x: a.left + 230, y: a.top + 220 }, { x: a.right - 260, y: a.top + 250 },
      { x: a.left + 260, y: a.bottom - 260 }, { x: a.right - 250, y: a.bottom - 230 },
    ];
    while (this.cloverObjects.length < 4) {
      const index = this.cloverObjects.length, spot = spots[index];
      const graphic = this.add.graphics().fillStyle(0x5cae38).fillCircle(-8, -3, 9).fillCircle(8, -3, 9).fillCircle(0, -12, 9).fillStyle(0xffdf6c).fillCircle(0, 7, 5).lineStyle(2, 0xeaffb1).strokeCircle(0, -5, 19);
      const clover = this.add.container(spot.x, spot.y, [graphic]).setDepth(8);
      clover.setData("cloverIndex", index); this.cloverObjects.push(clover);
      this.tweens.add({ targets: clover, y: spot.y - 12, duration: 820 + index * 90, yoyo: true, repeat: -1, ease: "Sine.InOut", delay: index * 110 });
    }
    const collected = new Set(save.profile.cloverGardenCollected);
    for (const clover of this.cloverObjects) {
      const index = clover.getData("cloverIndex") as number;
      const unlocked = save.profile.cloverGardenBossesDefeated.includes(this.cloverGardenBossId());
      if (!unlocked) { clover.setVisible(false); continue; }
      if (collected.has(index)) { clover.setVisible(false); continue; }
      clover.setVisible(true);
      const dx = this.snake.x - previousSnakePosition.x;
      const dy = this.snake.y - previousSnakePosition.y;
      const travelSquared = dx * dx + dy * dy;
      const t = travelSquared > 0
        ? Phaser.Math.Clamp(((clover.x - previousSnakePosition.x) * dx + (clover.y - previousSnakePosition.y) * dy) / travelSquared, 0, 1)
        : 0;
      const closestX = previousSnakePosition.x + dx * t;
      const closestY = previousSnakePosition.y + dy * t;
      if (!this.cloverGardenBoss && Math.hypot(clover.x - closestX, clover.y - closestY) < 64) {
        collected.add(index);
        save.profile.cloverGardenCollected = [...collected].sort((left, right) => left - right);
        originProgress = Math.min(4, save.profile.cloverGardenCollected.length);
        save.profile.cloverGardenProgress = originProgress;
        save.profile.cloverGardenProgressByOrigin["candy-world"] = originProgress;
        save.profile.cloverGardenProgressByOrigin.ocean = 0;
        clover.setVisible(false); void save.save(); audio.play("power"); haptic("power");
        if (save.profile.cloverGardenProgress === 4) {
          if (!save.profile.unlockedPets.includes("lucky-leprechaun")) save.profile.unlockedPets.push("lucky-leprechaun");
          this.feedback(clover.x, clover.y, "DUENDE DA SORTE DESBLOQUEADO!", 0x9be15d, true); void save.save();
        } else this.feedback(clover.x, clover.y, `TREVO ${originProgress}/4`, 0x9be15d, true);
        if (originProgress === 4) this.createCloverGardenExit();
      }
    }
  }
  private createCloverReturnPortal() {
    const position = this.cloverReturnPortalPosition;
    if (!position || this.currentWorld !== "candy-world") return;
    const portal = this.add.graphics().fillStyle(0x83cb54, 0.28).fillEllipse(0, 0, 72, 72).lineStyle(4, 0xb3ed75, 0.8).strokeEllipse(0, 0, 56, 56);
    const label = this.add.text(0, 44, "JARDIM CONCLUÍDO", { fontSize: "11px", color: "#f0ffd8", fontStyle: "bold" }).setOrigin(0.5);
    this.cloverPassage?.destroy();
    this.cloverPassage = undefined;
    this.cloverPassage = this.add.container(position.x, position.y, [portal, label]).setDepth(9);
    this.cloverPassage.setData("gardenCompleted", true);
  }
  private enterWorld(id: string, sourceSide: "left" | "right" | "abyss", sourceY: number, direction: number) {
    if (this.worldTransitioning) return;
    if (id === "desert-labyrinth") { this.ui.toast("Labirinto do Deserto · Em breve."); return; }
    if (this.currentWorld === "spider-lair" && id === "green-valley"
      && !save.profile.bossesDefeated.includes("spider-queen")) {
      this.ui.toast("A teia bloqueia a saída. Derrote a Aranha Real para escapar do Covil!");
      return;
    }
    if (id === "clover-garden") { this.ui.toast("Entre pelo portal secreto no Candy World."); return; }
    this.worldTransitioning = true;
    if (this.currentWorld === "desert-labyrinth" && id === "desert-labyrinth") {
      for (const obstacle of [...this.obstacles]) { obstacle.destroy(); this.obstacles.splice(this.obstacles.indexOf(obstacle), 1); }
      for (const object of this.desertObjects) { this.tweens.killTweensOf(object); object.destroy(); }
      this.desertObjects = [];
      this.worldPassages = [];
      this.currentWorld = "desert-labyrinth";
      this.buildDesertLabyrinth(this.worldArenaGraphics!);
      save.profile.desertExpeditionActive = true;
      void save.save();
      this.showDesertExpeditionIntro();
      this.updateCamera(0, true); this.renderSnake();
      this.passageCooldown = 0.75; this.worldTransitioning = false;
      return;
    }
    if (this.currentWorld === "clover-garden") {
      this.cloverPassage?.destroy(); this.cloverPassage = undefined;
      for (const clover of this.cloverObjects) clover.destroy();
      this.cloverObjects = [];
      for (const pickup of this.bossPickups) pickup.image.destroy();
      this.bossPickups = [];
      this.cloverGardenBoss?.destroy(); this.cloverGardenBoss = undefined;
      this.cloverGardenHazard?.destroy(); this.cloverGardenHazard = undefined;
      this.bossFight.destroy();
    }
    const world = worldById(id);
    if (this.cloverPassage) { this.cloverPassage.destroy(); this.cloverPassage = undefined; }
    if (this.currentWorld === "spider-lair" || world.id === "spider-lair") {
      this.freezePortal?.destroy(); this.freezePortal = undefined;
      this.freezeReward?.destroy(); this.freezeReward = undefined;
      for (const obstacle of this.obstacles) obstacle.destroy();
      this.obstacles = [];
      for (const web of this.spiderWebZones) web.graphic.destroy();
      this.spiderWebZones = [];
      this.spiderWebSlow = 1;
    }
    if (this.currentWorld !== "silent-abyss") { this.worldPortal?.destroy(); this.worldPortal = undefined; }
    this.bossFight.destroy();
    this.freezePortal?.destroy(); this.freezePortal = undefined;
    this.freezeReward?.destroy(); this.freezeReward = undefined;
    this.bossPickups.forEach((pickup) => pickup.image.destroy()); this.bossPickups = [];
    this.bossMarkers.forEach((marker) => marker.destroy()); this.bossMarkers = [];
    this.abyssPortal?.destroy(); this.abyssPortal = undefined;
    for (const passage of this.worldPassages) passage.destroy();
    this.worldPassages = [];
    this.stickyGraphics?.destroy(); this.stickyGraphics = undefined;
    this.stickyZones = []; this.stickySpeed = 1;
    this.secretSpiderPassage?.destroy(); this.secretSpiderPassage = undefined;
    this.bossPortal?.destroy(); this.bossPortal = undefined;
    this.krakenBarrier?.destroy(); this.krakenBarrier = undefined;
    this.desertArenaBarrier?.destroy(); this.desertArenaBarrier = undefined;
    this.scorpionArenaClosed = false;
    this.desertBarrierCooldown = 0;
    this.krakenReturnAngle = undefined; this.krakenReturnTimer = 0;
    this.bossDefinition = undefined;
    this.bossPortalExpiresAt = 0;
    const previousWorld = this.currentWorld;
    const timeInPreviousWorld = Math.max(0, Math.round((this.run.elapsed - this.worldEnteredAt) * 100) / 100);
    if (this.runStarted) analytics.track("world_exited", { worldId: previousWorld, timeSpentSeconds: timeInPreviousWorld });
    this.currentWorld = world.id;
    this.worldEntryType = previousWorld === "green-valley" && world.id === "spider-lair" ? "secret_portal" : world.id === "green-valley" ? "return" : "normal_portal";
    this.worldEnteredAt = this.run.elapsed;
    this.visitedWorlds.add(world.id);
    const secretWorld = worldById(world.id).category === "SECRET";
    if (secretWorld && !this.secretWorldsVisited.has(world.id)) {
      if (this.runStarted) analytics.track("secret_world_discovered", { worldId: world.id, runNumber: this.runNumberInSession, playerLevel: save.profile.playerLevel });
      this.secretWorldsVisited.add(world.id);
    }
    if (this.runStarted) analytics.track("world_entered", { worldId: world.id, entryType: secretWorld ? "secret_portal" : this.worldEntryType });
    this.abyssChallengeTimer?.remove(); this.abyssChallengeTimer = undefined;
    void applyWorldOrientation(world.id, save.profile.settings.orientation);
    const arena = B.arena;
    const entrySide = sourceSide === "abyss" ? "left" : sourceSide === "left" ? "right" : "left";
    const spiderReturn = id === "green-valley" && previousWorld === "spider-lair";
    const spiderArrival = id === "spider-lair";
    const spiderWeb = this.spiderExitWeb;
    if (spiderReturn && spiderWeb) {
      this.tweens.killTweensOf(spiderWeb);
      spiderWeb.destroy();
      this.spiderExitWeb = undefined;
    }
    const abyssReturn = id === "ocean" && sourceSide === "abyss" && previousWorld === "silent-abyss";
    const desertLabyrinthArrival = id === "desert-labyrinth";
    const labyrinthEntry = desertLabyrinthArrival ? this.desertLabyrinthEntry() : undefined;
    const entryX = desertLabyrinthArrival ? labyrinthEntry!.x
      : spiderReturn ? arena.right - 140
      : spiderArrival ? arena.left + 90
      : abyssReturn ? (arena.left + arena.right) / 2
      : (entrySide === "left" ? arena.left + 48 : arena.right - 48);
    const entryY = desertLabyrinthArrival ? labyrinthEntry!.y
      : spiderReturn ? arena.top + 140
      : spiderArrival ? arena.top + 180
      : abyssReturn ? arena.bottom - 100
      : Phaser.Math.Clamp(sourceY, arena.top + 100, arena.bottom - 100);
    const entryDirection = spiderArrival ? Math.PI / 2 : spiderReturn ? Math.PI : abyssReturn ? -Math.PI / 2 : direction;
    this.snake.reset(entryX, entryY, entryDirection);
    this.steering.reset(entryDirection);
    this.resetControls();
    this.cameraX = entryX;
    this.cameraY = entryY;
    for (const decoration of this.oceanDecorations) this.tweens.killTweensOf(decoration);
    for (const object of new Set([...this.oceanObjects, ...this.oceanDecorations])) object.destroy();
    this.oceanObjects = []; this.oceanDecorations = []; this.oceanCurrents = []; this.oceanCorals = []; this.currentGraphics = undefined;
    if (this.clam) this.tweens.killTweensOf(this.clam.image);
    this.currentZoneId = undefined; this.deepTrenchActive = false;
    this.pearlTimer = OW.pearlCooldown;
    for(const obstacle of this.obstacles) obstacle.destroy();
    this.obstacles=[];
    this.abyssMovingObstacles = [];
    this.abyssObstacleTimer = 0;
    for (const coin of this.coins) coin.hide();
    this.stickyZones=[]; this.stickySpeed=1; this.stickyGraphics=undefined;
    for (const object of this.desertObjects) { this.tweens.killTweensOf(object); object.destroy(); }
    this.desertObjects=[]; this.desertGustZones=[]; this.desertGustGraphics=undefined;
    this.desertRouteCoins = [];
    this.candyCoinSpawned=false; this.candyCoinTimer=CW.candyCoin.opportunitySeconds;
    for(const object of this.candyWorldObjects)object.destroy();
    this.candyWorldObjects=[];
    this.worldSpeedMultiplier = world.speedMultiplier;
    if (world.id !== "green-valley" && world.id !== "spider-lair" && world.id !== "clover-garden") {
      save.profile.worldsUnlocked = [...new Set([...save.profile.worldsUnlocked, world.id])];
    }
    if (world.id !== "spider-lair" && world.id !== "clover-garden") rememberWorld(save.profile, world.id);
    this.run.portalsUsed++;
    awardAchievement(save.profile, "world-traveler");
    this.cameras.main.setBackgroundColor(world.background);
    const arenaGraphics = this.worldArenaGraphics = this.add.graphics().setDepth(-10);
    const arenaColor = world.id === "silent-abyss" ? 0x09111e : world.id === "spider-lair" ? 0x171923 : world.id === "desert" ? 0x996136 : 0x9ac582;
    arenaGraphics.fillStyle(arenaColor).fillRoundedRect(arena.left - 5, arena.top - 5, arena.right - arena.left + 10, arena.bottom - arena.top + 10, 30);
    arenaGraphics.fillStyle(world.ground).fillRoundedRect(arena.left, arena.top, arena.right - arena.left, arena.bottom - arena.top, 24);
    if (world.id !== "silent-abyss" && world.id !== "spider-lair") this.drawWorldPassageMarkers(arenaGraphics);
    for (let index = 0; index < 650; index++) {
      const x = arena.left + 22 + ((index * 73) % (arena.right - arena.left - 44));
      const y = arena.top + 22 + ((index * 137) % (arena.bottom - arena.top - 44));
      const candy = world.id === "candy-world", ocean = world.id === "ocean", abyss = world.id === "silent-abyss", spider = world.id === "spider-lair", desert = world.id === "desert", clover = world.id === "clover-garden";
      const color = clover ? (index % 3 ? 0x75a953 : 0xb5d866) : spider ? (index % 3 ? 0x55435f : 0xb98bd5) : abyss ? (index % 3 ? 0x31556a : 0x397e78) : desert ? (index % 3 ? 0xc58945 : 0xf1ca79) : ocean ? (index % 3 ? 0xb5dfe1 : 0xd3e5c8) : candy ? (index % 3 ? 0xf5b8d8 : 0xffd6a5) : (index % 3 ? 0xbbd09e : 0xcbdca9);
      arenaGraphics.fillStyle(color, spider || abyss ? 0.2 : desert ? 0.42 : ocean ? 0.24 : 0.55).fillEllipse(x, y, 5 + index % 4, 3);
    }
    if(world.id==="candy-world") this.buildCandyWorld(this.add.graphics().setDepth(1));
    if (world.id === "green-valley" && spiderReturn) this.buildSpiderEntrance();
    if(world.id==="ocean") {
      this.buildOceanWorld(this.add.graphics().setDepth(1));
      this.spawnOceanCorals();
      this.pearlTimer = OW.pearlCooldown;
    }
    if(world.id==="silent-abyss") {
      this.abyssChallengeElapsed = 0;
      this.buildSilentAbyss(arenaGraphics);
      if (!save.profile.abyssChallengeCompleted) {
        this.abyssObstacleTimer = 5 + Math.random() * 4;
        this.spawnAbyssObstacles(16);
        const timer = document.createElement("div");
        timer.id = "abyss-timer"; timer.className = "world-tag"; timer.textContent = "DESAFIO · 90s";
        timer.setAttribute("role", "timer");
        timer.setAttribute("aria-label", "Desafio do Abismo: faltam 90 segundos");
        this.ui.root.append(timer); this.abyssChallengeTimer = timer;
      }
    }
    if(world.id==="desert") {
      this.desertRouteCoins = [];
      this.buildDesertWorld(this.add.graphics().setDepth(1));
      this.spawnDesertRuins();
      this.createDesertArenaBarrier();
      this.refreshDesertExpeditionEntrance();
    }
    if (world.id === "spider-lair") {
      this.worldPassages = [];
      this.buildSpiderLair(this.add.graphics().setDepth(1));
      this.stickyGraphics = this.add.graphics().setDepth(4);
      this.stickyZones = [];
      this.stickySpeed = 1;
      for (const coin of this.coins) coin.hide();
    }
    if (this.currentWorld !== "desert-labyrinth") for (const obstacle of [...this.obstacles]) {
      if (!this.candyWorldObjects.some((object) => object === obstacle.image)) continue;
      obstacle.destroy();
      this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
    }
    if (world.id !== "ocean") for (const coin of this.coins) if (coin.active && coin.kind.id === "pearl_coin") coin.hide();
    this.fillCoins(B.difficulty.initialCoins);
    for (const obstacle of this.obstacles) if ("setTint" in obstacle.image) obstacle.image.setTint(world.accent);
    this.ui.get("#world-tag").textContent = world.name.toUpperCase();
    this.ui.get<HTMLElement>("#world-tag").style.backgroundColor = "transparent";
    this.createCloverReturnPortal();
    if (this.runStarted) analytics.track("portal_entered", { portalType: "world", destinationWorld: world.id });
    if (this.runStarted && !this.firstPortalEntered) { this.firstPortalEntered = true; analytics.track("first_portal_entered", { destinationWorld: world.id }); }
    void save.save();
    if (world.id === "ocean" && !save.profile.hints.ocean) {
      save.profile.hints.ocean = true;
      void save.save();
    }
    if (world.id === "desert" && !save.profile.hints.desertGust) {
      save.profile.hints.desertGust = true;
      void save.save();
    }
    if (world.id !== "spider-lair") this.ui.worldArrival(world.id, world.name);
    if (world.id !== "spider-lair") {
      this.worldPortal?.destroy();
      this.worldPortal = undefined;
    }
    this.refreshWorldPassages({ side: entrySide, y: entryY });
    this.refreshSecretSpiderPassage();
    if (world.id === "candy-world" || world.id === "ocean") this.refreshCloverPassage();
    if (world.id === "ocean") {
      this.revealAbyssPortal();
      if (abyssReturn) this.abyssPortalNeedsExit = true;
    }
    if (world.id === "desert") this.refreshDesertExpeditionEntrance();
    if (world.id === "desert-labyrinth") {
      this.worldPassages = [];
      this.buildDesertLabyrinth(this.worldArenaGraphics!);
      this.bossPortal = undefined; this.bossDefinition = undefined;
      save.profile.desertExpeditionActive = true;
      void save.save();
      this.showDesertExpeditionIntro();
    }
    this.updateCamera(0, true);
    this.renderSnake();
    this.passageCooldown = 0.75;
    if (world.id === "spider-lair") this.powers.invincible = Math.max(this.powers.invincible, 1.25);
    this.worldTransitioning = false;
    if (world.id !== "spider-lair" && world.bossId && bosses.some((boss) => boss.id === world.bossId))
      this.spawnBossPortal(world.bossId);
    if (world.id === "spider-lair") {
      const spiderQueenDefeated = save.profile.bossesDefeated.includes("spider-queen");
      if (spiderQueenDefeated) return;
      this.halted = true;
      this.resetControls();
        this.overlay = this.ui.modal(
          t("spiderIntroTitle"),
          t("spiderIntroBody"),
          [{ label: t("continue"), run: () => {
          this.continue();
          if (!spiderQueenDefeated && this.currentWorld === "spider-lair" && !this.boss && world.bossId) {
            const spiderBoss = bosses.find((boss) => boss.id === world.bossId);
            if (spiderBoss) this.startBoss(spiderBoss);
          }
        } }],
      );
    }
  }
  private refreshDesertExpeditionEntrance() {
    if (this.currentWorld !== "desert" || !save.profile.bossesDefeated.includes("scorpion-king")) return;
    const entrance = this.desertObjects.find((object) => object instanceof Phaser.GameObjects.Container && object.getData("desertExpeditionEntry")) as Phaser.GameObjects.Container | undefined;
    if (entrance) return;
    const ruins = desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "ruins")!;
    const portal = this.add.graphics().fillStyle(0x3a1f12, 0.48).fillEllipse(0, 0, 120, 132).lineStyle(7, 0xf2a94d, 0.92).strokeEllipse(0, 0, 92, 104);
    const rune = this.add.text(0, -5, "⌘", { fontSize: "47px", color: "#ffdc8b" }).setOrigin(0.5);
    const label = this.add.text(0, 70, "LABIRINTO · EM BREVE", { fontSize: "13px", color: "#fff0ca", fontStyle: "bold", backgroundColor: "#50341dcc", padding: { x: 6, y: 3 } }).setOrigin(0.5);
    const passage = this.add.container(ruins.x, ruins.y, [portal, rune, label]).setDepth(9).setSize(120, 120);
    passage.setData("desertExpeditionEntry", true);
    passage.setData("unlocked", false);
    passage.setData("interactive", false);
    this.desertObjects.push(passage);
    this.tweens.add({ targets: passage, alpha: { from: 0.7, to: 1 }, scale: { from: 0.96, to: 1.06 }, yoyo: true, repeat: -1, duration: 850 });
  }
  private spawnBossPortal(bossId: string) {
    if (this.bossPortal || this.dead) return;
    if (this.run.bossEnergy < this.bossEnergyRequirement(bossId)) return;
    const arenaRegion = bossId === "kraken" ? oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "kraken_arena") : bossId === "scorpion-king" ? desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "scorpion_arena") : undefined;
    const p = bossId === "kraken" || bossId === "scorpion-king"
      ? this.validPoint(100, 180, true, {
          center: arenaRegion!,
          radius: Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * (bossId === "kraken" ? OW.krakenArena.radius : DW.scorpionArena.radius),
          clearance: bossId === "kraken" ? 90 : 120,
        })
      : this.validPoint(100, 180, true);
    if (!p) return;
    const g = this.add.graphics().fillStyle(0x713c9c, 0.28).fillEllipse(0, 0, 110, 140).lineStyle(8, 0x9d5ac7).strokeEllipse(0, 0, 86, 118);
    const t = this.add.text(0, 76, "BOSS · OPCIONAL", { fontSize: "16px", color: "#43255b", fontStyle: "bold" }).setOrigin(0.5);
    this.bossPortal = this.add.container(p.x, p.y, [g, t]).setDepth(9);
    this.bossDefinition = bosses.find((boss) => boss.id === bossId);
    this.bossPortalExpiresAt = this.run.elapsed + 25;
    if (this.runStarted) analytics.track("portal_spawned", { portalType: "boss", destinationWorld: this.currentWorld, bossId });
  }
  private bossEnergyRequirement(bossId = worldById(this.currentWorld).bossId) {
    if (bossId === "spider-queen") return 0;
    return bossId === "king-snake"
      ? B.boss.greenValleyEnergyRequired
      : bossId === "candy-monster"
        ? B.boss.candyWorldEnergyRequired
        : bossId === "kraken" ? B.boss.oceanEnergyRequired
        : bossId === "scorpion-king" ? B.boss.desertEnergyRequired
        : B.boss.defaultEnergyRequired;
  }
  private startBoss(definition: BossDefinition) {
    this.bossPortal?.destroy(); this.bossPortal = undefined;
    this.bossPortalExpiresAt = 0;
    if (this.auraStatusHud) this.auraStatusHud.hidden = true;
    for (const passage of this.worldPassages) passage.setVisible(false);
    const isKraken = definition.id === "kraken";
    const isScorpionKing = definition.id === "scorpion-king";
    const isSpiderQueen = definition.id === "spider-queen";
    this.bossFight.start();
    this.bossStartedAt = this.run.elapsed;
    this.bossDamageTaken = 0;
    this.completedBossCount = 0;
    this.attemptedBossCount = 0;
    this.bossAttempts[definition.id] = (this.bossAttempts[definition.id] ?? 0) + 1;
    this.attemptedBossCount++;
    if (this.runStarted) analytics.track("boss_started", { bossId: definition.id, worldId: this.currentWorld, playerLevel: save.profile.playerLevel, snakeLength: this.snake.length, attemptNumber: this.bossAttempts[definition.id] });
    if (this.runStarted) analytics.track("portal_entered", { portalType: "boss", destinationWorld: this.currentWorld, bossId: definition.id });
    this.bossCollisionGrace = 0;
    const initialX = isKraken
      ? B.arena.left + (B.arena.right - B.arena.left) * OW.krakenArena.x
      : isScorpionKing ? B.arena.left + (B.arena.right - B.arena.left) * 0.72
      : isSpiderQueen ? B.arena.left + (B.arena.right - B.arena.left) * 0.5
      : this.snake.x + 240;
    const initialY = isKraken
      ? B.arena.top + (B.arena.bottom - B.arena.top) * OW.krakenArena.y
      : isScorpionKing || isSpiderQueen ? B.arena.top + (B.arena.bottom - B.arena.top) * 0.5
      : this.snake.y;
    const isKingSnake = definition.id === "king-snake";
    const isCandyBee = definition.id === "candy-monster";
    if (isKraken) this.createKrakenBarrier();
    if (isScorpionKing) {
      if (!this.desertArenaBarrier?.active) this.createDesertArenaBarrier();
      this.scorpionArenaClosed = false;
      this.clearScorpionPoisonPuddles();
    }
    const image = isKraken
      ? this.createKraken(initialX, initialY)
      : isKingSnake
      ? this.add.image(initialX, initialY, "king-snake-head").setScale(1.05).setDepth(19)
        : isSpiderQueen
          ? this.createSpiderQueen(initialX, initialY)
        : isScorpionKing
        ? this.createScorpionKing(initialX, initialY)
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
    const initialState = definition.id === "kraken" || isSpiderQueen ? "IDLE" : "CHASE";
    const preference = this.gameDifficulty;
    const attackCooldown = bossAttackTiming(definition.combat.attackCooldown, preference, 1.5);
    this.boss = { definition, health: definition.maxHealth, phase: 0, attack: attackCooldown, speed: bossMovementSpeed(definition.movementSpeed, preference), image, bodySegments, trail, visualAngle: 0, lastVisualX: initialX, lastVisualY: initialY, state: initialState, stateTimer: attackCooldown, targetX: this.snake.x, targetY: this.snake.y, chargeX: 0, chargeY: 0, doubleCharge: 0, krakenTentacles: isKraken && image instanceof Phaser.GameObjects.Container ? image.getData("tentacles") as Phaser.GameObjects.Graphics[] : undefined, krakenSuckers: isKraken && image instanceof Phaser.GameObjects.Container ? image.getData("suckers") as Phaser.GameObjects.Graphics[] : undefined, krakenTentacleTimers: isKraken ? Array(8).fill(0) as number[] : undefined, scorpionTail: isScorpionKing && image instanceof Phaser.GameObjects.Container ? image.getData("scorpionTail") as Phaser.GameObjects.Container : undefined };
    if (isSpiderQueen) this.createSpiderArena();
    this.bossHud!.hidden = false;
    if (this.bossEnergyHud) this.bossEnergyHud.hidden = true;
    this.updateBossHealthHud();
    this.bossFight.active = true;
    if (isSpiderQueen && this.bossEnergyHud) this.bossEnergyHud.hidden = true;
    this.bossCoinsTimer = 2;
    if (isSpiderQueen) {
      this.bossCoinsTimer = Number.POSITIVE_INFINITY;
      this.spiderBossCoinTimer = 1.2;
      this.spiderWebTimer = 5;
      this.spiderStalactiteFalling = false;
      this.spiderStalactiteReady = false;
    }
    this.updateAuraStatusHud();
    if (!isKingSnake && !isCandyBee && !isKraken && !isScorpionKing) image.setSize(210, 210);
  }
  private createKrakenBarrier() {
    this.krakenBarrier?.destroy();
    const arena = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "kraken_arena")!;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * OW.krakenArena.radius;
    const water = this.add.graphics().fillStyle(0x22c5d5, 0.09).fillCircle(0, 0, radius - 18)
      .lineStyle(18, 0x42d5df, 0.12).strokeCircle(0, 0, radius - 28);
    const rim = this.add.graphics()
      .lineStyle(25, 0x163f55, 0.88).beginPath().arc(0, 0, radius, 0.32, Math.PI * 2 - 0.32).strokePath()
      .lineStyle(15, 0x39879a, 0.96).beginPath().arc(0, 0, radius, 0.32, Math.PI * 2 - 0.32).strokePath()
      .lineStyle(4, 0x9be8df, 0.82).beginPath().arc(0, 0, radius - 9, 0.32, Math.PI * 2 - 0.32).strokePath();
    const gate = this.add.graphics()
      .lineStyle(25, 0x163f55, 0.88).beginPath().arc(0, 0, radius, -0.32, 0.32).strokePath()
      .lineStyle(15, 0x39879a, 0.96).beginPath().arc(0, 0, radius, -0.32, 0.32).strokePath()
      .lineStyle(4, 0x9be8df, 0.82).beginPath().arc(0, 0, radius - 9, -0.32, 0.32).strokePath();
    for (let index = 0; index < 24; index++) {
      const angle = index * Math.PI * 2 / 24;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      const size = index % 3 === 0 ? 17 : 12;
      rim.fillStyle(index % 2 ? 0x547f79 : 0x39778a, 0.96)
        .fillRoundedRect(x - size / 2, y - size / 1.5, size, size * 1.5, 5)
        .fillStyle(index % 2 ? 0xff937f : 0xffc284, 0.9)
        .fillCircle(x, y + size * 0.35, 4);
    }
    this.krakenBarrierGate = gate;
    this.krakenBarrier = this.add.container(arena.x, arena.y, [water, rim, gate]).setDepth(4);
    this.tweens.add({ targets: water, alpha: 0.5, duration: 850, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: rim, alpha: 0.78, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
  private createSpiderArena() {
    this.spiderArena?.destroy();
    this.spiderArenaOpen = false;
    const { left, right, top, bottom } = B.arena;
    const centerX = left + (right - left) * 0.5, centerY = top + (bottom - top) * 0.5;
    const radius = Math.min(right - left, bottom - top) * 0.2;
    const ground = this.add.graphics().fillStyle(0x271c30, 0.38).fillCircle(0, 0, radius - 14);
    const ring = this.add.graphics().lineStyle(26, 0x321e3d, 0.94).strokeCircle(0, 0, radius)
      .lineStyle(9, 0xb46acb, 0.9).strokeCircle(0, 0, radius - 12)
      .lineStyle(3, 0xf0b9ff, 0.85).strokeCircle(0, 0, radius - 22);
    const silk = this.add.graphics().lineStyle(2, 0xdca9f2, 0.28);
    for (let spoke = 0; spoke < 12; spoke++) {
      const angle = spoke * Math.PI / 6;
      silk.lineBetween(0, 0, Math.cos(angle) * (radius - 20), Math.sin(angle) * (radius - 20));
    }
    const body = this.add.graphics().fillStyle(0x281a32).fillEllipse(0, 12, 132, 100)
      .fillStyle(0x8e54a4).fillEllipse(0, -3, 112, 86)
      .fillStyle(0xe0b8eb).fillEllipse(-20, -20, 34, 14)
      .fillStyle(0xffcedc).fillCircle(-21, -4, 5).fillCircle(21, -4, 5)
      .fillStyle(0x2b162f).fillCircle(-21, -4, 2).fillCircle(21, -4, 2);
    for (let leg = 0; leg < 4; leg++) {
      const y = -18 + leg * 14;
      body.lineStyle(12, 0x57355f, 1).beginPath()
        .moveTo(-42, y).lineTo(-77, y - 22).lineTo(-96, y - 34)
        .moveTo(42, y).lineTo(77, y - 22).lineTo(96, y - 34).strokePath();
      body.lineStyle(6, 0xc07cce, 1).beginPath()
        .moveTo(-42, y).lineTo(-77, y - 22).lineTo(-96, y - 34)
        .moveTo(42, y).lineTo(77, y - 22).lineTo(96, y - 34).strokePath();
    }
    const arenaArt = this.add.container(centerX, centerY, [ground, silk, ring, body]).setDepth(4);
    this.boss!.image.setPosition(centerX, centerY);
    if (this.boss!.image instanceof Phaser.GameObjects.Container) {
      this.boss!.image.add(body);
      arenaArt.setDepth(4);
    }
    this.spiderArena = arenaArt;
    this.spiderStalactiteBaseY = top + 76;
    const rock = this.add.graphics()
      .fillStyle(0x382b43, 0.98).fillPoints([
        new Phaser.Geom.Point(-37, -52), new Phaser.Geom.Point(37, -52),
        new Phaser.Geom.Point(28, -17), new Phaser.Geom.Point(12, 9),
        new Phaser.Geom.Point(0, 48), new Phaser.Geom.Point(-14, 8),
        new Phaser.Geom.Point(-29, -20),
      ], true)
      .lineStyle(4, 0x886b9a, 0.95).strokePoints([
        new Phaser.Geom.Point(-37, -52), new Phaser.Geom.Point(37, -52),
        new Phaser.Geom.Point(28, -17), new Phaser.Geom.Point(12, 9),
        new Phaser.Geom.Point(0, 48), new Phaser.Geom.Point(-14, 8),
        new Phaser.Geom.Point(-29, -20),
      ], true);
    const glow = this.add.graphics().lineStyle(3, 0xdca9f2, 0).strokeCircle(0, 0, 54);
    this.spiderStalactite = this.add.container(centerX, this.spiderStalactiteBaseY, [glow, rock]).setDepth(18);
    this.spiderStalactite.setData("glow", glow);
    this.spiderStalactite.setData("rock", rock);
  }
  private updateSpiderStalactite(dt: number, boss: NonNullable<GameScene["boss"]>) {
    const stalactite = this.spiderStalactite;
    if (!stalactite) return;
    const aura = this.bossFight.combat;
    const glow = stalactite.getData("glow") as Phaser.GameObjects.Graphics;
    glow.clear();
    this.spiderStalactiteReady = aura.active && aura.bossId === boss.definition.id;
    if (this.spiderStalactiteReady && !this.spiderStalactiteFalling) {
      const pulse = 0.55 + (Math.sin(this.run.elapsed * 8) + 1) * 0.2;
      glow.fillStyle(0xb958ee, pulse * 0.16).fillCircle(0, 0, 58);
      glow.lineStyle(5, 0xd58bff, pulse).strokeCircle(0, 0, 52 + Math.sin(this.run.elapsed * 8) * 5);
      glow.lineStyle(2, 0xf1d5ff, pulse * 0.8).strokeCircle(0, 0, 42);
      const inRange = Math.hypot(this.snake.x - stalactite.x, this.snake.y - stalactite.y) < B.snake.radius + 50;
      if (inRange && aura.source === "crown-orb" && aura.consumeHit(boss.definition.id)) {
        this.spiderStalactiteFalling = true;
        const impactX = boss.image.x, impactY = boss.image.y;
        this.tweens.add({ targets: stalactite, x: impactX, y: impactY - 22, duration: 520, ease: "Cubic.In",
          onComplete: () => {
            if (!this.boss || this.boss !== boss) return;
            this.particles.explode(18, impactX, impactY);
            this.feedback(impactX, impactY, "ESTALACTITE! −1 HP", 0xd58bff, true);
            this.tweens.killTweensOf(boss.image);
            boss.image.setAlpha(1);
            this.tweens.add({ targets: boss.image, alpha: 0.22, duration: 110, yoyo: true, repeat: 7, ease: "Linear" });
            this.cameras.main.shake(180, 0.006);
            boss.hazard?.destroy(); boss.hazard = undefined;
            boss.state = "RECOVER"; boss.stateTimer = 1.1;
            this.damageBoss();
            audio.play("power"); haptic("power");
            if (this.boss === boss) {
              stalactite.setAlpha(0);
              this.time.delayedCall(900, () => {
                if (!this.boss || this.boss !== boss || !stalactite.active) return;
                stalactite.setPosition(B.arena.left + (B.arena.right - B.arena.left) * 0.5, this.spiderStalactiteBaseY)
                  .setAlpha(1);
                this.spiderStalactiteFalling = false;
              });
            }
          },
        });
      }
    }
    if (this.spiderStalactiteFalling) return;
    const x = B.arena.left + (B.arena.right - B.arena.left) * 0.5;
    stalactite.setPosition(x, Phaser.Math.Linear(stalactite.y, this.spiderStalactiteBaseY + Math.sin(this.run.elapsed * 2) * (this.spiderStalactiteReady ? 3 : 0), dt * 8));
  }
  private createDesertArenaBarrier() {
    this.desertArenaBarrier?.destroy();
    this.scorpionArenaClosed = false;
    const arena = desertRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "scorpion_arena")!;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * DW.scorpionArena.radius;
    const field = this.add.graphics().fillStyle(0xc47b38, 0.08).fillCircle(0, 0, radius - 12);
    const rim = this.add.graphics().lineStyle(15, 0x80502d, 0.82).strokeCircle(0, 0, radius)
      .lineStyle(5, 0xf4c775, 0.72).strokeCircle(0, 0, radius - 8);
    this.desertArenaBarrier = this.add.container(arena.x, arena.y, [field, rim]).setDepth(4);
    this.desertArenaBarrier.setData("rim", rim);
    rim.setAlpha(0.5);
    this.tweens.add({ targets: rim, alpha: 0.82, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
  private setScorpionArenaClosed(closed: boolean) {
    if (this.scorpionArenaClosed === closed) return;
    this.scorpionArenaClosed = closed;
    const rim = this.desertArenaBarrier?.getData("rim") as Phaser.GameObjects.Graphics | undefined;
    if (!rim?.active) return;
    this.tweens.killTweensOf(rim);
    if (closed) {
      rim.setAlpha(1);
      this.tweens.add({ targets: rim, alpha: 0.82, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else {
      rim.setAlpha(0.5);
      this.tweens.add({ targets: rim, alpha: 0.82, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }
  private scorpionAttackArenaIsClosed(boss: NonNullable<GameScene["boss"]>) {
    return boss.scorpionPoisonSequence === true
      || boss.scorpionJumpAttackPending === true
      || boss.scorpionJumpAttackActive === true
      || boss.state.startsWith("SCORPION_POISON")
      || boss.state.startsWith("SCORPION_JUMP");
  }
  private updateScorpionArenaBarrierVisual() {
    const boss = this.boss;
    if (!boss || boss.definition.id !== "scorpion-king") return;
    this.setScorpionArenaClosed(this.scorpionAttackArenaIsClosed(boss));
  }
  private containSnakeInScorpionArena(previous: Point) {
    if (!this.boss || this.boss.definition.id !== "scorpion-king" || !this.desertArenaBarrier) return;
    this.setScorpionArenaClosed(this.scorpionAttackArenaIsClosed(this.boss));
    const arenaClosed = this.scorpionArenaClosed;
    if (!arenaClosed) return;
    const center = this.desertArenaBarrier;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * DW.scorpionArena.radius;
    const contained = blockDesertArenaCrossing(previous, this.snake, center, radius, B.snake.radius + 8)
      ?? containDesertArenaPoint(this.snake, center, radius, B.snake.radius + 8);
    if (!contained) return;
    const angle = Math.atan2(this.snake.y - center.y, this.snake.x - center.x);
    this.snake.x = contained.x; this.snake.y = contained.y; this.snake.angle = angle;
    this.snake.body[0].x = contained.x; this.snake.body[0].y = contained.y;
    this.snake.moveVector(0, angle, 0, { x: 0, y: 0 });
    this.steering.reset(angle); this.aim = null;
    if (this.desertBarrierCooldown <= 0) {
      this.desertBarrierCooldown = 0.65;
      this.feedback(this.snake.x, this.snake.y, "ARENA DO ESCORPIÃO-REI!", 0xffd47a);
      this.cameras.main.shake(120, 0.0015); audio.play("current_flow"); haptic("coin");
    }
  }
  private clearScorpionPoisonPuddles() {
    for (const puddle of this.scorpionPoisonPuddles) puddle.image.destroy();
    this.scorpionPoisonPuddles = [];
    this.scorpionPoisonTouching = false;
  }
  private updateScorpionPoisonPuddles(dt: number) {
    let snakeTouchingPoison = false;
    for (const puddle of [...this.scorpionPoisonPuddles]) {
      if (Number.isFinite(puddle.life)) {
        puddle.life -= dt;
        if (puddle.life <= 0) {
          puddle.image.destroy();
          this.scorpionPoisonPuddles = this.scorpionPoisonPuddles.filter((item) => item !== puddle);
          continue;
        }
      }
      puddle.image.setAlpha(0.72 + Math.sin(this.run.elapsed * 7 + puddle.x) * 0.16);
      const puddleTouchRadius = 54 + B.snake.radius;
      const touched = Math.hypot(this.snake.x - puddle.x, this.snake.y - puddle.y) < puddleTouchRadius
        || this.snake.body.slice(1, this.snake.length).some((segment) => Math.hypot(segment.x - puddle.x, segment.y - puddle.y) < puddleTouchRadius);
      snakeTouchingPoison ||= touched;
    }
    if (snakeTouchingPoison && !this.powers.ghostActive) {
      this.powers.applyPoison();
      if (!this.scorpionPoisonTouching) this.feedback(this.snake.x, this.snake.y, "VENENO! LENTO", 0x9dff58);
    }
    this.scorpionPoisonTouching = snakeTouchingPoison;
  }
  private spawnScorpionPoisonPuddles(count = 24, lifetime = 45, safeDistance = 110) {
    const arena = B.arena;
    const puddlePositions: Point[] = this.scorpionPoisonPuddles.map(({ x, y }) => ({ x, y }));
    const snakeSegments = [{ x: this.snake.x, y: this.snake.y }, ...this.snake.body.slice(1, this.snake.length)];
    for (let index = 0; index < count; index++) {
      let point: Point | undefined;
      for (let attempt = 0; attempt < 30; attempt++) {
        const candidate = {
          x: Phaser.Math.Between(arena.left + 70, arena.right - 70),
          y: Phaser.Math.Between(arena.top + 70, arena.bottom - 70),
        };
        const clearOfSnake = snakeSegments.every((segment) => Math.hypot(candidate.x - segment.x, candidate.y - segment.y) >= safeDistance);
        if (clearOfSnake && puddlePositions.every((placed) => Math.hypot(candidate.x - placed.x, candidate.y - placed.y) >= 105)) {
          point = candidate;
          break;
        }
      }
      if (!point) continue;
      puddlePositions.push(point);
      const { x, y } = point;
      const puddle = this.add.graphics().setPosition(x, y).setDepth(7);
      puddle.fillStyle(0x6d9e21, 0.28).fillEllipse(0, 0, 108, 68);
      puddle.fillStyle(0x79d832, 0.78).fillEllipse(0, 0, 82, 48);
      puddle.fillStyle(0xd9ff78, 0.9).fillCircle(-15, -4, 7).fillCircle(13, 8, 5);
      puddle.lineStyle(4, 0xbaff47, 0.88).strokeEllipse(0, 0, 84, 50);
      this.scorpionPoisonPuddles.push({ x, y, life: lifetime, image: puddle });
    }
    while (this.scorpionPoisonPuddles.length > 8) {
      const oldest = this.scorpionPoisonPuddles.shift();
      oldest?.image.destroy();
    }
  }
  private containSnakeInKrakenArena() {
    if (!this.boss || this.boss.definition.id !== "kraken" || !this.krakenBarrier) return;
    const center = this.krakenBarrier;
    if (this.boss.state === "KRAKEN_HEAL" || this.krakenHealExitTimer > 0) return;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * OW.krakenArena.radius;
    const contained = containKrakenArenaPoint(this.snake, center, radius, B.snake.radius + 8);
    if (!contained) return;
    const dx = this.snake.x - center.x, dy = this.snake.y - center.y;
    this.snake.x = contained.x;
    this.snake.y = contained.y;
    const returnAngle = Math.atan2(dy, dx);
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
      this.feedback(this.snake.x, this.snake.y, "BARREIRA DO KRAKEN!", 0x73e8ed);
      this.cameras.main.shake(120, 0.0015);
      audio.play("current_flow");
      haptic("coin");
    }
  }
  private createKraken(x: number, y: number) {
    const kraken = this.add.container(x, y).setDepth(19);
    const tentacles: Phaser.GameObjects.Graphics[] = [];
    const suckers: Phaser.GameObjects.Graphics[] = [];
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
      const suckerGraphics = this.add.graphics().setDepth(1);
      suckerGraphics.fillStyle(0xb54de8, 0.95);
      for (let sucker = 0; sucker < 5; sucker++) {
        const progress = 0.28 + sucker * 0.12;
        const sx = Math.cos(angle) * length * progress + Math.cos(angle + Math.PI / 2) * bend * progress;
        const sy = Math.sin(angle) * length * progress + Math.sin(angle + Math.PI / 2) * bend * progress;
        suckerGraphics.fillCircle(sx, sy, 5 - sucker * 0.35);
      }
      graphics.setPosition(0, 18).setDepth(0);
      suckerGraphics.setPosition(0, 18);
      tentacles.push(graphics);
      suckers.push(suckerGraphics);
      kraken.add([graphics, suckerGraphics]);
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
    kraken.setData("suckers", suckers);
    return kraken;
  }
  private createScorpionKing(x: number, y: number) {
    const scorpion = this.add.container(x, y).setDepth(19);
    const tail = this.add.container(0, 0);

    // Coiled, articulated tail with a pronounced scorpion stinger.
    const tailShape = this.add.graphics();
    tailShape.lineStyle(27, 0x57331f, 1).beginPath()
      .moveTo(22, 18).lineTo(48, 26).lineTo(72, 15).lineTo(89, -7)
      .lineTo(92, -34).lineTo(77, -55).lineTo(53, -62).lineTo(35, -49).strokePath();
    tailShape.lineStyle(17, 0xc87932, 1).beginPath()
      .moveTo(22, 18).lineTo(48, 26).lineTo(72, 15).lineTo(89, -7)
      .lineTo(92, -34).lineTo(77, -55).lineTo(53, -62).lineTo(35, -49).strokePath();
    tailShape.lineStyle(4, 0xffd275, 0.78).beginPath()
      .moveTo(30, 17).lineTo(49, 22).lineTo(70, 12).lineTo(84, -8)
      .lineTo(87, -33).lineTo(74, -50).lineTo(54, -56).strokePath();
    tailShape.fillStyle(0xf5c35c, 1)
      .fillCircle(22, 18, 12).fillCircle(48, 26, 11).fillCircle(72, 15, 10)
      .fillCircle(89, -7, 10).fillCircle(92, -34, 9).fillCircle(77, -55, 8).fillCircle(53, -62, 7);
    tailShape.fillStyle(0xffe18a, 0.9).fillCircle(48, 22, 3).fillCircle(72, 11, 3).fillCircle(89, -11, 3);
    const stinger = this.add.graphics();
    stinger.fillStyle(0x533020, 1).fillTriangle(35, -49, 22, -35, 47, -38);
    stinger.fillStyle(0xffb347, 1).fillTriangle(35, -46, 28, -37, 42, -39);
    stinger.fillStyle(0xffe27b, 0.9).fillCircle(37, -43, 4);
    tail.add([tailShape, stinger]);

    const legs = this.add.graphics();
    legs.lineStyle(13, 0x57331f, 1);
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index++) {
        const startX = side * (24 + index * 7), startY = -2 + index * 15;
        const kneeX = side * (56 + index * 5), kneeY = startY + 20;
        const footX = side * (72 + index * 4), footY = startY + 38;
        legs.beginPath().moveTo(startX, startY).lineTo(kneeX, kneeY).lineTo(footX, footY).strokePath();
        legs.fillStyle(0xe6a34c, 1).fillCircle(startX, startY, 6).fillCircle(kneeX, kneeY, 6);
      }
    }

    const pincers = this.add.graphics();
    pincers.lineStyle(18, 0x57331f, 1).beginPath().moveTo(-37, 3).lineTo(-66, 22).lineTo(-86, 9).strokePath();
    pincers.lineStyle(12, 0xe6a34c, 1).beginPath().moveTo(-37, 3).lineTo(-66, 22).strokePath();
    pincers.lineStyle(18, 0x57331f, 1).beginPath().moveTo(37, 3).lineTo(66, 22).lineTo(86, 9).strokePath();
    pincers.lineStyle(12, 0xe6a34c, 1).beginPath().moveTo(37, 3).lineTo(66, 22).strokePath();
    pincers.lineStyle(9, 0xf5c35c, 1).beginPath().moveTo(-66, 22).lineTo(-82, 37).moveTo(-66, 22).lineTo(-90, 26).moveTo(66, 22).lineTo(82, 37).moveTo(66, 22).lineTo(90, 26).strokePath();

    const shell = this.add.graphics();
    shell.fillStyle(0x57331f, 1).fillEllipse(0, 10, 112, 92);
    shell.fillStyle(0xb9672c, 1).fillEllipse(0, 2, 100, 82);
    shell.fillStyle(0xe39a3f, 1).fillEllipse(0, -5, 82, 64);
    shell.fillStyle(0xffd275, 0.72).fillEllipse(-19, -23, 31, 12);
    shell.lineStyle(4, 0x8c4928, 0.9).beginPath().moveTo(-30, -26).lineTo(-12, -3).lineTo(-23, 16).moveTo(0, -34).lineTo(7, -7).lineTo(-2, 14).moveTo(29, -23).lineTo(12, -2).lineTo(25, 16).strokePath();
    const face = this.add.graphics();
    face.fillStyle(0x42291f, 1).fillEllipse(-20, -8, 10, 16).fillEllipse(20, -8, 10, 16);
    face.fillStyle(0xffe992, 1).fillCircle(-20, -10, 4).fillCircle(20, -10, 4);
    face.fillStyle(0x3b251d, 1).fillCircle(-20, -10, 1.7).fillCircle(20, -10, 1.7);
    face.lineStyle(4, 0x57331f, 1).beginPath().moveTo(-10, 14).lineTo(0, 20).lineTo(10, 14).strokePath();

    scorpion.add([tail, legs, pincers, shell, face]);
    scorpion.setSize(220, 220);
    scorpion.setData("scorpionTail", tail);
    return scorpion;
  }
  private createSpiderQueen(x: number, y: number) {
    const spider = this.add.container(x, y).setDepth(19);
    const legs = this.add.graphics().lineStyle(13, 0x392941, 1);
    for (const side of [-1, 1]) for (let index = 0; index < 4; index++) {
      const startX = side * 28, startY = -28 + index * 18;
      legs.beginPath().moveTo(startX, startY).lineTo(side * (72 + index * 5), startY - 20).lineTo(side * (94 + index * 5), startY + 3).strokePath();
      legs.lineStyle(7, 0xb98bd5, 1).beginPath().moveTo(startX, startY).lineTo(side * (72 + index * 5), startY - 20).lineTo(side * (94 + index * 5), startY + 3).strokePath().lineStyle(13, 0x392941, 1);
    }
    const body = this.add.graphics().fillStyle(0x392941).fillEllipse(0, 17, 104, 90).fillStyle(0x704d84).fillEllipse(0, 10, 88, 72).fillStyle(0xb98bd5).fillEllipse(-15, -4, 34, 15);
    const face = this.add.graphics().fillStyle(0xff8eae).fillCircle(-18, -2, 8).fillCircle(0, -9, 8).fillCircle(18, -2, 8).fillStyle(0xffe5f1).fillCircle(-18, -4, 2.5).fillCircle(0, -11, 2.5).fillCircle(18, -4, 2.5);
    spider.add([legs, body, face]);
    spider.setSize(210, 170);
    return spider;
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
    if (boss.definition.id === "spider-queen") {
      this.spiderBossCoinTimer -= dt;
      if (this.bossFight.combat.attackCharge >= 100 || this.bossFight.combat.active || this.bossPickups.some((pickup) => pickup.kind === "crown-orb")) {
        for (const coin of this.bossPickups.filter((pickup) => pickup.kind === "boss-coin")) {
          coin.image.destroy();
          this.bossPickups.splice(this.bossPickups.indexOf(coin), 1);
        }
      } else if (this.spiderBossCoinTimer <= 0 && this.bossPickups.filter((pickup) => pickup.kind === "boss-coin").length < 4) {
        this.spiderBossCoinTimer = 2.4;
        this.spawnBossPickup("boss-coin", 25, "●", 0xffd35a);
      }
      this.scorpionlingCooldown = Math.max(0, this.scorpionlingCooldown - dt);
      this.spiderlingTimer -= dt;
      if (this.spiderlingTimer <= 0) this.spawnSpiderling();
      this.updateSpiderlings(dt);
    }
    this.spiderArenaCooldown = Math.max(0, this.spiderArenaCooldown - dt);
    boss.stateTimer -= dt;
    if (boss.definition.id === "spider-queen") this.updateSpiderBehavior(boss);
    else if (boss.definition.id === "king-snake") this.updateKingBehavior(boss, dt);
    else if (boss.definition.id === "candy-monster") this.updateCandyBehavior(boss, dt);
    else if (boss.definition.id === "kraken") this.updateKrakenBehavior(boss, dt);
    else this.updateScorpionBehavior(boss, dt);
    if (!this.boss) return;
    if (boss.definition.id === "spider-queen") this.updateSpiderStalactite(dt, boss);
    if (boss.definition.id === "king-snake") this.updateKingSnakeVisual(boss, dt);
    else if (boss.definition.id === "kraken") this.updateKrakenVisual(boss);
    else if (boss.definition.id === "scorpion-king") this.updateScorpionKingVisual(boss);
    if (this.boss) {
      if (bossUsesTimedCoins(this.boss.definition.id)) {
      this.bossCoinsTimer -= dt;
      if (this.bossCoinsTimer <= 0 && this.bossPickups.filter((pickup) => pickup.kind === "boss-coin").length < (boss.definition.id === "kraken" ? 4 : 3)) {
        this.bossCoinsTimer = 5;
        this.spawnBossPickup("boss-coin", 25, "●", 0xffd35a);
      }
    }
    const dx = this.snake.x - boss.image.x, dy = this.snake.y - boss.image.y;
    const d = Math.hypot(dx, dy) || 1;
    const collisionDistance = Math.hypot(dx, dy);
    const collisionRadius = boss.definition.id === "kraken" ? 84 : boss.definition.id === "scorpion-king" ? 78 : 58 + B.snake.radius;
      const canHitKraken = boss.definition.id === "kraken" && boss.state === "EXPOSED" && boss.hazard && Math.hypot(this.snake.x - boss.hazard.x, this.snake.y - boss.hazard.y) < 62;
    const canHitSpider = boss.definition.id === "spider-queen" && boss.state === "EXPOSED"
      && boss.hazard && Math.hypot(this.snake.x - boss.hazard.x, this.snake.y - boss.hazard.y) < 62;
    const canHitScorpion = boss.definition.id === "scorpion-king" && boss.state === "STUNNED";
    const contact = boss.definition.id === "kraken" ? canHitKraken : boss.definition.id === "spider-queen" ? canHitSpider : boss.definition.id === "scorpion-king" ? canHitScorpion && collisionDistance < collisionRadius : collisionDistance < collisionRadius;
    if (boss.definition.id === "candy-monster") {
      const touchingHead = distance(this.snake, boss.image) < collisionRadius;
      const touchingSegment = this.snake.body.slice(0, this.snake.length).some((segment) => distance(segment, boss.image) < collisionRadius);
      if (touchingSegment && this.bossCollisionGrace <= 0 && boss.state !== "CANDY_FLEE") {
        const aura = this.bossFight.combat;
        if (resolveCandyAuraHit(aura, boss.definition.id)) {
          this.bossCollisionGrace = cfg.hitInvulnerability;
          boss.state = "CANDY_FLEE";
          boss.stateTimer = 2;
          this.damageBoss();
          if (!this.boss) return;
          this.particles.explode(14, boss.image.x, boss.image.y);
          audio.play("power"); haptic("power");
          this.tweens.killTweensOf(boss.image);
          this.tweens.add({ targets: boss.image, alpha: 0.25, duration: 200, yoyo: true, repeat: 4 });
        } else if (!aura.active && touchingHead && (boss.state === "CHASE" || boss.state === "SUGAR_RUSH") && this.powers.invincible <= 0 && !this.powers.ghostActive) {
          const hadShield = this.powers.shield;
          if (!this.powers.absorb()) {
            if (!this.loseLife()) { this.die(); return; }
          } else if (hadShield) { this.shieldUses++; this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff); }
          this.bossCollisionGrace = cfg.hitInvulnerability;
        }
      }
      this.bossCollisionGrace = Math.max(0, this.bossCollisionGrace - dt);
    } else if (boss.definition.id === "scorpion-king" && boss.state === "CHASE" && collisionDistance < collisionRadius) {
      if (this.bossCollisionGrace <= 0 && !this.powers.ghostActive && this.powers.invincible <= 0) {
        const hadShield = this.powers.shield;
        if (!this.powers.absorb()) {
          if (!this.loseLife()) { this.die(); return; }
          this.feedback(this.snake.x, this.snake.y, `ESCORPIÃO! −1 VIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
        } else if (hadShield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
        this.bossCollisionGrace = cfg.hitInvulnerability;
      }
      this.bossCollisionGrace = Math.max(0, this.bossCollisionGrace - dt);
    } else if (contact) {
      const aura = this.bossFight.combat;
      const vulnerable = boss.definition.id === "spider-queen" ? false
        : boss.definition.id === "king-snake"
        ? boss.state === "STUNNED" && aura.source === "crown-orb"
        : boss.definition.id === "candy-monster"
          ? boss.state === "ATTACK_MODE" && aura.source === "candy-aura"
        : boss.definition.id === "kraken" ? boss.state === "EXPOSED" || boss.state === "KRAKEN_HEAL"
            : boss.definition.id === "scorpion-king" ? boss.state === "STUNNED" && aura.source === "crown-orb"
              : boss.state === "STUNNED" && aura.source === "crown-orb";
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
      } else if (boss.definition.id === "spider-queen") {
        // The Spider Queen is damaged only when the charged aura hits the stalactite.
      } else if (aura.active && vulnerable && aura.consumeHit(boss.definition.id)) {
        if (boss.definition.id === "kraken") {
          const interruptedHeal = boss.state === "KRAKEN_HEAL";
          if (interruptedHeal) {
            this.krakenHealExitTimer = 5;
            boss.state = "RECOVER";
            boss.stateTimer = 1.5;
            boss.hazard?.destroy();
            boss.hazard = undefined;
            this.krakenBarrierGate?.setVisible(false);
    if (this.desertArenaBarrier) this.tweens.add({ targets: this.desertArenaBarrier, alpha: 0.22, duration: 180, yoyo: true, repeat: 2 });
            this.feedback(boss.image.x, boss.image.y, "CURA INTERROMPIDA! SAIA DA ARENA!", 0x69e6ff, true);
          }
        }
        else if (boss.definition.id === "scorpion-king") { boss.state = "RECOVER"; boss.stateTimer = 1.1; }
        this.damageBoss();
        if (!this.boss) return;
        this.feedback(boss.image.x, boss.image.y, "−1", 0xffb344, true);
        this.tweens.add({ targets: boss.image, alpha: 0.35, duration: 80, yoyo: true, repeat: 2 });
        this.tweens.add({ targets: boss.image, x: boss.image.x + dx / d * 24, y: boss.image.y + dy / d * 24, duration: 130, yoyo: true, ease: "Sine.easeOut" });
        this.particles.explode(14, boss.image.x, boss.image.y);
        audio.play("power"); haptic("power");
      } else if (!aura.active && boss.definition.id !== "kraken" && boss.definition.id !== "spider-queen" && !kingSnake && boss.definition.id !== "candy-monster" && boss.definition.id !== "scorpion-king" && this.bossCollisionGrace <= 0 && !this.powers.ghostActive) {
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
      }
    } else this.bossCollisionGrace = Math.max(0, this.bossCollisionGrace - dt);

    const combat = this.bossFight.combat;
    if (combat.active) {
      if (!this.bossAuraGraphics) this.bossAuraGraphics = this.add.graphics().setDepth(22);
      this.bossAuraGraphics.clear();
      if (boss.definition.id === "king-snake") {
        const points = this.snake.body.slice(0, Math.min(this.snake.length, 24));
        const pulse = 0.72 + (Math.sin(this.run.elapsed * 9) + 1) * 0.12;
        for (let index = 0; index < points.length - 1; index++) {
          const point = points[index], next = points[index + 1];
          const dx = next.x - point.x, dy = next.y - point.y;
          const length = Math.hypot(dx, dy) || 1;
          const wave = Math.sin(this.run.elapsed * 8 - index * 0.65) * 3;
          const x1 = point.x - dy / length * wave, y1 = point.y + dx / length * wave;
          const x2 = next.x - dy / length * wave, y2 = next.y + dx / length * wave;
          this.bossAuraGraphics.lineStyle(10, 0x8b541e, pulse * (1 - index / (points.length * 1.8)))
            .lineBetween(x1, y1, x2, y2);
          this.bossAuraGraphics.lineStyle(5, 0xffd45c, pulse * (1 - index / (points.length * 1.8)))
            .lineBetween(x1, y1, x2, y2);
          if (index > 0 && index % 3 === 0) {
            this.bossAuraGraphics.fillStyle(0xfff0a0, pulse * 0.9).fillCircle(point.x, point.y, 2.5);
          }
        }
        const head = points[0];
        if (head) {
          const angle = this.snake.angle;
          this.bossAuraGraphics.fillStyle(0x8b541e, pulse).fillCircle(head.x, head.y, B.snake.radius + 9);
          this.bossAuraGraphics.fillStyle(0xffd45c, pulse).fillCircle(head.x, head.y, B.snake.radius + 5);
          const eyeForward = B.snake.radius * 0.45, eyeSide = B.snake.radius * 0.42;
          for (const side of [-1, 1]) {
            const eyeX = head.x + Math.cos(angle) * eyeForward - Math.sin(angle) * eyeSide * side;
            const eyeY = head.y + Math.sin(angle) * eyeForward + Math.cos(angle) * eyeSide * side;
            this.bossAuraGraphics.fillStyle(0x75401c, pulse).fillCircle(eyeX, eyeY, 2.4);
          }
        }
      } else {
        const color = boss.definition.id === "spider-queen" ? 0xdca9f2 : 0xffad32;
        for (let i = 0; i < Math.min(this.snake.length, 12); i++) {
          const point = this.snake.body[i];
          this.bossAuraGraphics.lineStyle(4, color, 0.85 - i * 0.045).strokeCircle(point.x, point.y, B.snake.radius + 5);
        }
      }
    } else this.bossAuraGraphics?.clear();
    if (this.bossHud) {
      const kingSnake = boss.definition.id === "king-snake";
      const candy = boss.definition.id === "candy-monster";
      const ready = !kingSnake && !candy && this.bossFight.combat.attackCharge >= 100 ? "ATAQUE PRONTO!" : "";
      const aura = this.bossFight.combat.active ? (candy ? "ESCUDO ATIVO" : `AURA ×${this.bossFight.combat.remainingHits}`) : "";
      const attackCharge = kingSnake || candy ? "" : `ATAQUE ${Math.floor(this.bossFight.combat.attackCharge)}/100`;
      const krakenHealTimer = boss.definition.id === "kraken" && boss.state === "KRAKEN_HEAL" ? `INTERROMPA A CURA: ${Math.ceil(boss.stateTimer)}s` : "";
      this.updateBossHealthHud([`FASE ${boss.phase + 1}`, krakenHealTimer, attackCharge, ready, aura].filter(Boolean).join(" · "));
    }
  }
  private updateSpiderBehavior(boss: NonNullable<GameScene["boss"]>) {
    const preference = this.gameDifficulty;
    if (boss.state === "IDLE" && boss.stateTimer <= 0) {
      boss.state = "ATTACK_EXTEND";
      boss.stateTimer = 0.45;
    } else if (boss.state === "ATTACK_EXTEND" && boss.stateTimer <= 0) {
      boss.targetX = Phaser.Math.Clamp(this.snake.x, B.arena.left + 105, B.arena.right - 105);
      boss.targetY = Phaser.Math.Clamp(this.snake.y, B.arena.top + 105, B.arena.bottom - 105);
      boss.hazard = this.add.container(boss.targetX, boss.targetY).setDepth(8);
      const marker = this.add.graphics().lineStyle(7, 0xf05bce, 0.85).strokeCircle(0, 0, 85);
      boss.hazard.add(marker); this.bossMarkers.push(boss.hazard);
      boss.state = "TELEGRAPH_SLAM"; boss.stateTimer = bossAttackTiming(boss.definition.combat.telegraphDuration, preference, 0.7);
      this.feedback(boss.image.x, boss.image.y, "TEIA A CAMINHO!", 0xf08bda, true); audio.play("error"); haptic("coin");
    } else if (boss.state === "TELEGRAPH_SLAM" && boss.stateTimer <= 0) {
      this.bossMarkers.forEach((marker) => marker.destroy()); this.bossMarkers = [];
      const distanceToTarget = Math.hypot(this.snake.x - boss.targetX, this.snake.y - boss.targetY);
      if (distanceToTarget < 95) this.feedback(boss.targetX, boss.targetY, "DESVIE DA TEIA!", 0xdca9f2);
      const desperatePhase = boss.health <= 2;
      const intensifiedPhase = boss.health <= 5;
      const webRadius = desperatePhase ? 116 : intensifiedPhase ? 100 : 92;
      const web = this.add.graphics().setPosition(boss.targetX, boss.targetY).setDepth(7);
      web.lineStyle(3, 0xf0c8ff, 0.85);
      for (let ring = 1; ring <= 5; ring++) {
        const radius = webRadius * ring / 5;
        web.strokeCircle(0, 0, radius);
      }
      for (let spoke = 0; spoke < 12; spoke++) {
        const angle = spoke * Math.PI / 6;
        web.lineBetween(0, 0, Math.cos(angle) * webRadius, Math.sin(angle) * webRadius);
      }
      const webZone: StickyZone = { x: boss.targetX, y: boss.targetY, radius: webRadius };
      const maxWebs = desperatePhase ? 6 : intensifiedPhase ? 5 : 4;
      while (this.spiderWebZones.length >= maxWebs) {
        const oldest = this.spiderWebZones.shift()!;
        oldest.graphic.destroy();
        const oldestZoneIndex = this.stickyZones.indexOf(oldest.zone);
        if (oldestZoneIndex >= 0) this.stickyZones.splice(oldestZoneIndex, 1);
      }
      this.spiderWebZones.push({ zone: webZone, graphic: web, expiresAt: this.time.now + 12000 });
      this.stickyZones.push(webZone);
      this.tweens.add({ targets: web, alpha: 0.62, duration: 900, yoyo: true, repeat: -1 });
      this.renderStickyZones();
      boss.state = "EXPOSED"; boss.stateTimer = bossAttackTiming(boss.definition.combat.stunDuration, preference, 1.8);
      const attackAngle = Math.random() * Math.PI * 2;
      const edgeRadius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * 0.2 + 76;
      boss.targetX = this.spiderArena!.x + Math.cos(attackAngle) * edgeRadius;
      boss.targetY = this.spiderArena!.y + Math.sin(attackAngle) * edgeRadius;
      boss.hazard = this.add.container(boss.targetX, boss.targetY).setDepth(10);
      const targetRing = this.add.graphics().fillStyle(0xdca9f2, 0.24).fillCircle(0, 0, 58)
        .lineStyle(4, 0xe7c3ff, 0.8).strokeCircle(0, 0, 54);
      boss.hazard.add(targetRing);
      boss.hazard.setData("webZone", { x: boss.targetX, y: boss.targetY, radius: 58 });
      if (desperatePhase) {
        const spread = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * 0.11;
        this.spawnSpiderWeb(Phaser.Math.Clamp(boss.targetX - spread, B.arena.left + 130, B.arena.right - 130), boss.targetY, 100);
        this.spawnSpiderWeb(Phaser.Math.Clamp(boss.targetX + spread, B.arena.left + 130, B.arena.right - 130), boss.targetY, 100);
      }
      audio.play("power");
    } else if (boss.state === "EXPOSED" && boss.stateTimer <= 0) {
      boss.hazard?.destroy(); boss.hazard = undefined;
      boss.state = "RECOVER"; boss.stateTimer = 1.1;
    } else if (boss.state === "RECOVER" && boss.stateTimer <= 0) {
      boss.state = "IDLE"; boss.stateTimer = bossAttackTiming(Math.max(3.5, boss.definition.combat.attackCooldown - boss.phase * 0.35), preference, 1.5);
    }
  }
  private bossSafePoint(minDistance = 180) {
    const arena = B.arena;
    const spiderCircle = this.boss?.definition.id === "spider-queen"
      ? {
          center: this.spiderArena ?? { x: arena.left + (arena.right - arena.left) * 0.5, y: arena.top + (arena.bottom - arena.top) * 0.5 },
          radius: Math.min(arena.right - arena.left, arena.bottom - arena.top) * 0.2,
        }
      : undefined;
    const scorpionArena = this.boss?.definition.id === "scorpion-king" && this.desertArenaBarrier
      ? {
          center: this.desertArenaBarrier,
          radius: Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * DW.scorpionArena.radius,
        }
      : undefined;
    for (let attempt = 0; attempt < 40; attempt++) {
      const point = { x: Phaser.Math.Between(arena.left + 100, arena.right - 100), y: Phaser.Math.Between(arena.top + 100, arena.bottom - 100) };
      if (spiderCircle && distance(point, spiderCircle.center) < spiderCircle.radius + 55) continue;
      if (scorpionArena && !isDesertArenaPickupAccessible(point, scorpionArena.center, scorpionArena.radius, B.snake.radius + 8)) continue;
      if (distance(point, this.snake) < minDistance) continue;
      if (this.boss && distance(point, this.boss.image) < 150) continue;
      if (this.obstacles.some((obstacle) => distance(point, obstacle) < 100)) continue;
      if (this.bossPickups.some((pickup) => distance(point, pickup) < 75)) continue;
      return point;
    }
    if (scorpionArena) {
      const fallback = { x: arena.left + 120, y: arena.top + 120 };
      if (isDesertArenaPickupAccessible(fallback, scorpionArena.center, scorpionArena.radius, B.snake.radius + 8)) return fallback;
      const alternate = { x: arena.right - 120, y: arena.top + 120 };
      if (isDesertArenaPickupAccessible(alternate, scorpionArena.center, scorpionArena.radius, B.snake.radius + 8)) return alternate;
    }
    if (spiderCircle) {
      const point = { x: spiderCircle.center.x + spiderCircle.radius + 90, y: spiderCircle.center.y };
      return { x: Math.min(point.x, arena.right - 80), y: point.y };
    }
    return { x: Phaser.Math.Clamp(this.snake.x + 220, arena.left + 80, arena.right - 80), y: Phaser.Math.Clamp(this.snake.y + 180, arena.top + 80, arena.bottom - 80) };
  }
  private scorpionArenaPoint(minDistance = 180) {
    const arena = B.arena;
    const center = this.desertArenaBarrier ?? {
      x: arena.left + (arena.right - arena.left) * DW.scorpionArena.x,
      y: arena.top + (arena.bottom - arena.top) * DW.scorpionArena.y,
    };
    const radius = Math.min(arena.right - arena.left, arena.bottom - arena.top) * DW.scorpionArena.radius;
    const minimumDistance = radius + B.snake.radius + 8;
    const maxDistance = Math.max(minimumDistance, Math.min(arena.right - arena.left, arena.bottom - arena.top) * 0.42);
    const angleToSnake = Math.atan2(this.snake.y - center.y, this.snake.x - center.x);
    for (let attempt = 0; attempt < 48; attempt++) {
      const angle = attempt === 0 ? angleToSnake : Math.random() * Math.PI * 2;
      const distanceFromCenter = minimumDistance + Math.random() * (maxDistance - minimumDistance);
      const point = {
        x: Phaser.Math.Clamp(center.x + Math.cos(angle) * distanceFromCenter, arena.left + 100, arena.right - 100),
        y: Phaser.Math.Clamp(center.y + Math.sin(angle) * distanceFromCenter, arena.top + 100, arena.bottom - 100),
      };
      if (distance(point, this.snake) < minDistance || this.obstacles.some((obstacle) => distance(point, obstacle) < 100)) continue;
      return point;
    }
    return this.bossSafePoint(minDistance);
  }
  private spawnBossPickup(kind: "boss-coin" | "loot-boss-coin" | "crown-orb" | "sugar-shield" | "attack-pearl" | "candy-aura" | "candy-shield" | "life-reward", _charge: number, symbol?: string, tint?: number) {
    const point = this.bossSafePoint(180);
    this.spawnBossPickupAt(kind, point.x, point.y, symbol, tint);
  }
  private spawnBossPickupAt(kind: "boss-coin" | "loot-boss-coin" | "crown-orb" | "sugar-shield" | "attack-pearl" | "candy-aura" | "candy-shield" | "life-reward", x: number, y: number, symbol?: string, tint?: number) {
    const point = { x, y };
    const isFrogAura = kind === "crown-orb" && this.cloverGardenOrigin() === "candy-world" && Boolean(this.cloverGardenBoss?.active);
    const color = isFrogAura ? 0x72d957 : tint ?? (kind === "life-reward" ? 0xff5b78 : kind === "crown-orb" ? 0xffb52e : kind === "attack-pearl" ? 0x9df8ff : 0xff76d7);
    const graphic = this.add.graphics().fillStyle(color, 0.28).fillCircle(0, 0, 28).lineStyle(4, color, 0.95).strokeCircle(0, 0, 23);
    const isScorpionAura = kind === "crown-orb" && this.boss?.definition.id === "scorpion-king";
    const label = this.add.text(0, 0, isScorpionAura || isFrogAura ? "" : symbol ?? (kind === "life-reward" ? "♥" : kind === "crown-orb" ? "♛" : kind === "sugar-shield" || kind === "candy-shield" ? "S" : "✦"), { fontSize: "25px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    const contents: Phaser.GameObjects.GameObject[] = [graphic, label];
    if (isFrogAura) {
      const frog = this.add.graphics();
      frog.fillStyle(0x328b3b, 1).fillEllipse(0, 5, 27, 20)
        .fillCircle(-10, -4, 8).fillCircle(10, -4, 8)
        .fillStyle(0xe9ffd6, 1).fillCircle(-10, -7, 4).fillCircle(10, -7, 4)
        .fillStyle(0x173c25, 1).fillCircle(-10, -7, 1.8).fillCircle(10, -7, 1.8)
        .lineStyle(2, 0x174f2a, 1).beginPath().arc(0, 4, 8, 0.2, Math.PI - 0.2).strokePath();
      contents.push(frog);
    }
    if (isScorpionAura) {
      const scorpion = this.add.graphics();
      scorpion.lineStyle(3, 0x5a2c18, 1).lineBetween(-7, 5, -18, 13).lineBetween(7, 5, 18, 13)
        .lineBetween(-7, 1, -20, 5).lineBetween(7, 1, 20, 5)
        .lineBetween(-6, -3, -17, -8).lineBetween(6, -3, 17, -8)
        .lineStyle(4, 0xffd27a, 1).beginPath().moveTo(0, -7).lineTo(0, -13).lineTo(8, -18).lineTo(12, -25).strokePath();
      scorpion.fillStyle(0xe98735, 1).fillEllipse(0, 4, 13, 17).fillEllipse(0, -5, 14, 11).fillEllipse(0, -14, 10, 9).fillCircle(12, -25, 4);
      scorpion.fillStyle(0xffefbd, 1).fillCircle(-3, -15, 1.5).fillCircle(3, -15, 1.5);
      scorpion.lineStyle(2, 0xffefbd, 1).lineBetween(18, 13, 22, 16).lineBetween(-18, 13, -22, 16);
      contents.push(scorpion);
    }
    const image = this.add.container(point.x, point.y, contents).setDepth(24);
    this.tweens.add({ targets: image, scale: kind === "attack-pearl" ? 1.32 : 1.16, duration: kind === "attack-pearl" ? 320 : 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (kind === "attack-pearl") this.tweens.add({ targets: graphic, alpha: 0.42, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const isAuraPickup = kind === "crown-orb" || kind === "attack-pearl" || kind === "candy-aura";
    this.bossPickups.push({ ...point, life: kind === "boss-coin" || kind === "loot-boss-coin" || kind === "life-reward" || isAuraPickup ? Number.POSITIVE_INFINITY : 14, kind, image });
  }
  private dropBossCoins(amount: number, x: number, y: number) {
    for (let index = 0; index < amount; index++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 35 + Math.sqrt(Math.random()) * 145;
      let dropX = Phaser.Math.Clamp(x + Math.cos(angle) * radius, B.arena.left + 40, B.arena.right - 40);
      let dropY = Phaser.Math.Clamp(y + Math.sin(angle) * radius, B.arena.top + 40, B.arena.bottom - 40);
      if (this.currentWorld === "spider-lair" && this.spiderArena) {
        const center = this.spiderArena;
        const arenaRadius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * 0.2;
        const distanceFromCenter = Math.hypot(dropX - center.x, dropY - center.y);
        if (distanceFromCenter < arenaRadius + 45) {
          const safeAngle = Math.atan2(dropY - center.y, dropX - center.x) || angle;
          dropX = Phaser.Math.Clamp(center.x + Math.cos(safeAngle) * (arenaRadius + 55), B.arena.left + 40, B.arena.right - 40);
          dropY = Phaser.Math.Clamp(center.y + Math.sin(safeAngle) * (arenaRadius + 55), B.arena.top + 40, B.arena.bottom - 40);
        }
      }
      this.spawnBossPickupAt("loot-boss-coin", dropX, dropY, "●", 0xffd35a);
    }
  }
  private spawnChargedBossAura(boss: NonNullable<GameScene["boss"]>) {
    const kind = bossAuraPickupKind(boss.definition.id);
    if (!kind || this.bossFight.combat.attackCharge < 100 || this.bossFight.combat.active || this.bossPickups.some((pickup) => pickup.kind === kind)) return;
    if (kind === "attack-pearl") {
      const point = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "coral_lagoon")!;
      this.bossPickups.filter((pickup) => pickup.kind === "attack-pearl").forEach((pickup) => pickup.image.destroy());
      this.bossPickups = this.bossPickups.filter((pickup) => pickup.kind !== "attack-pearl");
      this.spawnBossPickupAt("attack-pearl", point.x, point.y, "✦", 0x69e6ff);
    } else if (kind === "candy-aura") {
      this.spawnBossPickup("candy-aura", 0, "✦", 0xff76d7);
    } else {
      const point = boss.definition.id === "scorpion-king" ? this.scorpionArenaPoint(130) : this.bossSafePoint(130);
      this.spawnBossPickupAt("crown-orb", point.x, point.y, boss.definition.id === "spider-queen" ? "🕷" : boss.definition.id === "scorpion-king" ? "" : "♛", boss.definition.id === "spider-queen" ? 0xb958ee : boss.definition.id === "scorpion-king" ? 0xe98735 : 0xffb52e);
    }
    this.updateAuraStatusHud("4/4 BOSS COINS · AURA READY · COLLECT IT");
  }
  private updateBossPickups(dt: number) {
    for (const pickup of [...this.bossPickups]) {
      pickup.life -= dt;
      if (pickup.life <= 0) { pickup.image.destroy(); this.bossPickups.splice(this.bossPickups.indexOf(pickup), 1); continue; }
      if ((pickup.kind === "boss-coin" || pickup.kind === "loot-boss-coin") && (this.boss || this.cloverGardenBoss)) {
        if (pickup.life > 20) pickup.life = 20;
      }
      if (distance(pickup, this.snake) >= 39) continue;
      pickup.image.destroy(); this.bossPickups.splice(this.bossPickups.indexOf(pickup), 1);
      const boss = this.boss;
      if (pickup.kind === "loot-boss-coin" || pickup.kind === "boss-coin") {
        const gardenBoss = this.cloverGardenBoss;
        const canChargeGardenAura = Boolean(gardenBoss && this.bossFight.active && !this.bossFight.defeated);
        const canChargeAura = Boolean(boss && this.bossFight.active && !this.bossFight.defeated);
        const previousCharge = canChargeAura || canChargeGardenAura ? this.bossFight.combat.attackCharge : 0;
        const chargePerCoin = gardenBoss ? 25 : boss?.definition.combat.attackChargePerBossCoin ?? 25;
        if (canChargeAura || canChargeGardenAura) this.bossFight.combat.addCharge(chargePerCoin);
        const previousBossCoins = this.run.bossCoins;
        this.run.bossCoins++;
        creditBossCoins(save.profile, 1);
        const bossCoinXP = bossCoinCollectionXP(previousBossCoins);
        this.run.bossCoinXP += bossCoinXP;
        addXP(save.profile, bossCoinXP);
        this.run.bossCoinXPCredited = this.run.bossCoinXP;
        audio.play("coin_golden"); haptic("coin");
        if (canChargeAura && boss) {
          const justReady = this.bossFight.combat.attackCharge >= 100 && previousCharge < 100;
          const message = justReady
            ? boss.definition.id === "kraken"
              ? "BOSS COIN +1 · 100/100 · AURA PRONTA · PEGUE A PÉROLA"
              : "BOSS COIN +1 · 100/100 · AURA PRONTA"
            : `BOSS COIN +1 · ${Math.floor(this.bossFight.combat.attackCharge)}/100`;
          this.updateAuraStatusHud(message);
        }
        if (canChargeGardenAura) {
          const justReady = this.bossFight.combat.attackCharge >= 100 && previousCharge < 100;
          if (justReady) {
            const point = this.bossSafePoint(130);
            this.spawnBossPickupAt("crown-orb", point.x, point.y, "♛", 0xffdf6c);
          }
          this.updateAuraStatusHud();
        }
        void save.save();
        if (canChargeAura && boss && this.bossFight.combat.attackCharge >= 100) this.spawnChargedBossAura(boss);
        continue;
      }
      if (pickup.kind === "life-reward") {
        if (this.powers.gainLife()) {
          this.feedback(pickup.x, pickup.y, "+1 VIDA · RECOMPENSA DO CHEFE", 0xff5b78, true);
          audio.play("power"); haptic("power");
        }
        continue;
      }
      const gardenBoss = this.cloverGardenBoss;
      if (!boss && gardenBoss?.active) {
        if (pickup.kind !== "crown-orb" || this.bossFight.combat.attackCharge < 100) continue;
        this.activateGardenAttackAura();
        continue;
      }
      if (!boss) return;
      if (pickup.kind === "candy-aura") {
        if (bossAuraPickupKind(boss.definition.id) === pickup.kind && this.bossFight.combat.attackCharge >= 100 && activateCandyAura(this.bossFight.combat, boss.definition.id)) {
          if (boss.state === "DROP_ATTACK") {
            for (const marker of this.bossMarkers) marker.destroy();
            this.bossMarkers = [];
          }
          boss.state = "CHASE";
        } else continue;
        audio.play("power"); haptic("power");
        this.feedback(pickup.x, pickup.y, "AURA! PERSIGA O CHEFE!", 0xffa52f, true);
      } else if (pickup.kind === "candy-shield") {
        this.powers.activate("shield");
        this.shieldUses++;
        audio.play("power"); haptic("power");
        this.feedback(pickup.x, pickup.y, "ESCUDO!", 0x70cfff, true);
      } else if (pickup.kind === "sugar-shield") {
        this.powers.activate("shield");
        this.shieldUses++;
        audio.play("power"); haptic("power");
        this.feedback(pickup.x, pickup.y, "ESCUDO!", 0x70cfff, true);
      } else {
        const source = pickup.kind;
        if (source !== bossAuraPickupKind(boss.definition.id) || this.bossFight.combat.attackCharge < 100) continue;
        const activated = this.bossFight.combat.activateAttackAura({ maxHits: 1, source, bossId: boss.definition.id });
        if (activated) {
          audio.play("power"); haptic("power");
          this.feedback(pickup.x, pickup.y, "ATTACK AURA!", 0xffa52f, true);
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
    const healing = boss.state === "KRAKEN_HEAL";
    const escapingHeal = this.krakenHealExitTimer > 0;
    if (boss.krakenHitFlash && boss.krakenHitFlash > 0) boss.krakenHitFlash = Math.max(0, boss.krakenHitFlash - this.game.loop.delta / 1000);
    const hitFlash = !!boss.krakenHitFlash && boss.krakenHitFlash > 0;
    const telegraph = boss.state === "TELEGRAPH_SLAM" ? 1 + Math.sin(this.run.elapsed * 18) * 0.08 : 1;
    const healPulse = healing ? 1 + Math.sin(this.run.elapsed * 11) * 0.075 : 1;
    boss.image.setScale(phaseScale * telegraph * healPulse);
    boss.image.setAlpha(hitFlash ? (Math.sin(this.run.elapsed * 46) > 0 ? 0.18 : 1) : healing ? 0.72 + (Math.sin(this.run.elapsed * 13) + 1) * 0.14 : escapingHeal ? 0.8 + (Math.sin(this.run.elapsed * 18) + 1) * 0.1 : 1);
    boss.image.rotation = Math.sin(this.run.elapsed * 1.6) * 0.025;
    boss.krakenTentacles.forEach((tentacle, index) => {
      const timer = boss.krakenTentacleTimers?.[index] ?? 0;
      if (timer > 0 && boss.krakenTentacleTimers) boss.krakenTentacleTimers[index] = Math.max(0, timer - this.game.loop.delta / 1000);
      const retracting = timer > 0;
      const blinking = retracting && Math.sin(this.run.elapsed * 30) > 0;
      tentacle.rotation = healing
        ? Math.sin(this.run.elapsed * 5 + index * 0.9) * 0.2
        : Math.sin(this.run.elapsed * 2.3 + index * 0.9) * 0.11;
      tentacle.y = retracting ? 18
        : healing
        ? 18 + Math.sin(this.run.elapsed * 5 + index) * 10 - 9
        : 18 + Math.sin(this.run.elapsed * 2.8 + index) * 5;
      tentacle.setVisible(!retracting);
      tentacle.setAlpha(blinking ? 0.12 : 1);
      tentacle.setScale(1);
      const suckers = boss.krakenSuckers?.[index];
      suckers?.setVisible(!retracting);
      suckers?.setAlpha(0.42 + (Math.sin(this.run.elapsed * 8 + index) + 1) * 0.29);
    });
    if (boss.state === "TELEGRAPH_SLAM" && boss.hazard) {
      boss.hazard.setAlpha(0.62 + Math.sin(this.run.elapsed * 16) * 0.25);
    }
  }
  private updateScorpionKingVisual(boss: NonNullable<GameScene["boss"]>) {
    const tail = boss.scorpionTail;
    if (!tail) return;
    const specialSting = !!boss.scorpionPoisonSequence;
    const telegraphing = boss.state === "SCORPION_STING_TELEGRAPH" || (specialSting && boss.state === "SCORPION_POISON_TELEGRAPH");
    const strikeVisible = boss.state === "SCORPION_STING" || boss.state === "SCORPION_LAND" || (specialSting && boss.state === "SCORPION_POISON_STRIKE") || boss.state === "STUNNED" || boss.state === "RECOVER";
    const fury = boss.health <= 2;
    const pulse = Math.sin(this.run.elapsed * (telegraphing || fury ? 12 : 2.4));
    const jumping = boss.state === "SCORPION_POISON_JUMP" || boss.state === "SCORPION_POISON_RETURN" || boss.state === "SCORPION_JUMP";
    const jumpProgress = boss.state === "SCORPION_JUMP" ? Phaser.Math.Clamp(1 - boss.stateTimer / 0.85, 0, 1) : 0;
    const landing = boss.state === "SCORPION_JUMP_LAND";
    const poisonJumpProgress = boss.state === "SCORPION_POISON_JUMP" || boss.state === "SCORPION_POISON_RETURN"
      ? Phaser.Math.Clamp(1 - boss.stateTimer / Math.max(boss.stateTimer + 0.35, 0.9), 0, 1)
      : 0;
    const pinnedTail = boss.state === "SCORPION_STING" || boss.state === "SCORPION_LAND" || (specialSting && boss.state === "SCORPION_POISON_STRIKE") || boss.state === "STUNNED" || (boss.state === "RECOVER" && !!boss.scorpionStinger);
    if (boss.state === "SCORPION_STING" || (specialSting && boss.state === "SCORPION_POISON_STRIKE")) {
      // Pin the tail tip to the ground throughout the strike instead of sweeping at a point.
      tail.rotation = 1.12;
    } else {
      tail.rotation = telegraphing ? -0.48 + pulse * 0.045 : -0.08 + pulse * 0.055;
    }
    const jumpTelegraphPulse = boss.state === "SCORPION_JUMP_TELEGRAPH" ? Math.max(0, Math.sin(this.run.elapsed * 12)) * 0.14 : 0;
    boss.image.setScale(1 + boss.phase * 0.035 + (telegraphing ? Math.max(0, pulse) * 0.035 : 0) + jumpTelegraphPulse + (boss.state === "SCORPION_JUMP" ? Math.sin(jumpProgress * Math.PI) * 0.55 : jumping ? Math.sin(poisonJumpProgress * Math.PI) * 0.45 : 0) + (landing ? 0.12 : 0));
    // Make the exposed/stunned window visually clear so players can time the aura hit.
    boss.image.setAlpha(boss.state === "STUNNED" ? (Math.sin(this.run.elapsed * 18) > 0 ? 0.35 : 1) : 1);
    if (boss.state === "SCORPION_JUMP_TELEGRAPH") boss.image.setAlpha(0.7 + (Math.sin(this.run.elapsed * 12) + 1) * 0.15);
    tail.setVisible(!pinnedTail);
    if (fury) tail.setAlpha(0.82 + Math.sin(this.run.elapsed * 15) * 0.18);
    else tail.setAlpha(1);
    if (boss.scorpionStinger) {
      boss.scorpionStinger.setVisible(strikeVisible);
      if ((boss.state === "RECOVER" || (specialSting && boss.state === "SCORPION_POISON_RETURN")) && !boss.scorpionStingerRetracting) {
        const stinger = boss.scorpionStinger;
        boss.scorpionStingerRetracting = true;
        this.tweens.add({
          targets: stinger,
          scaleX: 0,
          alpha: 0,
          duration: 400,
          ease: "Sine.easeIn",
          onComplete: () => {
            stinger.destroy();
            if (boss.scorpionStinger === stinger) {
              boss.scorpionStinger = undefined;
              boss.scorpionStingerRetracting = false;
            }
          },
        });
      }
      if (strikeVisible && boss.state !== "RECOVER") {
        const attackDx = boss.targetX - boss.image.x, attackDy = boss.targetY - boss.image.y;
        const attackLength = Math.hypot(attackDx, attackDy) || 1;
        const directionX = attackDx / attackLength, directionY = attackDy / attackLength;
        // The tail emerges from behind the shell, not from the center of the boss.
        const rearX = boss.image.x - directionX * 38 - directionY * 10;
        const rearY = boss.image.y - directionY * 38 + directionX * 10;
        const dx = boss.targetX - rearX, dy = boss.targetY - rearY;
        const length = Math.hypot(dx, dy), scale = 0.55;
        const wave = 20;
        const p0 = { x: 0, y: 0 }, p1 = { x: length * 0.22, y: -wave * 0.35 };
        const p2 = { x: length * 0.47, y: wave * 0.55 }, p3 = { x: length * 0.72, y: -wave * 0.6 };
        const p4 = { x: length, y: 0 };
        boss.scorpionStinger.setPosition(rearX, rearY).setRotation(Math.atan2(dy, dx));
        boss.scorpionStinger.clear();
        boss.scorpionStinger.lineStyle(30 * scale, 0x57331f, 1).beginPath().moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).lineTo(p4.x, p4.y).strokePath();
        boss.scorpionStinger.lineStyle(19 * scale, 0xc87932, 1).beginPath().moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).lineTo(p4.x, p4.y).strokePath();
        boss.scorpionStinger.lineStyle(4 * scale, 0xffd275, 0.9).beginPath().moveTo(p0.x + 5, p0.y - 3).lineTo(p1.x, p1.y - 5).lineTo(p2.x, p2.y - 5).lineTo(p3.x, p3.y - 5).strokePath();
        for (const point of [p1, p2, p3]) {
          boss.scorpionStinger.fillStyle(0xf5c35c, 1).fillCircle(point.x, point.y, 10 * scale);
          boss.scorpionStinger.fillStyle(0xffe18a, 0.95).fillCircle(point.x - 2, point.y - 3, 3 * scale);
        }
        boss.scorpionStinger.fillStyle(0x533020, 1).fillTriangle(p4.x, p4.y, p4.x + 22 * scale, p4.y - 7 * scale, p4.x + 13 * scale, p4.y + 12 * scale);
        boss.scorpionStinger.fillStyle(0xffb347, 1).fillTriangle(p4.x + 2 * scale, p4.y, p4.x + 15 * scale, p4.y - 5 * scale, p4.x + 10 * scale, p4.y + 7 * scale);
        boss.scorpionStinger.fillStyle(0xffe27b, 0.9).fillCircle(p4.x + 2 * scale, p4.y, 3 * scale);
        boss.scorpionStinger.setAlpha(boss.state === "STUNNED" ? (Math.sin(this.run.elapsed * 18) > 0 ? 0.35 : 1) : 1);
      }
    }
  }
  private updateKingBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const arena = B.arena;
    const preference = this.gameDifficulty;
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
      const hitHead = distance(this.snake, boss.image) < 88;
      const hitBody = this.snake.body.slice(1, this.snake.length).some((segment) => distance(segment, boss.image) < 70);
      if ((hitHead || hitBody) && this.bossCollisionGrace <= 0 && this.powers.invincible <= 0 && !this.powers.ghostActive) {
        const hadShield = this.powers.shield;
        if (!this.powers.absorb()) {
          if (hitHead && !this.loseLife()) { this.die(); return; }
          if (!hitHead) this.snake.length = Math.max(B.snake.initial, this.snake.length - 1);
        } else if (hadShield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
        this.bossCollisionGrace = boss.definition.combat.hitInvulnerability;
      }
      const speed = boss.speed * (furious ? 5.8 : 5);
      boss.image.x += boss.chargeX * speed * dt; boss.image.y += boss.chargeY * speed * dt;
      if (boss.image.x < arena.left + 70 || boss.image.x > arena.right - 70 || boss.image.y < arena.top + 70 || boss.image.y > arena.bottom - 70) {
        boss.image.x = Phaser.Math.Clamp(boss.image.x, arena.left + 70, arena.right - 70); boss.image.y = Phaser.Math.Clamp(boss.image.y, arena.top + 70, arena.bottom - 70);
        boss.state = "STUNNED"; boss.stateTimer = boss.definition.combat.stunDuration; boss.doubleCharge = furious && boss.doubleCharge === 0 ? 1 : 0;
        for (const marker of this.bossMarkers) marker.destroy(); this.bossMarkers = [];
        audio.play("error"); haptic("power"); this.particles.explode(18, boss.image.x, boss.image.y);
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
  private updateScorpionBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const arena = B.arena, preference = this.gameDifficulty;
    const furious = boss.phase >= 2;
    if (boss.state === "SCORPION_POISON_JUMP") {
      const center = this.desertArenaBarrier ?? { x: arena.left + (arena.right - arena.left) * DW.scorpionArena.x, y: arena.top + (arena.bottom - arena.top) * DW.scorpionArena.y };
      this.moveBossToward(boss, center, 420, dt);
      if (Math.hypot(boss.image.x - center.x, boss.image.y - center.y) <= 24 || boss.stateTimer <= 0) {
        for (const marker of this.bossMarkers) marker.destroy();
        this.bossMarkers = [];
        boss.image.setPosition(center.x, center.y).setScale(1 + boss.phase * 0.035);
        boss.scorpionPoisonSequence = true;
        boss.scorpionPoisonAttacks = 0;
        boss.state = "SCORPION_POISON_TELEGRAPH";
        boss.stateTimer = bossAttackTiming(1.3, preference, 1.3);
        boss.targetX = Phaser.Math.Clamp(this.snake.x, arena.left + 64, arena.right - 64);
        boss.targetY = Phaser.Math.Clamp(this.snake.y, arena.top + 64, arena.bottom - 64);
        const marker = this.add.graphics().fillStyle(0xff493c, 0.15).fillCircle(boss.targetX, boss.targetY, 96)
          .lineStyle(8, 0xff6547, 0.88).strokeCircle(boss.targetX, boss.targetY, 84)
          .lineStyle(3, 0xffdc58, 0.72).lineBetween(boss.image.x, boss.image.y, boss.targetX, boss.targetY).setDepth(8);
        this.bossMarkers.push(marker);
        this.feedback(center.x, center.y, "CAUDA CARREGANDO!", 0xffd275, true);
        audio.play("error"); haptic("coin");
      }
    } else if (boss.state === "SCORPION_POISON_TELEGRAPH") {
      if (boss.stateTimer <= 0) {
        boss.state = "SCORPION_POISON_STRIKE";
        // Preserve the marked target and give the player a clear dodge window.
        boss.stateTimer = bossAttackTiming(1.1, preference, 1.1);
        if (boss.scorpionTail && !boss.scorpionStinger) {
          const stinger = this.add.graphics();
          stinger.setPosition(boss.image.x, boss.image.y).setDepth(20);
          boss.scorpionStinger = stinger;
          boss.scorpionStingerRetracting = false;
        }
        const marker = this.add.graphics().fillStyle(0xff493c, 0.15).fillCircle(boss.targetX, boss.targetY, 96)
          .lineStyle(8, 0xff6547, 0.88).strokeCircle(boss.targetX, boss.targetY, 84)
          .lineStyle(3, 0xffdc58, 0.72).lineBetween(boss.image.x, boss.image.y, boss.targetX, boss.targetY).setDepth(8);
        this.bossMarkers.push(marker);
        this.feedback(boss.image.x, boss.image.y, "GOLPE DE VENENO! DESVIE!", 0xbaff47, true);
        audio.play("power"); haptic("power");
      }
    } else if (boss.state === "SCORPION_POISON_STRIKE") {
      if (boss.stateTimer <= 0) {
        for (const marker of this.bossMarkers) marker.destroy();
        this.bossMarkers = [];
        this.resolveScorpionStingHit(boss);
        boss.state = "SCORPION_POISON";
        boss.stateTimer = 0.35;
        // Poison wave two scatters a denser patch field than the opening wave.
        this.spawnScorpionPoisonPuddles((boss.scorpionPoisonAttacks ?? 0) >= 2 ? 36 : 24);
        this.cameras.main.shake(220, 0.003);
        this.particles.explode(28, boss.image.x, boss.image.y);
        this.feedback(boss.image.x, boss.image.y, "VENENO ESPALHADO!", 0xbaff47, true);
      }
    } else if (boss.state === "SCORPION_POISON") {
      if (boss.stateTimer <= 0) {
        if ((boss.scorpionPoisonAttacks ?? 0) >= 3) {
          const center = this.desertArenaBarrier ?? { x: arena.left + (arena.right - arena.left) * DW.scorpionArena.x, y: arena.top + (arena.bottom - arena.top) * DW.scorpionArena.y };
          const radius = Math.min(arena.right - arena.left, arena.bottom - arena.top) * DW.scorpionArena.radius;
          const dx = boss.image.x - center.x, dy = boss.image.y - center.y, length = Math.hypot(dx, dy) || 1;
          boss.targetX = Phaser.Math.Clamp(center.x + dx / length * (radius + 150), arena.left + 70, arena.right - 70);
          boss.targetY = Phaser.Math.Clamp(center.y + dy / length * (radius + 150), arena.top + 70, arena.bottom - 70);
          boss.state = "SCORPION_POISON_RETURN";
          boss.stateTimer = Math.hypot(boss.targetX - boss.image.x, boss.targetY - boss.image.y) / Math.max(boss.speed * 2.4, 220) + 0.15;
          this.feedback(center.x, center.y, "O ESCORPIÃO VAI SALTAR PARA FORA!", 0xffa34b, true);
          return;
        }
        boss.state = "SCORPION_STING_TELEGRAPH";
        const firstPoisonSting = (boss.scorpionPoisonAttacks ?? 0) === 0;
        boss.stateTimer = firstPoisonSting
          ? bossAttackTiming(1.35, preference, 1.35)
          : bossAttackTiming(boss.definition.combat.telegraphDuration * (furious ? 0.78 : 0.9), preference, 0.65);
        const dx = this.snake.x - boss.image.x, dy = this.snake.y - boss.image.y, length = Math.hypot(dx, dy) || 1;
        boss.chargeX = dx / length; boss.chargeY = dy / length;
        boss.targetX = Phaser.Math.Clamp(this.snake.x, arena.left + 64, arena.right - 64);
        boss.targetY = Phaser.Math.Clamp(this.snake.y, arena.top + 64, arena.bottom - 64);
        for (const marker of this.bossMarkers) marker.destroy();
        const marker = this.add.graphics().fillStyle(0xff493c, 0.15).fillCircle(boss.targetX, boss.targetY, 96).lineStyle(8, 0xff6547, 0.88).strokeCircle(boss.targetX, boss.targetY, 84).lineStyle(3, 0xffdc58, 0.72).lineBetween(boss.image.x, boss.image.y, boss.targetX, boss.targetY).setDepth(8);
        this.bossMarkers.push(marker);
        this.feedback(boss.targetX, boss.targetY, `PICADA DE VENENO! ${(boss.scorpionPoisonAttacks ?? 0) + 1}/3 · DESVIE!`, 0xffa34b, true);
        audio.play("error"); haptic("coin");
      }
    } else if (boss.state === "SCORPION_POISON_RETURN") {
      this.moveBossToward(boss, { x: boss.targetX, y: boss.targetY }, Math.max(boss.speed * 2.4, 220), dt);
      if (boss.stateTimer <= 0) {
        boss.image.setPosition(boss.targetX, boss.targetY).setScale(1 + boss.phase * 0.035);
        const jumpAfterPoison = boss.scorpionJumpAttackPending;
        boss.scorpionPoisonSequence = false;
        boss.scorpionPoisonAttacks = 0;
        boss.scorpionJumpAttackPending = false;
        const jumpAttack = jumpAfterPoison || boss.health <= 2;
        boss.scorpionJumpAttackActive = jumpAttack;
        boss.state = jumpAttack ? "SCORPION_JUMP_TELEGRAPH" : "CHASE";
        boss.stateTimer = jumpAttack
          ? bossAttackTiming(boss.definition.combat.telegraphDuration * 1.5, preference, 1.5)
          : bossAttackTiming(boss.definition.combat.attackCooldown, preference, 1.4);
        if (jumpAttack) {
          boss.scorpionJumpStartX = boss.image.x;
          boss.scorpionJumpStartY = boss.image.y;
          boss.stateTargetX = Phaser.Math.Clamp(this.snake.x, arena.left + 80, arena.right - 80);
          boss.stateTargetY = Phaser.Math.Clamp(this.snake.y, arena.top + 80, arena.bottom - 80);
          const marker = this.add.graphics().fillStyle(0xff493c, 0.2).fillCircle(boss.stateTargetX, boss.stateTargetY, 132)
            .lineStyle(9, 0xff6547, 0.95).strokeCircle(boss.stateTargetX, boss.stateTargetY, 118)
            .lineStyle(4, 0xffdc58, 0.85).strokeCircle(boss.stateTargetX, boss.stateTargetY, 104).setDepth(8);
          this.bossMarkers.push(marker);
          this.feedback(boss.stateTargetX, boss.stateTargetY, "SALTO! DESVIE!", 0xffa34b, true);
          audio.play("error"); haptic("coin");
        }
      }
    } else if (boss.state === "SCORPION_JUMP_TELEGRAPH") {
      if (boss.stateTimer <= 0) {
        for (const marker of this.bossMarkers) marker.destroy();
        this.bossMarkers = [];
        boss.targetX = boss.stateTargetX ?? this.snake.x;
        boss.targetY = boss.stateTargetY ?? this.snake.y;
        boss.state = "SCORPION_JUMP";
        boss.stateTimer = 0.85;
        boss.scorpionJumpStartX = boss.image.x;
        boss.scorpionJumpStartY = boss.image.y;
        const marker = this.add.graphics().fillStyle(0xff493c, 0.2).fillCircle(boss.targetX, boss.targetY, 132)
          .lineStyle(9, 0xff6547, 0.95).strokeCircle(boss.targetX, boss.targetY, 118)
          .lineStyle(4, 0xffdc58, 0.85).strokeCircle(boss.targetX, boss.targetY, 104).setDepth(8);
        this.bossMarkers.push(marker);
        audio.play("power"); haptic("power");
      }
    } else if (boss.state === "SCORPION_JUMP") {
      const jumpDuration = 0.85;
      const progress = Phaser.Math.Clamp(1 - boss.stateTimer / jumpDuration, 0, 1);
      const startX = boss.scorpionJumpStartX ?? boss.image.x;
      const startY = boss.scorpionJumpStartY ?? boss.image.y;
      boss.image.setPosition(Phaser.Math.Linear(startX, boss.targetX, progress), Phaser.Math.Linear(startY, boss.targetY, progress));
      if (boss.stateTimer <= 0) {
        const impactPoint = { x: boss.targetX, y: boss.targetY };
        boss.image.setPosition(impactPoint.x, impactPoint.y).setScale(1 + boss.phase * 0.035);
        for (const marker of this.bossMarkers) marker.destroy();
        this.bossMarkers = [];
        // Resolve at the telegraphed landing point, not the old takeoff point.
        const hitZone = scorpionJumpHitZone(
          impactPoint, this.snake, this.snake.body.slice(0, this.snake.length),
          118, B.snake.radius, B.snake.radius,
        );
        const effect = scorpionJumpEffect(hitZone, {
          // Each marked landing is a distinct attack; contact grace must not
          // suppress its damage. Explicit power-up protections still apply.
          invulnerable: this.powers.invincible > 0,
          ghost: this.powers.ghostActive,
          shield: this.powers.shield,
        }, Math.max(0, this.snake.length - B.snake.initial));
        this.spawnScorpionPoisonPuddles(16, Number.POSITIVE_INFINITY, 150);
        if (effect !== "miss" && effect !== "protected") {
          const shield = this.powers.shield;
          if (effect === "shield" && this.powers.absorb()) {
            if (shield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
          } else if (effect === "life") {
            if (!this.loseLife()) { this.die(); return; }
            this.feedback(this.snake.x, this.snake.y, `ESMAGADO! −1 VIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
          } else if (effect === "segments") {
            this.snake.length = Math.max(B.snake.initial, this.snake.length - 5);
            this.feedback(this.snake.x, this.snake.y, "ESMAGADO! −5 SEGMENTOS", 0xff7867, true);
          } else if (shield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
          this.bossCollisionGrace = boss.definition.combat.hitInvulnerability;
          this.renderSnake();
        }
        this.cameras.main.shake(350, 0.006);
        this.particles.explode(32, boss.image.x, boss.image.y);
        audio.play("error"); haptic("power");
        boss.state = "SCORPION_JUMP_LAND";
        boss.stateTimer = 0.45;
        this.feedback(boss.image.x, boss.image.y, "ATERRISSOU! VULNERÁVEL!", 0xffdc58, true);
      }
    } else if (boss.state === "SCORPION_JUMP_LAND" && boss.stateTimer <= 0) {
      boss.scorpionJumpAttackActive = false;
      boss.state = "STUNNED";
      boss.stateTimer = 3;
      this.feedback(boss.image.x, boss.image.y, "VULNERÁVEL! ATAQUE COM A AURA!", 0xffdc58, true);
    } else if (boss.state === "CHASE") {
      if (boss.health <= 2 && boss.stateTimer <= 0) {
        boss.scorpionJumpAttackActive = true;
        boss.state = "SCORPION_JUMP_TELEGRAPH";
        boss.stateTimer = bossAttackTiming(boss.definition.combat.telegraphDuration, preference, 0.9);
        boss.stateTargetX = Phaser.Math.Clamp(this.snake.x, arena.left + 80, arena.right - 80);
        boss.stateTargetY = Phaser.Math.Clamp(this.snake.y, arena.top + 80, arena.bottom - 80);
        const marker = this.add.graphics().fillStyle(0xff493c, 0.2).fillCircle(boss.stateTargetX, boss.stateTargetY, 132)
          .lineStyle(9, 0xff6547, 0.95).strokeCircle(boss.stateTargetX, boss.stateTargetY, 118)
          .lineStyle(4, 0xffdc58, 0.85).strokeCircle(boss.stateTargetX, boss.stateTargetY, 104).setDepth(8);
        this.bossMarkers.push(marker);
        this.feedback(boss.stateTargetX, boss.stateTargetY, "SALTO! DESVIE!", 0xffa34b, true);
        audio.play("error"); haptic("coin");
        return;
      }
      this.moveBossToward(boss, this.snake, boss.speed * (furious ? 1.35 : 0.92 + boss.phase * 0.12), dt);
      if (boss.stateTimer <= 0) {
        boss.state = "SCORPION_STING_TELEGRAPH";
        boss.stateTimer = bossAttackTiming(boss.definition.combat.telegraphDuration * (furious ? 0.78 : 1 - boss.phase * 0.1), preference, 0.65);
        const dx = this.snake.x - boss.image.x, dy = this.snake.y - boss.image.y, length = Math.hypot(dx, dy) || 1;
        boss.chargeX = dx / length; boss.chargeY = dy / length;
        // The sting targets the player's current location anywhere in the arena.
        boss.targetX = Phaser.Math.Clamp(this.snake.x, arena.left + 64, arena.right - 64);
        boss.targetY = Phaser.Math.Clamp(this.snake.y, arena.top + 64, arena.bottom - 64);
        for (const marker of this.bossMarkers) marker.destroy();
        const marker = this.add.graphics().fillStyle(0xff493c, 0.15).fillCircle(boss.targetX, boss.targetY, 96).lineStyle(8, 0xff6547, 0.88).strokeCircle(boss.targetX, boss.targetY, 84).lineStyle(3, 0xffdc58, 0.72).lineBetween(boss.image.x, boss.image.y, boss.targetX, boss.targetY).setDepth(8);
        this.bossMarkers.push(marker);
        this.feedback(boss.targetX, boss.targetY, furious ? "PICADA FURIOSA! DESVIE!" : "PICADA! DESVIE!", 0xffa34b, true);
        audio.play("error"); haptic("coin");
      }
    } else if (boss.state === "SCORPION_STING_TELEGRAPH") {
      if (boss.stateTimer <= 0) {
        for (const marker of this.bossMarkers) marker.destroy(); this.bossMarkers = [];
        boss.state = "SCORPION_STING"; boss.stateTimer = 0.55;
        if (boss.scorpionTail && !boss.scorpionStinger) {
          const stinger = this.add.graphics();
          stinger.setPosition(boss.image.x, boss.image.y).setDepth(20);
          boss.scorpionStinger = stinger;
          boss.scorpionStingerRetracting = false;
        }
        audio.play("power"); haptic("power");
      }
    } else if (boss.state === "SCORPION_STING") {
      if (boss.stateTimer <= 0) {
        for (const marker of this.bossMarkers) marker.destroy();
        this.bossMarkers = [];
        this.resolveScorpionStingHit(boss);
        if (boss.scorpionPoisonSequence) {
          boss.scorpionPoisonAttacks = (boss.scorpionPoisonAttacks ?? 0) + 1;
          if (boss.scorpionPoisonAttacks >= 3) {
            const center = this.desertArenaBarrier ?? { x: arena.left + (arena.right - arena.left) * DW.scorpionArena.x, y: arena.top + (arena.bottom - arena.top) * DW.scorpionArena.y };
            const radius = Math.min(arena.right - arena.left, arena.bottom - arena.top) * DW.scorpionArena.radius;
            const dx = boss.image.x - center.x, dy = boss.image.y - center.y, length = Math.hypot(dx, dy) || 1;
            boss.targetX = Phaser.Math.Clamp(center.x + dx / length * (radius + 150), arena.left + 70, arena.right - 70);
            boss.targetY = Phaser.Math.Clamp(center.y + dy / length * (radius + 150), arena.top + 70, arena.bottom - 70);
            boss.state = "SCORPION_POISON_RETURN";
            boss.stateTimer = Math.hypot(boss.targetX - boss.image.x, boss.targetY - boss.image.y) / Math.max(boss.speed * 2.4, 220) + 0.15;
            this.feedback(center.x, center.y, "O ESCORPIÃO VAI SALTAR PARA FORA!", 0xffa34b, true);
          } else {
            boss.state = "SCORPION_POISON";
            boss.stateTimer = 3;
            this.feedback(boss.image.x, boss.image.y, `FERROADA ${boss.scorpionPoisonAttacks}/3!`, 0xff7867, true);
          }
        } else {
          boss.state = "SCORPION_LAND"; boss.stateTimer = 0.45;
          this.feedback(boss.image.x, boss.image.y, "VULNERÁVEL! PREPARE A AURA!", 0xffdc58, true);
        }
      }
    } else if (boss.state === "SCORPION_LAND" && boss.stateTimer <= 0) {
      boss.state = "STUNNED";
      boss.stateTimer = 3;
    } else if (boss.state === "STUNNED" && boss.stateTimer <= 0) {
      boss.state = "RECOVER"; boss.stateTimer = 0.65;
    } else if (boss.state === "RECOVER" && boss.stateTimer <= 0) {
      boss.state = "CHASE";
      boss.stateTimer = bossAttackTiming(boss.definition.combat.attackCooldown * (furious ? 0.68 : 1 - boss.phase * 0.12), preference, 1.4);
    }
  }
  private resolveScorpionStingHit(boss: NonNullable<GameScene["boss"]>) {
    // Resolve at the exact point shown by the warning marker. Using the boss
    // position here made the visible target and actual hit area disagree.
    const hitZone = scorpionStingHitZone(
      { x: boss.targetX, y: boss.targetY },
      this.snake,
      this.snake.body.slice(0, this.snake.length),
      84,
      B.snake.radius,
      B.snake.radius,
    );
    const protections = {
      // Each resolved sting is a distinct attack. Only explicit player powers
      // protect against it; automatic collision grace is intentionally ignored.
      invulnerable: this.powers.invincible > 0 || this.powers.freezeRemaining > 0,
      ghost: this.powers.ghostActive,
      shield: this.powers.shield,
    };
    const effect = boss.state === "SCORPION_POISON_STRIKE"
      ? scorpionPoisonStrikeEffect(hitZone, this.snake.length, B.snake.initial, protections)
      : scorpionStingEffect(hitZone, this.snake.length, B.snake.initial, protections);
    if (effect === "miss") {
      this.feedback(boss.targetX, boss.targetY, "VOCÊ DESVIOU!", 0x8ff0a4);
      return;
    }
    if (effect === "protected") {
      this.feedback(this.snake.x, this.snake.y, "PROTEGIDO!", 0x70cfff);
      return;
    }
    const shield = this.powers.shield;
    if (effect === "shield") {
      this.powers.absorb();
      if (shield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
    } else if (effect === "life") {
      if (!this.loseLife()) { this.die(); return; }
      this.feedback(this.snake.x, this.snake.y, `PICADA! −1 VIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
    } else {
      this.snake.length = Math.max(B.snake.initial, this.snake.length - 1);
      this.feedback(this.snake.x, this.snake.y, "PICADA! −1 SEGMENTO", 0xff7867, true);
    }
    this.bossCollisionGrace = boss.definition.combat.hitInvulnerability;
    this.renderSnake();
    if (hitZone === "body") this.feedback(boss.targetX, boss.targetY, "PICADA!", 0xff7867, true);
  }
  private updateCandyBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const preference = this.gameDifficulty;
    const attackCooldown = bossAttackTiming(boss.definition.combat.attackCooldown * (boss.phase === 0 ? 1 : boss.phase === 1 ? 0.88 : 0.76), preference, 1.5);
    const telegraphDuration = candyTelegraphTiming(
      boss.definition.combat.telegraphDuration * (boss.phase === 0 ? 1 : boss.phase === 1 ? 0.92 : 0.84) * difficultyProfile(preference).bossTimingMultiplier,
        difficulty(this.run.elapsed, this.run.score, this.snake.length, preference).speed * this.worldSpeedMultiplier *
        (this.powers.slowed > 0 ? B.hazard.slowMultiplier : 1) *
        (this.powers.precision > 0 ? B.power.precisionSpeed : 1) *
        (this.turbo.active ? B.power.turboSpeed : 1) * this.stickySpeed *
        (inCandyRiver(this.snake, B.arena.left, B.arena.top, B.arena.right, B.arena.bottom) ? CW.river.slowMultiplier : 1),
      64,
    );
    if (boss.state === "CANDY_FLEE") {
      const away = { x: boss.image.x - this.snake.x, y: boss.image.y - this.snake.y }, length = Math.hypot(away.x, away.y) || 1;
      const destination = { x: Phaser.Math.Clamp(boss.image.x + away.x / length * 260, B.arena.left + 90, B.arena.right - 90), y: Phaser.Math.Clamp(boss.image.y + away.y / length * 260, B.arena.top + 90, B.arena.bottom - 90) };
      this.moveBossToward(boss, destination, boss.speed * 1.5, dt);
      if (boss.stateTimer <= 0) {
        boss.state = "CHASE";
        boss.stateTimer = attackCooldown;
      }
      return;
    }
    if (boss.state === "ATTACK_MODE" && this.bossFight.combat.active) {
      this.moveBossToward(boss, this.snake, boss.speed, dt);
      return;
    }
    if (boss.state === "DROP_ATTACK") {
      if (boss.stateTimer <= 0) {
        const marker = this.bossMarkers.pop(); marker?.destroy();
        const attackRadius = 64;
        const splat = this.add.graphics()
          .fillStyle(0x8e3c21, 0.2).fillEllipse(0, 13, attackRadius * 2.2, attackRadius * 1.35)
          .fillStyle(0xe7a52f, 0.76).fillEllipse(-9, 0, attackRadius * 1.45, attackRadius * 1.2)
          .fillStyle(0xffd36c, 0.5).fillEllipse(-15, -8, attackRadius * 0.8, attackRadius * 0.48)
          .fillStyle(0xe7a52f, 0.76).fillCircle(39, -18, 10).fillCircle(-43, 19, 7)
          .lineStyle(3, 0xffe39a, 0.8).strokeEllipse(-9, 0, attackRadius * 1.45, attackRadius * 1.2);
        const targetX = boss.targetX, targetY = boss.targetY;
        const zone = this.add.container(targetX, targetY, [splat]).setDepth(7);
        zone.setScale(0.45);
        this.tweens.add({ targets: zone, scale: 1, duration: 180, ease: "Back.Out" });
        this.tweens.add({ targets: zone, alpha: 0, delay: 4500, duration: 400, onComplete: () => { zone.destroy(); this.stickyZones = this.stickyZones.filter((item) => Math.hypot(item.x - targetX, item.y - targetY) > 100); this.candyHoneyZones = this.candyHoneyZones.filter((item) => Math.hypot(item.x - targetX, item.y - targetY) > 100); this.renderStickyZones(); } });
        const headHit = distance(this.snake, { x: targetX, y: targetY }) < attackRadius + B.snake.radius;
          const bodyHit = this.snake.body.slice(1, this.snake.length).some((segment) => distance(segment, { x: targetX, y: targetY }) < attackRadius + B.snake.radius);
        const standingInHoney = this.candyHoneyZones.some((honey) => Math.hypot(this.snake.x - honey.x, this.snake.y - honey.y) < honey.radius);
        const slowedInHoney = standingInHoney && this.stickySpeed < 0.99;
        this.candyHoneyZones.push({ x: targetX, y: targetY, radius: attackRadius - 2, expiresAt: this.run.elapsed + 4.9 });
        if (this.candyHoneyZones.length > 4) this.candyHoneyZones.shift();
        if (headHit && !this.powers.ghostActive && !this.powers.freezeBlocksDamage()) {
          const hadShield = this.powers.shield;
          const hadInvincibility = this.powers.invincible > 0;
          if (standingInHoney && (this.candyAttackSlow > 0 || slowedInHoney)) {
            if (!this.powers.absorb()) {
              if (!this.loseLife()) { this.die(); return; }
              this.candyAttackSlow = 0;
              this.feedback(this.snake.x, this.snake.y, `PRESO NO MEL! −1 VIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
            } else if (hadShield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
            else if (hadInvincibility) this.feedback(this.snake.x, this.snake.y, "PROTEGIDO!", 0x70cfff);
          } else if (!this.powers.absorb()) {
            this.candyAttackSlow = 0.5;
            this.powers.slowed = Math.max(this.powers.slowed, 0.5);
            this.feedback(this.snake.x, this.snake.y, "MEL! LENTO 0,5s", 0xffd36c, true);
          } else if (hadShield) this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff);
          else if (hadInvincibility) this.feedback(this.snake.x, this.snake.y, "PROTEGIDO!", 0x70cfff);
        } else if (!headHit && bodyHit && !this.powers.ghostActive && !this.powers.freezeBlocksDamage()) {
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
        if (this.stickyZones.length < 4) {
          this.stickyZones.push({ x: targetX, y: targetY, radius: attackRadius - 2 });
          this.renderStickyZones();
        }
        boss.state = "CHASE"; boss.stateTimer = attackCooldown;
      }
    } else if (boss.state === "ATTACK_MODE") {
      boss.state = "CHASE";
    } else {
      this.moveBossToward(boss, this.snake, boss.speed, dt);
      if (boss.stateTimer <= 0) {
        boss.state = "DROP_ATTACK"; boss.stateTimer = telegraphDuration;
        boss.targetX = this.snake.x; boss.targetY = this.snake.y;
        const markerRadius = 58;
        const marker = this.add.graphics().fillStyle(0xff5e8b, 0.28).fillCircle(boss.targetX, boss.targetY, markerRadius).lineStyle(6, 0xff5283).strokeCircle(boss.targetX, boss.targetY, markerRadius).setDepth(8);
        this.bossMarkers.push(marker); audio.play("error");
      }
    }
    if (boss.definition.id === "candy-monster" && boss.phase >= 1 && !this.powers.shield && !this.bossPickups.some((item) => item.kind === "candy-shield") && Math.random() < dt * 0.08) this.spawnBossPickup("candy-shield", 0, "S", 0x70cfff);
  }
  private drawKrakenTentacle(graphic: Phaser.GameObjects.Graphics, startX: number, startY: number, progress: number) {
    const endX = startX * (1 - progress), endY = startY * (1 - progress);
    const length = Math.hypot(endX - startX, endY - startY) || 1;
    const normalX = -(endY - startY) / length, normalY = (endX - startX) / length;
    const bend = Math.min(54, length * 0.13) * progress;
    const controlX = (startX + endX) / 2 + normalX * bend;
    const controlY = (startY + endY) / 2 + normalY * bend;
    const centers: Array<{ x: number; y: number; nx: number; ny: number; width: number }> = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, inverse = 1 - t;
      const x = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX;
      const y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY;
      const dx = 2 * inverse * (controlX - startX) + 2 * t * (endX - controlX);
      const dy = 2 * inverse * (controlY - startY) + 2 * t * (endY - controlY);
      const tangentLength = Math.hypot(dx, dy) || 1;
      centers.push({ x, y, nx: -dy / tangentLength, ny: dx / tangentLength, width: (34 - 23 * t) * progress });
    }
    const outline = [
      ...centers.map((point) => new Phaser.Geom.Point(point.x + point.nx * point.width, point.y + point.ny * point.width)),
      ...centers.slice().reverse().map((point) => new Phaser.Geom.Point(point.x - point.nx * point.width, point.y - point.ny * point.width)),
    ];
    graphic.fillStyle(0x102e45, 0.98).fillPoints(outline, true);
    const inner = [
      ...centers.map((point) => new Phaser.Geom.Point(point.x + point.nx * point.width * 0.73, point.y + point.ny * point.width * 0.73)),
      ...centers.slice().reverse().map((point) => new Phaser.Geom.Point(point.x - point.nx * point.width * 0.73, point.y - point.ny * point.width * 0.73)),
    ];
    graphic.fillStyle(0x397f94, 1).fillPoints(inner, true);
    graphic.lineStyle(Math.max(2, 4 * progress), 0x8ce8e8, 0.9).beginPath();
    centers.forEach((point, index) => index === 0 ? graphic.moveTo(point.x + point.nx * point.width * 0.38, point.y + point.ny * point.width * 0.38) : graphic.lineTo(point.x + point.nx * point.width * 0.38, point.y + point.ny * point.width * 0.38));
    graphic.strokePath();
    for (let i = 2; i <= 10; i += 2) {
      const point = centers[i];
      const x = point.x - point.nx * point.width * 0.32, y = point.y - point.ny * point.width * 0.32;
      const radius = Math.max(1.5, 4.5 * progress * (1 - i / 18));
      graphic.fillStyle(0x173c50, 0.95).fillCircle(x, y, radius + 1.5 * progress);
      graphic.fillStyle(0xc8f1d8, 0.92).fillCircle(x, y, radius * 0.54);
    }
    const tip = centers[centers.length - 1];
    graphic.fillStyle(0x9ce8dc, 1).fillCircle(tip.x, tip.y, Math.max(3, 10 * progress));
  }

  private updateKrakenBehavior(boss: NonNullable<GameScene["boss"]>, dt: number) {
    const preference = this.gameDifficulty;
    boss.image.x = B.arena.left + (B.arena.right - B.arena.left) * OW.krakenArena.x;
    boss.image.y = B.arena.top + (B.arena.bottom - B.arena.top) * OW.krakenArena.y;
    if (boss.phase >= 1 && !this.bossCurrent) {
      this.bossCurrent = { x: B.arena.left + 700, y: B.arena.top + 650, direction: Math.PI, force: boss.phase >= 2 ? 20 : 13, life: 7, graphics: this.add.graphics().setDepth(5) };
    }
    if (boss.phase >= 2 && this.powers.freezeRemaining <= 0) {
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
      const target = krakenAttackTarget(this.snake, B.arena, 96); boss.targetX = target.x; boss.targetY = target.y;
      const marker = this.add.graphics().fillStyle(0xf05bce, 0.1).fillCircle(target.x, target.y, 66)
        .lineStyle(7, 0xff71d2, 0.95).strokeCircle(target.x, target.y, 66)
        .lineStyle(3, 0xffd3f4, 0.85).strokeCircle(target.x, target.y, 87)
        .lineStyle(5, 0xff71d2, 0.9);
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        marker.lineBetween(target.x + Math.cos(angle) * 72, target.y + Math.sin(angle) * 72, target.x + Math.cos(angle) * 82, target.y + Math.sin(angle) * 82);
      }
      marker.setDepth(8);
      this.bossMarkers.push(marker); audio.play("error"); haptic("coin"); this.feedback(target.x, target.y, "TENTACLE!", 0x60dfeb, true);
    } else if (boss.state === "TELEGRAPH_SLAM" && boss.stateTimer <= 0) {
      for (const marker of this.bossMarkers) marker.destroy(); this.bossMarkers = [];
      const tentacleGraphic = this.add.graphics();
      const startX = boss.image.x - boss.targetX, startY = boss.image.y - boss.targetY;
      this.drawKrakenTentacle(tentacleGraphic, startX, startY, 0.01);
      boss.hazard = this.add.container(boss.targetX, boss.targetY, [tentacleGraphic]).setDepth(10);
      boss.state = "ATTACK_EXTEND"; boss.stateTimer = 0.34;
    } else if (boss.state === "ATTACK_EXTEND") {
      const progress = Phaser.Math.Clamp(1 - boss.stateTimer / 0.34, 0.01, 1);
      const graphic = boss.hazard?.list[0];
      if (graphic instanceof Phaser.GameObjects.Graphics) {
        const startX = boss.image.x - boss.targetX, startY = boss.image.y - boss.targetY;
        graphic.clear();
        this.drawKrakenTentacle(graphic, startX, startY, progress);
      }
      if (boss.stateTimer <= 0) {
        const hitZone = krakenHitZone({ x: boss.targetX, y: boss.targetY }, this.snake, this.snake.body, 90);
        const hit = hitZone !== "miss";
        const tentacleIndex = Math.abs(Math.round(boss.doubleCharge - 1)) % (boss.krakenTentacles?.length ?? 8);
        const tentacleHit = hit && this.bossFight.combat.active && this.bossFight.combat.bossId === "kraken" && this.bossFight.combat.consumeHit("kraken");
        const attackHit = hit && !tentacleHit && !this.powers.blocksAttack();
        if (tentacleHit && boss.krakenTentacleTimers) boss.krakenTentacleTimers[tentacleIndex] = 1.4;
        if (attackHit) {
          const hadShield = this.powers.shield;
          if (this.powers.invincible <= 0 && !this.powers.ghostActive && !this.powers.absorb()) {
            if (hitZone === "head") {
              if (!this.loseLife()) { this.die(); return; }
              this.feedback(this.snake.x, this.snake.y, `KRAKEN! −1 VIDA · ♥ ${this.powers.lives}`, 0xff5b78, true);
            } else {
              this.snake.length = Math.max(B.snake.initial, this.snake.length - 3);
              this.feedback(this.snake.x, this.snake.y, "KRAKEN! −3 SEGMENTOS", 0xff8c68, true);
            }
          } else if (hadShield && this.powers.invincible > 0) {
            this.feedback(this.snake.x, this.snake.y, "ESCUDO!", 0x70cfff, true);
          }
        }
        boss.state = attackHit || tentacleHit ? "RECOVER" : "EXPOSED";
        boss.stateTimer = attackHit || tentacleHit ? 1.2 : 2.8;
        if (tentacleHit) {
          boss.hazard?.destroy(); boss.hazard = undefined;
          this.damageBoss();
          if (boss.krakenTentacleTimers) boss.krakenTentacleTimers[tentacleIndex] = 1.4;
          if (boss.krakenTentacles?.[tentacleIndex]) boss.krakenTentacles[tentacleIndex].setVisible(false);
          boss.krakenSuckers?.[tentacleIndex]?.setVisible(false);
          boss.krakenHitFlash = 0.54;
          this.feedback(boss.targetX, boss.targetY, "TENTÁCULO ATINGIDO · −1 HP", 0x69e6ff, true);
          audio.play("power"); haptic("power");
        }
        if (!attackHit) audio.play("pearl_coin");
        else audio.play("current_flow");
      }
    } else if (boss.state === "KRAKEN_HEAL" && boss.stateTimer <= 0) {
      boss.health = Math.min(boss.definition.maxHealth, boss.health + 3);
      boss.hazard?.destroy(); boss.hazard = undefined;
      this.bossPickups.filter((pickup) => pickup.kind === "attack-pearl").forEach((pickup) => pickup.image.destroy());
      this.bossPickups = this.bossPickups.filter((pickup) => pickup.kind !== "attack-pearl");
      boss.state = "RECOVER"; boss.stateTimer = 1.5;
      this.krakenBarrierGate?.setVisible(false);
      if (this.krakenBarrier) this.tweens.add({ targets: this.krakenBarrier, alpha: 0.28, duration: 180, yoyo: true, repeat: 3 });
      this.feedback(boss.image.x, boss.image.y, "+3 HP · CURA DO KRAKEN", 0x69e6ff, true);
      audio.play("power");
    } else if (boss.state === "EXPOSED" && boss.stateTimer <= 0) {
      boss.hazard?.destroy(); boss.hazard = undefined; boss.state = "RECOVER"; boss.stateTimer = 1.2;
    } else if (boss.state === "RECOVER" && boss.stateTimer <= 0) {
      boss.hazard?.destroy(); boss.hazard = undefined;
      const baseCooldown = Math.max(2, boss.definition.combat.attackCooldown - boss.phase * 0.45);
      const krakenIntensity = boss.definition.id === "kraken"
        ? boss.health <= 2 ? 0.8 : boss.health <= 6 ? 0.9 : 1
        : 1;
      boss.state = "IDLE"; boss.stateTimer = bossAttackTiming(baseCooldown * krakenIntensity, preference, 1.5);
    }
  }
  private damageBoss() {
    if (!this.boss) return;
    const previousHealth = this.boss.health;
    this.boss.health--;
    if (this.boss.health > 0) {
      const thresholds = this.boss.definition.phases;
      const nextPhase = this.boss.definition.id === "candy-monster"
        ? this.boss.health <= 2 ? 2 : this.boss.health <= 4 ? 1 : 0
        : thresholds.findIndex((threshold) => this.boss!.health <= threshold);
      if (nextPhase > this.boss.phase) {
        this.boss.phase = nextPhase;
        this.boss.state = this.boss.definition.id === "kraken" ? "RECOVER" : "CHASE";
        this.boss.stateTimer = 1.2;
        const phaseSpeed = this.boss.definition.id === "candy-monster" ? this.boss.definition.movementSpeed : this.boss.definition.movementSpeed * (1 + nextPhase * 0.12);
        this.boss.speed = bossMovementSpeed(phaseSpeed, this.gameDifficulty);
        if (this.boss.definition.id === "king-snake" && this.boss.health <= 2) {
          this.tweens.add({ targets: this.boss.image, alpha: 0.45, scale: 1.12, duration: 140, yoyo: true, repeat: 2 });
          audio.play("power"); haptic("power");
        }
        if (this.boss.definition.id === "kraken") {
          this.bossCurrent = undefined; this.bossWhirlpool?.clear();
        }
      }
      const crossedPoisonThreshold = previousHealth > 5 && this.boss.health <= 5 || previousHealth > 2 && this.boss.health <= 2;
      if (this.boss.definition.id === "scorpion-king" && crossedPoisonThreshold) {
        this.boss.scorpionJumpAttackPending = previousHealth > 2 && this.boss.health <= 2;
        const arena = B.arena;
        const radius = Math.min(arena.right - arena.left, arena.bottom - arena.top) * DW.scorpionArena.radius;
        const center = this.desertArenaBarrier ?? { x: arena.left + (arena.right - arena.left) * DW.scorpionArena.x, y: arena.top + (arena.bottom - arena.top) * DW.scorpionArena.y };
        const dx = this.boss.image.x - center.x, dy = this.boss.image.y - center.y;
        const distance = Math.hypot(dx, dy) || 1;
        this.boss.targetX = center.x + dx / distance * (radius + 150);
        this.boss.targetY = center.y + dy / distance * (radius + 150);
        this.boss.state = "SCORPION_POISON_JUMP";
         this.boss.stateTimer = Math.hypot(dx, dy) / 420 + 0.8;
        this.boss.scorpionJumpStartX = this.boss.image.x;
        this.boss.scorpionJumpStartY = this.boss.image.y;
        this.feedback(center.x, center.y, "O ESCORPIÃO VAI SALTAR!", 0xffa34b, true);
        audio.play("error"); haptic("coin");
      }
      if (this.boss.definition.id === "kraken" && this.boss.health <= 2 && !this.boss.krakenHealAttempted) {
        this.boss.krakenHealAttempted = true;
        this.boss.state = "KRAKEN_HEAL"; this.boss.stateTimer = 18;
        this.krakenHealExitTimer = 0;
        this.krakenBarrierGate?.setVisible(false);
        if (this.krakenBarrier) this.tweens.add({ targets: this.krakenBarrier, alpha: 0.22, duration: 240, ease: "Sine.easeOut" });
        this.boss.hazard = this.add.container(this.boss.image.x, this.boss.image.y).setDepth(9);
        const healWarning = this.add.graphics().fillStyle(0x3adcf4, 0.18).fillCircle(0, 0, 115)
          .lineStyle(8, 0x69e6ff, 0.95).strokeCircle(0, 0, 90)
          .lineStyle(3, 0xc1f8ff, 0.9).strokeCircle(0, 0, 108);
        const healLabel = this.add.text(0, -135, "ABSORVENDO ENERGIA", { fontSize: "16px", color: "#aaf6ff", fontStyle: "bold", stroke: "#06202a", strokeThickness: 4 }).setOrigin(0.5);
        this.boss.hazard.add([healWarning, healLabel]);
        this.tweens.add({ targets: healWarning, alpha: 0.3, scale: 1.18, duration: 350, yoyo: true, repeat: -1 });
        const healAura = this.add.graphics().lineStyle(5, 0x69e6ff, 0.72).strokeCircle(0, 0, 128);
        this.boss.hazard.add(healAura);
        this.tweens.add({ targets: healAura, alpha: 0.15, scale: 1.3, duration: 550, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
      return;
    }
    const defeated = this.boss.definition;
    const defeatedX = this.boss.image.x, defeatedY = this.boss.image.y;
    if (defeated.id === "spider-queen") {
      this.spiderArenaOpen = true;
      for (const spiderling of this.spiderlings) {
        this.tweens.killTweensOf(spiderling.image);
        spiderling.image.destroy();
      }
      this.spiderlings = [];
      this.spiderlingTimer = Number.POSITIVE_INFINITY;
      this.spiderExitWeb?.destroy(); this.spiderExitWeb = undefined;
      for (const web of this.spiderWebZones) web.graphic.destroy();
      for (const { zone } of this.spiderWebZones) {
        const index = this.stickyZones.indexOf(zone);
        if (index >= 0) this.stickyZones.splice(index, 1);
      }
      this.spiderWebZones = [];
      this.stickyZones = [];
      this.stickyGraphics?.clear();
      this.spiderWebTimer = Number.POSITIVE_INFINITY;
      this.renderStickyZones();
      if (this.worldPortal?.active) {
        this.worldPortal.setVisible(true).setAlpha(1).setDepth(21);
        this.worldPortal.setData("blockedByWeb", false);
        this.worldPortal.setData("entryHint", "Saída aberta para Green Valley.");
        const exitLabel = this.worldPortal.getAt(1);
        if (exitLabel instanceof Phaser.GameObjects.Text) exitLabel.setText("SAÍDA · GREEN VALLEY");
        const web = this.worldPortal.getAt(2);
        if (web?.active) web.destroy();
        // Keep the opened exit in view immediately after the victory overlay closes.
        this.cameraX = this.worldPortal.x;
        this.cameraY = this.worldPortal.y;
        this.updateCamera(0, true);
      }
      if (this.spiderArena) {
        this.tweens.killTweensOf(this.spiderArena);
        this.tweens.add({ targets: this.spiderArena, alpha: 0, duration: 700, ease: "Sine.easeOut",
          onComplete: () => {
            this.spiderArena?.destroy();
            this.spiderArena = undefined;
          },
        });
      }
    }
    this.spiderStalactite?.destroy(); this.spiderStalactite = undefined;
    this.spiderStalactiteReady = false; this.spiderStalactiteFalling = false;
    this.particles.explode(30, defeatedX, defeatedY);
    for (const segment of this.boss.bodySegments) segment.destroy();
    this.boss.hazard?.destroy();
    this.boss.scorpionStinger?.destroy();
    this.boss.image.destroy(); this.boss = undefined;
    this.krakenBarrier?.destroy(); this.krakenBarrier = undefined;
    this.desertArenaBarrier?.destroy(); this.desertArenaBarrier = undefined;
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
    if (this.powers.lives < B.power.maxLives) {
      const rewardPoint = this.bossSafePoint(150);
      this.spawnBossPickupAt("life-reward", rewardPoint.x, rewardPoint.y, "♥", 0xff5b78);
      this.feedback(rewardPoint.x, rewardPoint.y, "RECOMPENSA DO CHEFE · +1 VIDA", 0xff5b78, true);
    }
    const first = !save.profile.bossesDefeated.includes(defeated.id);
    if (first) {
      save.profile.bossesDefeated.push(defeated.id);
      const petRewards = [...new Set([defeated.petReward, ...(defeated.additionalPetRewards ?? []), ...pets.filter((pet) => pet.id !== "tiny-dragon" && pet.bossRewardId === defeated.id && pet.requiredBossIds?.every((bossId) => save.profile.bossesDefeated.includes(bossId))).map((pet) => pet.id)].filter((id): id is string => Boolean(id)))];
      save.profile.availablePets = [...new Set([...save.profile.availablePets, ...petRewards.filter((id) => id !== "tiny-dragon")])];
      const freePetRewards = petRewards.filter((id) => pets.find((pet) => pet.id === id)?.unlockType === "BOSS" && !pets.find((pet) => pet.id === id)?.coinPrice);
      save.profile.unlockedPets = [...new Set([...save.profile.unlockedPets, ...freePetRewards])];
      const skinRewards = getBossSkinRewards(defeated.id);
      save.profile.unlockedSkins = [...new Set([...save.profile.unlockedSkins, ...skinRewards.map((skin) => skin.id)])];
      if (defeated.id === "scorpion-king") save.profile.worldsUnlocked = [...new Set([...save.profile.worldsUnlocked, "spider-lair"] )];
      save.profile.totalCoins += defeated.rewardCoins;
      addXP(save.profile, defeated.rewardXP);
    }
    if (defeated.id === "kraken") {
      save.profile.worldsUnlocked = [...new Set([...save.profile.worldsUnlocked, "silent-abyss"] )];
      this.revealAbyssPortal();
    }
    if (defeated.id === "scorpion-king") {
      if (this.currentWorld === "desert") this.revealDesertExpeditionPortal();
      this.ui.toast("Uma entrada de pedra animada aguarda você entre as ruínas do Deserto.");
    }
    const newlyUnlocked = first ? reconcileWorldUnlocks(save.profile) : [];
    const nextWorld = worlds.find((world) => world.requiredBossId === defeated.id && world.isImplemented && worldRequirements(world, save.profile).unlocked && !save.profile.worldsUnlocked.includes(world.id));
    const portalGuidance = defeated.id === "scorpion-king" && first
      ? "O Escorpião-Rei revelou um portal animado entre as ruínas do Deserto. Atravesse-o para iniciar a expedição secreta."
      : nextWorld
      ? save.profile.worldsUnlocked.includes(nextWorld.id)
        ? `îÇ Portal para ${nextWorld.name} liberado! Ele está na borda da arena. Leve a cobrinha até a passagem e atravesse para viajar.`
        : `öÆ Você derrotou o chefe, mas ainda precisa alcançar o nível ${nextWorld.requiredLevel} para liberar o portal de ${nextWorld.name}. Continue jogando para ganhar XP; ao atingir o nível, a passagem aparecerá na borda da arena.`
      : "";
    this.run.bossDefeats++;
    const petRewards = [...new Set([defeated.petReward === "tiny-dragon" ? undefined : defeated.petReward, ...(defeated.additionalPetRewards ?? []), ...pets.filter((pet) => pet.id !== "tiny-dragon" && pet.bossRewardId === defeated.id && pet.requiredBossIds?.every((bossId) => save.profile.bossesDefeated.includes(bossId))).map((pet) => pet.id)].filter((id): id is string => Boolean(id)))];
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
        ? `É¥ ${petRewards.map((id) => {
            const pet = pets.find((entry) => entry.id === id);
            if (!pet) return id;
            return pet.coinPrice ? `${pet.name} disponível por ${pet.coinPrice} Boss Coins` : `${pet.name} liberado grátis`;
          }).join(" e ")}`
        : "",
      first && rewardedSkins.length
        ? ` Skin${rewardedSkins.length > 1 ? "s" : ""} desbloqueada${rewardedSkins.length > 1 ? "s" : ""}: ${rewardedSkins.map((skin) => skin.name).join(", ")}`
        : "",
      first ? `¬Ö +${defeated.rewardCoins} moedas · +${defeated.rewardXP} XP` : "",
      first && defeated.id === "scorpion-king"
        ? "As teias se moveram! Uma passagem secreta para o Covil da Aranha surgiu no Green Valley."
        : "",
      `● ${defeated.bossCoinDrop} Boss Coins caíram no chão`,
    ].filter(Boolean);
    if (first && newlyUnlocked.length) this.ui.toast(`Mundo desbloqueado: ${newlyUnlocked.map((world) => world.name).join(", ")}.`);
    if (first) {
      this.halted = true;
      this.pauseKind = "pause";
      this.resetControls();
      this.overlay = this.ui.modal(
        t("victoryTitle", { boss: defeated.name }),
        t("victoryBody", { rewards: rewardLines.length ? `\n\n${rewardLines.join("\n")}` : "" }),
        [{ label: t("victoryContinue"), run: () => this.continue() }],
      );
    }
    if (this.runStarted) analytics.track("boss_defeated", { bossId: defeated.id, worldId: defeated.worldId, durationSeconds: Math.max(0, Math.round((this.run.elapsed - this.bossStartedAt) * 100) / 100), damageTaken: this.bossDamageTaken, attemptNumber: this.bossAttempts[defeated.id] ?? 1, rewardPetUnlocked: first && petRewards.length > 0, remainingSnakeLength: this.snake.length });
    if (this.runStarted) this.completedBossCount++;
    if (this.runStarted && first) for (const petId of petRewards) analytics.track("pet_unlocked", { petId, sourceBossId: defeated.id });
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
    if (this.run.finished || this.runFinalized) return;
    this.runFinalized = true;
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
      if (mission) this.ui.toast(t("missionReadyToast", { mission: mission.title }));
    }
    awardAchievement(save.profile, "first-run");
    const metrics = sanitizeRunMetrics({ elapsedSeconds: this.run.elapsed, score: this.run.score, coinsCollected: this.run.matchCoins, coinCounts: this.coinCounts, maxCombo: this.run.maxCombo, maxSnakeLength: this.maxSnakeLength, turboUses: this.run.turboUses, shrinkFruitUses: this.run.shrinkFruits, magnetUses: this.run.magnet, portalsEntered: this.run.portalsUsed, secretWorldsVisited: this.secretWorldsVisited.size, bossAttempts: Object.values(this.bossAttempts).reduce((sum, attempts) => sum + attempts, 0), bossWins: this.run.bossDefeats, endReason: this.currentEndReason, deathReason: this.currentDeathReason });
    const runProperties = { gameVersion: "0.9.0-beta", platform, mode: this.run.rushMode ? "coin_rush" : "standard", startingWorld: this.startingWorld, durationSeconds: metrics.elapsedSeconds, score: metrics.score, coinsCollected: metrics.coinsCollected, normalCoins: metrics.coinCounts.normal ?? 0, blueCoins: metrics.coinCounts.blue ?? 0, diamondCoins: metrics.coinCounts.diamond ?? 0, goldenCoins: metrics.coinCounts.golden ?? 0, specialCoins: metrics.coinCounts.special ?? 0, maxCombo: metrics.maxCombo, snakeMaxLength: metrics.maxSnakeLength, turboUses: metrics.turboUses, shrinkFruitUses: metrics.shrinkFruitUses, magnetUses: metrics.magnetUses, shieldUses: this.shieldUses, portalsEntered: metrics.portalsEntered, secretWorldsVisited: metrics.secretWorldsVisited, bossAttempts: metrics.bossAttempts, bossWins: metrics.bossWins, deathReason: metrics.deathReason, endReason: metrics.endReason, playerLevel: save.profile.playerLevel, selectedSkin: save.profile.selectedSkin, selectedPet: save.profile.selectedPet, runNumberInSession: this.runNumberInSession };
    if (this.runStarted) {
      analytics.track("run_finished", { gameVersion: runProperties.gameVersion, platform: runProperties.platform, mode: runProperties.mode, startingWorld: runProperties.startingWorld, durationSeconds: runProperties.durationSeconds, score: runProperties.score, coinsCollected: runProperties.coinsCollected, normalCoins: runProperties.normalCoins, blueCoins: runProperties.blueCoins, diamondCoins: runProperties.diamondCoins, goldenCoins: runProperties.goldenCoins, specialCoins: runProperties.specialCoins, maxCombo: runProperties.maxCombo, snakeMaxLength: runProperties.snakeMaxLength, turboUses: runProperties.turboUses, shrinkFruitUses: runProperties.shrinkFruitUses, magnetUses: runProperties.magnetUses, shieldUses: runProperties.shieldUses, portalsEntered: runProperties.portalsEntered, secretWorldsVisited: runProperties.secretWorldsVisited, bossAttempts: runProperties.bossAttempts, bossWins: runProperties.bossWins, deathReason: runProperties.deathReason, endReason: runProperties.endReason, playerLevel: runProperties.playerLevel, selectedSkin: runProperties.selectedSkin, selectedPet: runProperties.selectedPet, runNumberInSession: runProperties.runNumberInSession });
      analytics.track("session_gameplay_summary", { runs: this.runNumberInSession, totalPlaySeconds: Math.max(0, Math.round((Date.now() - this.sessionStartedAt) / 1000)), bossAttempts: this.attemptedBossCount, bossWins: this.completedBossCount, worldsVisited: this.visitedWorlds.size });
    }
    void save.save();
  }
}

