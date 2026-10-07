import { save } from "../systems/SaveSystem";
type Sound =
  | "coin"
  | "power"
  | "error"
  | "click"
  | "coin_normal"
  | "coin_blue"
  | "coin_diamond"
  | "coin_golden"
  | "combo"
  | "turbo_start"
  | "turbo_end"
  | "shrink"
  | "shield_break";
class AudioService {
  private context?: AudioContext;
  private music?: HTMLAudioElement;
  private loop?: { osc: OscillatorNode; gain: GainNode };
  private voices = 0;
  unlock() {
    try {
      if (!this.context) this.context = new AudioContext();
      void this.context.resume().catch(() => undefined);
    } catch {
      /* Audio is optional on unsupported WebViews. */
    }
  }
  play(kind: Sound, combo = 1) {
    if (save.profile.settings.muted || this.voices >= 12) return;
    this.unlock();
    const c = this.context;
    if (!c) return;
    const tones: Record<Sound, number> = {
      coin: 880,
      power: 660,
      error: 150,
      click: 440,
      coin_normal: 880,
      coin_blue: 1046,
      coin_diamond: 1318,
      coin_golden: 1568,
      combo: 1174,
      turbo_start: 180,
      turbo_end: 130,
      shrink: 580,
      shield_break: 260,
    };
    const o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    const pitch =
      tones[kind] *
      (kind.startsWith("coin")
        ? (0.97 + Math.random() * 0.06) * (1 + (combo - 1) * 0.035)
        : 1);
    o.type = kind === "shrink" ? "sine" : "triangle";
    o.frequency.setValueAtTime(pitch, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      kind === "error" || kind === "turbo_end" ? pitch * 0.5 : pitch * 1.4,
      c.currentTime + 0.14,
    );
    g.gain.setValueAtTime(
      Math.max(0.001, save.profile.settings.sfxVolume * 0.14),
      c.currentTime,
    );
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    this.voices++;
    o.start();
    o.stop(c.currentTime + 0.19);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      this.voices--;
    };
  }
  setTurbo(active: boolean) {
    if (!active || save.profile.settings.muted) {
      if (this.loop) {
        this.loop.osc.stop();
        this.loop.osc.disconnect();
        this.loop.gain.disconnect();
        this.loop = undefined;
      }
      return;
    }
    if (this.loop) return;
    this.unlock();
    const c = this.context;
    if (!c) return;
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = 92;
    gain.gain.value = save.profile.settings.sfxVolume * 0.025;
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    this.loop = { osc, gain };
  }
  setMusic(url: string) {
    this.music?.pause();
    this.music = new Audio(url);
    this.music.loop = true;
    this.music.onerror = () => {
      if (import.meta.env.DEV)
        console.warn(
          "Coin Snake: música indisponível; o jogo continuará sem ela.",
        );
    };
    this.sync();
  }
  sync() {
    if (this.loop) {
      if (save.profile.settings.muted) this.setTurbo(false);
      else this.loop.gain.gain.value = save.profile.settings.sfxVolume * 0.025;
    }
    if (!this.music) return;
    this.music.volume = save.profile.settings.musicVolume;
    if (save.profile.settings.muted) this.music.pause();
    else void this.music.play().catch(() => undefined);
  }
}
export const audio = new AudioService();
