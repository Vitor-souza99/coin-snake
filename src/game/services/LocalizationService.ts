import type { LanguagePreference } from "../types/game";

export type Language = "pt-BR" | "en";

export function detectLanguage(deviceLanguage?: string | null): Language {
  const language = deviceLanguage ?? (typeof navigator === "undefined" ? "" : navigator.language);
  return language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

export function resolveLanguage(preference: LanguagePreference, deviceLanguage?: string | null): Language {
  return preference === "auto" ? detectLanguage(deviceLanguage) : preference;
}

const messages = {
  "pt-BR": {
    back: "← Voltar", menuKicker: "Pequena cobra. Grande aventura.", level: "Nível", best: "Recorde", play: "JOGAR →", worlds: "Mundos", shop: "Loja", missions: "Missões", settings: "Ajustar controles, som e idioma", collect: "Colete. Cresça. Encontre seu ritmo.", virtualCoins: "Moedas exclusivamente virtuais.",
    settingsTitle: "Do seu jeito", settingsKicker: "Controles, som e idioma", language: "Idioma", languageAuto: "Automático", languagePortuguese: "Português (Brasil)", languageEnglish: "English", leftHanded: "Modo canhoto", leftHandedHelp: "Joystick à direita; turbo à esquerda.", camera: "Câmera", standard: "Padrão", panoramic: "Panorâmica", orientation: "Orientação da tela", automatic: "Automática", portrait: "Vertical", landscape: "Horizontal", mute: "Silenciar áudio", sfx: "Efeitos sonoros", music: "Música", musicHelp: "Trilha leve nos menus; pausada durante as partidas.", haptics: "Vibração", hapticsHelp: "Em dispositivos Android compatíveis.", reducedMotion: "Reduzir efeitos visuais", computer: "No computador", tutorial: "Ver dicas novamente", classicPlay: "Jogar Cobrinha Clássica", collection: "Coleção", reset: "Apagar todo o progresso", languageChanged: "Idioma atualizado.",
    classicMode: "COBRINHA CLÁSSICA", classicScore: "Pontos: {score} · Recorde: {best}", classicControls: "Controles direcionais", classicUp: "Cima", classicDown: "Baixo", classicLeft: "Esquerda", classicRight: "Direita", classicPause: "Pausar", classicPaused: "Jogo pausado", classicGameOver: "Fim de jogo", classicContinueAd: "Assistir a um vídeo e continuar", classicAdUnavailable: "Anúncio indisponível ou não concluído. A continuação não foi concedida.",
    difficultyTitle: "Escolha a dificuldade", difficultyKicker: "Vale para esta partida", difficultyEasy: "Fácil", difficultyNormal: "Normal", difficultyHard: "Difícil", difficultyEasyHelp: "Cobra mais lenta, mais power-ups e chefes com mais pausas.", difficultyNormalHelp: "Ritmo e equilíbrio padrão.", difficultyHardHelp: "Cobra e chefes mais rápidos, com menos power-ups.", startGame: "COMEÇAR →", cancel: "Cancelar",
    tutorialTitle: "Encontre seu ritmo", tutorialBody: "Mova o joystick para guiar a cobra — no computador, use WASD ou as setas.\nColete moedas para ganhar pontos e XP.\nEvite paredes, obstáculos e o próprio corpo.\nSegure o botão Turbo para acelerar; use com cuidado para não perder o controle.", tutorialStart: "Vamos jogar", tutorialConfirmTitle: "Mostrar dicas novamente?", tutorialConfirmBody: "As dicas de controles e mecânicas aparecerão novamente durante as próximas partidas. Seu progresso não será apagado. Deseja continuar?", tutorialConfirm: "Mostrar dicas", tutorialResetNotice: "As dicas aparecerão durante as próximas partidas.", turboHint: "Segure Turbo para acelerar. No computador, use Shift.", shrinkHint: "A fruta roxa reduz o tamanho da cobra em 25%.", computerMove: "Mover: WASD ou setas", computerTurbo: "Turbo: Shift", computerFreeze: "Freeze: F", computerPause: "Pausar/continuar: Esc ou Espaço",
    confirmPurchaseTitle: "Confirmar compra", confirmPurchaseBody: "Deseja comprar {item} por {price} {currency}?\nSeu saldo atual: {balance} {currency}.", confirmPurchase: "Comprar", cancelUpper: "CANCELAR", purchaseFailed: "Compra não realizada. Confira seu saldo e tente novamente.",
    missionReadyToast: "Missão concluída: {mission}. Resgate a recompensa no menu de missões.", resetTitle: "Apagar todo o progresso?", resetBody: "Isso apagará moedas, mundos desbloqueados, itens, missões, recordes e configurações.\n\nEssa ação não pode ser desfeita.", resetConfirm: "Apagar todo o progresso",
    exitTitle: "Sair do jogo?", exitBody: "Deseja fechar o jogo?", exit: "Sair",
    pauseTitle: "Jogo pausado", pauseBody: "Seu vale pode esperar.", continue: "Continuar", restart: "Reiniciar", pauseMenu: "Menu", pauseCamera: "Câmera", soundOn: "Ativar som", soundOff: "Desativar som",
    spiderIntroTitle: "Bem-vinda ao Covil da Aranha!", spiderIntroBody: "Este mapa secreto abriga a Aranha Real no centro de uma arena. Desvie das teias sinalizadas e dos filhotes que perseguem sua cabeça. Colete 4 Boss Coins para carregar a aura e toque a estalactite no alto para ferir a aranha. A saída será liberada quando você derrotá-la.",
    cloverDefeatTitle: "Sapo-Rei derrotado!", cloverDefeatBody: "Quatro trevos surgiram no jardim. Colete todos para abrir a saída. O Sapo-Rei deixou 15 Boss Coins, que você pode coletar agora ou após a revanche.",
    cloverRevengeTitle: "Revanche: Sapo-Rei", cloverRevengeBody: "Quer desafiar o Sapo-Rei novamente? A revanche é opcional. Ao vencer, você poderá coletar 15 Boss Coins.", startFight: "Começar a luta", notNow: "Agora não",
    victoryTitle: "{boss} derrotado!", victoryBody: "Vitória!{rewards}", victoryContinue: "Continuar",
    abyssVictoryTitle: "A fenda silenciou", abyssVictoryBody: "Você sobreviveu por 90 segundos no Abismo Mudo. A Serpente Abissal foi desbloqueada e está disponível na sua coleção.",
    sanctuaryTitle: "Serpente Celestial desbloqueada!", sanctuaryBody: "Os três santuários despertaram a Serpente Celestial. Ela já está disponível na sua coleção de mascotes.",
    bossOptional: "A luta é opcional. Sua Boss Energy só será usada quando a luta começar.", bossStart: "Começar a luta", bossLater: "Agora não",
    difficultyTipTitle: "DICA DA PARTIDA", difficultyTipNext: "Outra dica", difficultyTipCount: "{current} de {total}",
    difficultyTips: {
      easy: ["Use o joystick com movimentos curtos para fazer curvas suaves.", "Pegue power-ups: eles ajudam a controlar momentos perigosos.", "Olhe adiante e planeje por onde sua cobra vai passar.", "Evite encurralar a cobra nas bordas da arena.", "Colete moedas no caminho, sem fazer curvas arriscadas.", "O turbo acelera a cobra; use-o em trechos livres.", "Quando surgir um chefe, observe antes de se aproximar.", "Mantenha espaço para virar se aparecer um obstáculo.", "Crescer aumenta sua pontuação, mas exige mais espaço.", "Faça pausas entre as partidas para experimentar outra estratégia."],
      normal: ["Observe o padrão do chefe antes de escolher sua rota.", "Guarde espaço ao redor da cabeça para conseguir virar.", "Combine moedas e power-ups sem cruzar seu próprio caminho.", "Use o turbo em linhas retas e abertas.", "Antecipe obstáculos em vez de desviar no último instante.", "Uma rota ampla costuma ser mais segura que curvas fechadas.", "Power-ups podem mudar o ritmo: adapte sua rota ao efeito.", "Não persiga cada moeda se isso fechar sua saída.", "Repare em como o espaço livre muda conforme você cresce.", "Planeje uma rota de fuga antes de entrar na arena do chefe."],
      hard: ["Priorize uma rota de fuga antes de perseguir moedas.", "Use o turbo só quando tiver espaço para controlar a curva.", "Antecipe ataques do chefe; reagir tarde custa espaço.", "Faça curvas compactas sem cortar o caminho da cobra.", "Escolha power-ups pensando no perigo que vem a seguir.", "Evite becos sem saída: mantenha uma saída visível.", "Não atravesse sua própria trilha ao disputar uma moeda.", "Aproveite janelas seguras entre os ataques para avançar.", "Controle o crescimento: mais segmentos pedem rotas amplas.", "Mude de direção cedo para evitar correções bruscas."]
    },
  },
  en: {
    back: "← Back", menuKicker: "Little snake. Big adventure.", level: "Level", best: "Best", play: "PLAY →", worlds: "Worlds", shop: "Shop", missions: "Missions", settings: "Controls, sound & language", collect: "Collect. Grow. Find your rhythm.", virtualCoins: "Virtual coins only.",
    settingsTitle: "Make it yours", settingsKicker: "Controls, sound, and language", language: "Language", languageAuto: "Automatic", languagePortuguese: "Portuguese (Brazil)", languageEnglish: "English", leftHanded: "Left-handed mode", leftHandedHelp: "Joystick on the right; turbo on the left.", camera: "Camera", standard: "Standard", panoramic: "Panoramic", orientation: "Screen orientation", automatic: "Automatic", portrait: "Portrait", landscape: "Landscape", mute: "Mute audio", sfx: "Sound effects", music: "Music", musicHelp: "A light menu soundtrack; paused during runs.", haptics: "Haptics", hapticsHelp: "On compatible Android devices.", reducedMotion: "Reduce visual effects", computer: "On computer", tutorial: "Show tips again", classicPlay: "Play Classic Snake", collection: "Collection", reset: "Delete all progress", languageChanged: "Language updated.",
    classicMode: "CLASSIC SNAKE", classicScore: "Score: {score} · Best: {best}", classicControls: "Directional controls", classicUp: "Up", classicDown: "Down", classicLeft: "Left", classicRight: "Right", classicPause: "Pause", classicPaused: "Game paused", classicGameOver: "Game over", classicContinueAd: "Watch a video and continue", classicAdUnavailable: "Ad unavailable or not completed. No continuation was granted.",
    difficultyTitle: "Choose difficulty", difficultyKicker: "For this run", difficultyEasy: "Easy", difficultyNormal: "Normal", difficultyHard: "Hard", difficultyEasyHelp: "Slower snake, more power-ups, and bosses with longer breaks.", difficultyNormalHelp: "The standard pace and balance.", difficultyHardHelp: "Faster snake and bosses, with fewer power-ups.", startGame: "START →", cancel: "Cancel",
    tutorialTitle: "Find your rhythm", tutorialBody: "Steer with the joystick—or use WASD or the arrow keys on a computer.\nCollect coins to earn points and XP.\nAvoid walls, obstacles, and your own body.\nHold Turbo to speed up; use it carefully to stay in control.", tutorialStart: "Let’s play", tutorialConfirmTitle: "Show the tips again?", tutorialConfirmBody: "Control and mechanic tips will appear again during your next runs. Your progress will not be erased. Continue?", tutorialConfirm: "Show tips", tutorialResetNotice: "The tips will appear during your next runs.", turboHint: "Hold Turbo to speed up. On a computer, use Shift.", shrinkHint: "The purple fruit makes the snake 25% smaller.", computerMove: "Move: WASD or arrow keys", computerTurbo: "Turbo: Shift", computerFreeze: "Freeze: F", computerPause: "Pause/resume: Esc or Space",
    confirmPurchaseTitle: "Confirm purchase", confirmPurchaseBody: "Buy {item} for {price} {currency}?\nYour current balance: {balance} {currency}.", confirmPurchase: "Buy", cancelUpper: "CANCEL", purchaseFailed: "Purchase not completed. Check your balance and try again.",
    missionReadyToast: "Mission complete: {mission}. Claim your reward in the Missions screen.", resetTitle: "Delete all progress?", resetBody: "This will erase your coins, unlocked worlds, items, missions, records, and settings.\n\nThis action can’t be undone.", resetConfirm: "Delete all progress",
    exitTitle: "Exit the game?", exitBody: "Do you want to close the game?", exit: "Exit",
    pauseTitle: "Game paused", pauseBody: "Your valley can wait.", continue: "Continue", restart: "Restart", pauseMenu: "Menu", pauseCamera: "Camera", soundOn: "Turn sound on", soundOff: "Turn sound off",
    spiderIntroTitle: "Welcome to Spider Lair!", spiderIntroBody: "This secret map is home to the Spider Queen, in the center of an arena. Dodge the marked webs and hatchlings that chase your head. Collect 4 Boss Coins to charge your aura, then touch the stalactite above to damage the queen. The exit opens when you defeat her.",
    cloverDefeatTitle: "Clover King defeated!", cloverDefeatBody: "Four clovers have appeared in the garden. Collect them all to open the exit. The Clover King left 15 Boss Coins, which you can collect now or after the rematch.",
    cloverRevengeTitle: "Rematch: Clover King", cloverRevengeBody: "Want to challenge the Clover King again? The rematch is optional. Victory lets you collect 15 Boss Coins.", startFight: "Start fight", notNow: "Not now",
    victoryTitle: "{boss} defeated!", victoryBody: "Victory!{rewards}", victoryContinue: "Continue",
    abyssVictoryTitle: "The rift falls silent", abyssVictoryBody: "You survived the Silent Abyss for 90 seconds. The Abyssal Serpent is unlocked and available in your collection.",
    sanctuaryTitle: "Celestial Serpent unlocked!", sanctuaryBody: "The three sanctuaries awakened the Celestial Serpent. It’s now available in your pet collection.",
    bossOptional: "The fight is optional. Your Boss Energy is only spent when the fight begins.", bossStart: "Start fight", bossLater: "Not now",
    difficultyTipTitle: "RUN TIP", difficultyTipNext: "Another tip", difficultyTipCount: "{current} of {total}",
    difficultyTips: {
      easy: ["Use short joystick movements for smooth turns.", "Collect power-ups to help handle dangerous moments.", "Look ahead and plan where your snake will travel.", "Avoid trapping your snake against the arena edges.", "Collect coins along the way without risky turns.", "Boost speeds you up; use it on clear stretches.", "When a boss appears, observe before moving closer.", "Leave room to turn if an obstacle appears.", "Growing raises your score but requires more space.", "Take a break between runs and try a new strategy."],
      normal: ["Watch the boss's pattern before choosing your route.", "Keep room around your head so you can turn.", "Combine coins and power-ups without crossing your path.", "Use boost on open, straight stretches.", "Anticipate obstacles instead of dodging at the last second.", "A wide route is often safer than tight turns.", "Power-ups change the pace; adapt your route to the effect.", "Don't chase every coin if it closes off your escape.", "Notice how open space changes as you grow.", "Plan an escape route before entering a boss arena."],
      hard: ["Prioritize an escape route before chasing coins.", "Boost only when you have room to control your turn.", "Anticipate boss attacks; late reactions cost space.", "Make tight turns without crossing your own path.", "Choose power-ups based on the danger ahead.", "Avoid dead ends: keep an exit in sight.", "Don't cross your own trail to grab a coin.", "Use safe windows between attacks to move forward.", "Manage growth: more segments need wider routes.", "Change direction early to avoid sharp corrections."]
    }
  },
} as const;

const englishMissions: Record<string, readonly [string, string]> = {
  collector: ["Treasure Hunt", "Collect 100 virtual coins."], scorer: ["A Great Run", "Score 2,000 points in one run."],
  explorer: ["Nature's Power", "Collect 3 power-ups."], survivor: ["Persistence", "Survive for 90 seconds in one run."],
  "combo-master": ["Perfect Rhythm", "Reach an x8 combo in one run."], "gold-rush": ["Golden Glow", "Collect 2 golden coins."],
  "magnet-fan": ["Coin Magnet", "Collect 2 coins with Magnet active."], "daily-player": ["One More Run", "Finish 2 runs today."],
  "run-finisher": ["Keep Going", "Finish 3 runs today."],
  "coin-trail": ["Coin Trail", "Collect 50 virtual coins."], "power-up-starter": ["Surprise Box", "Collect 2 power-ups today."],
  "short-survivor": ["First Steps", "Survive for 45 seconds in one run."], "one-more-coin": ["One More Coin", "Collect 1 golden coin."],
  "turbo-tap": ["Turbo Tap", "Activate Turbo once today."], "fresh-start": ["Fresh Start", "Finish 1 run today."],
  "shrink-once": ["Less Is More", "Collect 1 shrink fruit today."], "first-portal": ["New Scenery", "Travel through 1 portal today."],
  "coin-pouch": ["Full Pouch", "Collect 150 virtual coins."], "power-up-collector": ["Power Collector", "Collect 5 power-ups today."],
  "long-survivor": ["Staying Power", "Survive for 150 seconds in one run."], "golden-pair": ["Double Shine", "Collect 2 golden coins today."],
  "turbo-driver": ["Turbo Driver", "Activate Turbo 3 times today."], "shrink-pair": ["Compact Form", "Collect 2 shrink fruits today."],
  "portal-hopper": ["World Hopper", "Travel through 2 portals today."], "boss-hunter": ["Boss Hunter", "Defeat 1 boss today."],
  "coin-typhoon": ["Coin Shower", "Collect 300 virtual coins."], "power-up-pro": ["Power-Up Pro", "Collect 8 power-ups today."],
  "marathon-run": ["Marathon", "Survive for 240 seconds in one run."], "golden-trio": ["Golden Trio", "Collect 3 golden coins today."],
  "combo-legend": ["Combo Legend", "Reach an x12 combo in one run."], "turbo-master": ["Turbo Unleashed", "Activate Turbo 5 times today."],
  "shrink-trio": ["Shrink Specialist", "Collect 3 shrink fruits today."], "world-tour": ["World Tour", "Travel through 3 portals today."],
  "boss-duel": ["Champion's Duel", "Defeat 2 bosses today."], "magnet-master": ["Legendary Magnet", "Collect 5 coins with Magnet active today."],
};
const englishPets: Record<string, readonly [string, string, string]> = {
  scorpionling: ["Scorpionling", "Reduces environmental wind and slow effects by 20% outside boss fights.", "Defeat the Scorpion King."],
  spiderling: ["Spiderling", "Roams the map and draws nearby regular coins to you.", "Defeat the Spider Queen in the Spider Lair."],
  bee: ["Bee", "Keeps the +3 percentage-point blue coin bonus and brings pollen, granting up to 24 XP per run in 8 XP bursts.", "Defeat the Candy Monster."],
  "candy-blob": ["Candy Blob", "+5% XP when you finish a run.", "Defeat the Candy Monster and purchase for 50 Boss Coins."],
  "baby-octopus": ["Baby Octopus", "Extends each Magnet pickup to 12 seconds.", "Defeat the Kraken."],
  firefly: ["Firefly", "Keeps the +5 percentage-point blue coin bonus and attracts nearby blue coins toward you.", "Defeat King Snake and purchase for 50 Boss Coins."],
  "snow-pup": ["Boreal Spirit", "Your Shield blocks one extra hit before it disappears.", "Defeat the Candy Monster."], "tiny-dragon": ["Tiny Dragon", "A small combat dragon that dashes, hurts vulnerable bosses, and helps clear spiderlings.", "Discover the secret relic in the Desert Labyrinth and purchase it for 150 Boss Coins."],
  "tidal-turtle": ["Tidal Turtle", "Extends Ghost to 5 seconds and grants a Shield every 45 seconds. The Shield expires after 10 seconds if unused.", "Defeat the Kraken and purchase for 75 Boss Coins."],
  phoenix: ["Solar Phoenix", "Once per run, revives you when you lose your last life and restores 1 life.", "Defeat the Kraken and purchase for 125 Boss Coins."],
  "celestial-serpent": ["Celestial Serpent", "In the Silent Abyss, searches the map for celestial fragments; every 3 grants 15 XP, up to 3 times per run.", "Activate all 3 celestial sanctuaries in the Silent Abyss to unlock this Mythic companion."],
  "lucky-leprechaun": ["Lucky Clover", "Permanent companion: +2 percentage points to the chance of an extra life appearing, and unlocks a slot for another companion.", "Find 2 clovers in Candy World's Secret Garden with the Abyssal Serpent, and 2 in Ocean World's Underwater Garden with the Ghost Snake."],
  "crystal-fox": ["Crystal Fox", "+5% score when collecting coins (does not increase your balance).", "Premium companion—not currently available."],
};
const englishWorlds: Record<string, readonly [string, string, string, string, string]> = {
  "green-valley": ["Green Valley", "The starting valley and main adventure hub.", "Classic arena; no special mechanics.", "Green fields, trees, and peaceful paths.", "Bee, King Snake Skin"],
  "candy-world": ["Candy World", "A pastel land guarded by the Candy Monster.", "Sticky zones", "Colorful candy, pastel colors, and sticky zones.", "Candy Blob, Candy Dragon Skin"],
  ocean: ["Ocean World", "Ocean currents surround this underwater world.", "Ocean currents", "Blue waters, waves, and bubbles.", "Baby Octopus, Ghost Skin"],
  "silent-abyss": ["The Silent Abyss", "A hidden rift leads to dark waters without currents.", "Survive for 90 seconds without currents; progress counts only on this map.", "Silent ruins, subtle bioluminescence, and an isolated arena.", "Abyssal Serpent"],
  "spider-lair": ["Spider Lair", "A secret passage in Green Valley leads to the Spider Queen's lair.", "Dodge sticky webs; use your attack aura when the Spider Queen is exposed after firing.", "A hidden lair covered in webs, guarded by the Spider Queen.", "Spider Queen Skin, Spiderling"],
  desert: ["Dune Desert", "Buried ruins, hidden oases, and sand gusts guarded by the Scorpion King.", "Sand gusts push your snake; oases slightly slow you down and offer a calmer route.", "Golden dunes, ancient ruins, cacti, and an oasis at the desert's heart.", "Scorpionling, Desert Scorpion Snake"],
  "ice-world": ["Ice World", "A frozen region planned for exploration.", "Slippery surfaces (coming soon)", "Glaciers, snow, and ice crystals.", ""],
  space: ["Space", "A free cosmic expansion planned for the future.", "Variable gravity (coming soon)", "Stars and nebulae across a cosmic field.", ""],
  dragon_kingdom: ["Dragon Kingdom", "An optional dragon expansion; not required to complete the base game.", "Fire zones", "Dark mountains, lava, and dragon silhouettes.", "Dragon Coin, Fire Trail, Dragon Crown, Fire Dragon, Ancient Dragon"],
  haunted_realm: ["Haunted Realm", "An optional expansion of ghosts and mysteries.", "Obstacles and ghosts that appear and disappear.", "A dark realm shrouded in mist and apparitions.", "Mini Ghost"],
  prehistoric_world: ["Prehistoric World", "An optional expansion featuring prehistoric creatures.", "Natural hazards.", "Ancient vegetation, fossils, and distant volcanoes.", "Baby Dino"],
};

export function localizedMission(id: string, field: "title" | "description", fallback: string): string { return currentLanguage === "en" ? englishMissions[id]?.[field === "title" ? 0 : 1] ?? fallback : fallback; }
export function localizedPet(id: string, field: "name" | "description" | "unlockedBy", fallback: string): string { return currentLanguage === "en" ? englishPets[id]?.[{ name: 0, description: 1, unlockedBy: 2 }[field]] ?? fallback : fallback; }
export function localizedWorld(id: string, field: "name" | "description" | "specialMechanic" | "previewDescription" | "rewards", fallback: string): string {
  if (currentLanguage !== "en") return fallback;
  const item = englishWorlds[id];
  const index = { name: 0, description: 1, specialMechanic: 2, previewDescription: 3, rewards: 4 }[field];
  return item?.[index] ?? fallback;
}
const englishBossHints: Record<string, string> = {
  "king-snake": "Collect Boss Coins (25/100 each) to charge your aura. At 100/100, collect the crown to activate it. Dodge King Snake's red charge line: without an aura, a hit costs a life; with one, it blocks the hit without being consumed. When King Snake crashes into the arena and is stunned, touch him with your active aura to deal 1 HP of damage. Contact without an aura deals no damage; charge another aura for the next attack.",
  "candy-monster": "Collect 4 Boss Coins to charge and collect the aura. Each aura hit deals 1 HP of damage. After each attack, the Candy Monster flashes and retreats for 4 seconds—use that time to escape. Dodge the attack circles; attacks become more frequent as its health drops.",
  kraken: "Collect Boss Coins (25 each) until you reach 100/100; a blue pearl will then appear. Collect it to activate your aura and hit the Kraken. Dodge the tentacle circles; when a tentacle misses, use your aura on it to deal 1 damage. At 2 HP, the Kraken tries to heal for 9 seconds: charge to 100/100, collect the pearl, and hit it to interrupt. Otherwise, it recovers 3 HP. After interrupting or completing the heal, leave the circle within 5 seconds. It only tries to heal once.",
  "scorpion-king": "Dodge the red charge trail. When the Scorpion King misses and is stunned, use your attack aura to hit it. Escape the poison pools at 5 and 2 HP. In the final phase, dodge its leaps: hit its head with your attack aura to deal damage; its body reduces your size.",
  "spider-queen": "Dodge the red thread and webs. Collect 4 Boss Coins to activate the purple aura; use it to touch the stalactite above and drop it on the Spider Queen for 1 damage. At 5 HP, webs grow larger and appear more often; at 2 HP, pressure increases again and two extra webs are launched.",
};
export function localizedBossHint(id: string, fallback: string): string { return currentLanguage === "en" ? englishBossHints[id] ?? fallback : fallback; }

export type MessageKey = Exclude<keyof typeof messages.en, "difficultyTips">;
let currentLanguage: Language = "en";

export function setLanguage(language: Language): void {
  currentLanguage = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  let message = messages[currentLanguage][key] as string;
  for (const [name, value] of Object.entries(values)) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}

export function difficultyTips(difficulty: "easy" | "normal" | "hard"): readonly string[] {
  return messages[currentLanguage].difficultyTips[difficulty];
}

export function formatDifficultyTipCount(current: number, total: number): string {
  return t("difficultyTipCount").replace("{current}", String(current)).replace("{total}", String(total));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLanguage).format(value);
}