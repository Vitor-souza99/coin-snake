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
    settingsTitle: "Do seu jeito", settingsKicker: "Controles, som e idioma", language: "Idioma", languageAuto: "Automático", languagePortuguese: "Português (Brasil)", languageEnglish: "English", leftHanded: "Modo canhoto", leftHandedHelp: "Joystick à direita; turbo à esquerda.", camera: "Câmera", standard: "Padrão", panoramic: "Panorâmica", orientation: "Orientação da tela", automatic: "Automática", portrait: "Vertical", landscape: "Horizontal", mute: "Silenciar áudio", sfx: "Efeitos sonoros", music: "Música", musicHelp: "Trilha leve nos menus; pausada durante as partidas.", haptics: "Vibração", hapticsHelp: "Em dispositivos Android compatíveis.", reducedMotion: "Reduzir efeitos visuais", computer: "No computador", tutorial: "Ver dicas novamente", rush: "Coin Rush", collection: "Coleção", reset: "Apagar todo o progresso", languageChanged: "Idioma atualizado.",
    difficultyTitle: "Escolha a dificuldade", difficultyKicker: "Vale para esta partida", difficultyEasy: "Fácil", difficultyNormal: "Normal", difficultyHard: "Difícil", difficultyEasyHelp: "Cobra mais lenta, mais power-ups e chefes com mais pausas.", difficultyNormalHelp: "Ritmo e equilíbrio padrão.", difficultyHardHelp: "Cobra e chefes mais rápidos, com menos power-ups.", startGame: "COMEÇAR →", cancel: "Cancelar",
    difficultyTipTitle: "DICA DA PARTIDA", difficultyTipNext: "Outra dica", difficultyTipCount: "{current} de {total}",
    difficultyTips: {
      easy: ["Use o joystick com movimentos curtos para fazer curvas suaves.", "Pegue power-ups: eles ajudam a controlar momentos perigosos.", "Olhe adiante e planeje por onde sua cobra vai passar.", "Evite encurralar a cobra nas bordas da arena.", "Colete moedas no caminho, sem fazer curvas arriscadas.", "O turbo acelera a cobra; use-o em trechos livres.", "Quando surgir um chefe, observe antes de se aproximar.", "Mantenha espaço para virar se aparecer um obstáculo.", "Crescer aumenta sua pontuação, mas exige mais espaço.", "Faça pausas entre as partidas para experimentar outra estratégia."],
      normal: ["Observe o padrão do chefe antes de escolher sua rota.", "Guarde espaço ao redor da cabeça para conseguir virar.", "Combine moedas e power-ups sem cruzar seu próprio caminho.", "Use o turbo em linhas retas e abertas.", "Antecipe obstáculos em vez de desviar no último instante.", "Uma rota ampla costuma ser mais segura que curvas fechadas.", "Power-ups podem mudar o ritmo: adapte sua rota ao efeito.", "Não persiga cada moeda se isso fechar sua saída.", "Repare em como o espaço livre muda conforme você cresce.", "Planeje uma rota de fuga antes de entrar na arena do chefe."],
      hard: ["Priorize uma rota de fuga antes de perseguir moedas.", "Use o turbo só quando tiver espaço para controlar a curva.", "Antecipe ataques do chefe; reagir tarde custa espaço.", "Faça curvas compactas sem cortar o caminho da cobra.", "Escolha power-ups pensando no perigo que vem a seguir.", "Evite becos sem saída: mantenha uma saída visível.", "Não atravesse sua própria trilha ao disputar uma moeda.", "Aproveite janelas seguras entre os ataques para avançar.", "Controle o crescimento: mais segmentos pedem rotas amplas.", "Mude de direção cedo para evitar correções bruscas."]
    },
  },
  en: {
    back: "← Back", menuKicker: "Little snake. Big adventure.", level: "Level", best: "Best", play: "PLAY →", worlds: "Worlds", shop: "Shop", missions: "Missions", settings: "Controls, sound & language", collect: "Collect. Grow. Find your rhythm.", virtualCoins: "Virtual coins only.",
    settingsTitle: "Make it yours", settingsKicker: "Controls, sound & language", language: "Language", languageAuto: "Automatic", languagePortuguese: "Português (Brasil)", languageEnglish: "English", leftHanded: "Left-handed mode", leftHandedHelp: "Joystick on the right; boost on the left.", camera: "Camera", standard: "Standard", panoramic: "Panoramic", orientation: "Screen orientation", automatic: "Automatic", portrait: "Portrait", landscape: "Landscape", mute: "Mute audio", sfx: "Sound effects", music: "Music", musicHelp: "Light menu soundtrack; paused during gameplay.", haptics: "Haptics", hapticsHelp: "On compatible Android devices.", reducedMotion: "Reduce visual effects", computer: "On computer", tutorial: "Show tips again", rush: "Coin Rush", collection: "Collection", reset: "Delete all progress", languageChanged: "Language updated.",
    difficultyTitle: "Choose difficulty", difficultyKicker: "For this run", difficultyEasy: "Easy", difficultyNormal: "Normal", difficultyHard: "Hard", difficultyEasyHelp: "Slower snake, more power-ups, and bosses with longer breaks.", difficultyNormalHelp: "The standard pace and balance.", difficultyHardHelp: "Faster snake and bosses, with fewer power-ups.", startGame: "START →", cancel: "Cancel",
    difficultyTipTitle: "RUN TIP", difficultyTipNext: "Another tip", difficultyTipCount: "{current} of {total}",
    difficultyTips: {
      easy: ["Use short joystick movements for smooth turns.", "Collect power-ups to help handle dangerous moments.", "Look ahead and plan where your snake will travel.", "Avoid trapping your snake against the arena edges.", "Collect coins along the way without risky turns.", "Boost speeds you up; use it on clear stretches.", "When a boss appears, observe before moving closer.", "Leave room to turn if an obstacle appears.", "Growing raises your score but requires more space.", "Take a break between runs and try a new strategy."],
      normal: ["Watch the boss's pattern before choosing your route.", "Keep room around your head so you can turn.", "Combine coins and power-ups without crossing your path.", "Use boost on open, straight stretches.", "Anticipate obstacles instead of dodging at the last second.", "A wide route is often safer than tight turns.", "Power-ups change the pace; adapt your route to the effect.", "Don't chase every coin if it closes off your escape.", "Notice how open space changes as you grow.", "Plan an escape route before entering a boss arena."],
      hard: ["Prioritize an escape route before chasing coins.", "Boost only when you have room to control your turn.", "Anticipate boss attacks; late reactions cost space.", "Make tight turns without crossing your own path.", "Choose power-ups based on the danger ahead.", "Avoid dead ends: keep an exit in sight.", "Don't cross your own trail to grab a coin.", "Use safe windows between attacks to move forward.", "Manage growth: more segments need wider routes.", "Change direction early to avoid sharp corrections."]
    }
  },
} as const;

export type MessageKey = Exclude<keyof typeof messages.en, "difficultyTips">;
let currentLanguage: Language = "en";

export function setLanguage(language: Language): void {
  currentLanguage = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: MessageKey): string {
  return messages[currentLanguage][key] as string;
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