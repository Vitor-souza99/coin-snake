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
    settingsTitle: "Do seu jeito", settingsKicker: "Controles, som e idioma", language: "Idioma", languageAuto: "Automático", languagePortuguese: "Português (Brasil)", languageEnglish: "English", leftHanded: "Modo canhoto", leftHandedHelp: "Joystick à direita; turbo à esquerda.", camera: "Câmera", standard: "Padrão", panoramic: "Panorâmica", orientation: "Orientação da tela", automatic: "Automática", portrait: "Vertical", landscape: "Horizontal", mute: "Silenciar áudio", sfx: "Efeitos sonoros", music: "Música", musicHelp: "Volume reservado para trilhas futuras.", haptics: "Vibração", hapticsHelp: "Em dispositivos Android compatíveis.", reducedMotion: "Reduzir efeitos visuais", computer: "No computador", tutorial: "Ver dicas novamente", rush: "Coin Rush", collection: "Coleção", reset: "Apagar todo o progresso", languageChanged: "Idioma atualizado.",
  },
  en: {
    back: "← Back", menuKicker: "Little snake. Big adventure.", level: "Level", best: "Best", play: "PLAY →", worlds: "Worlds", shop: "Shop", missions: "Missions", settings: "Controls, sound & language", collect: "Collect. Grow. Find your rhythm.", virtualCoins: "Virtual coins only.",
    settingsTitle: "Make it yours", settingsKicker: "Controls, sound & language", language: "Language", languageAuto: "Automatic", languagePortuguese: "Português (Brasil)", languageEnglish: "English", leftHanded: "Left-handed mode", leftHandedHelp: "Joystick on the right; boost on the left.", camera: "Camera", standard: "Standard", panoramic: "Panoramic", orientation: "Screen orientation", automatic: "Automatic", portrait: "Portrait", landscape: "Landscape", mute: "Mute audio", sfx: "Sound effects", music: "Music", musicHelp: "Reserved for future soundtracks.", haptics: "Haptics", hapticsHelp: "On compatible Android devices.", reducedMotion: "Reduce visual effects", computer: "On computer", tutorial: "Show tips again", rush: "Coin Rush", collection: "Collection", reset: "Delete all progress", languageChanged: "Language updated.",
  },
} as const;

export type MessageKey = keyof typeof messages.en;
let currentLanguage: Language = "en";

export function setLanguage(language: Language): void {
  currentLanguage = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: MessageKey): string {
  return messages[currentLanguage][key];
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLanguage).format(value);
}