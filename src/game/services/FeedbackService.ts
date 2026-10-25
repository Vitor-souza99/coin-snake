import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { GAME_VERSION, platform, analytics } from "./AnalyticsService";

export class FeedbackService {
  getUrl() { return import.meta.env.VITE_FEEDBACK_URL?.trim() || ""; }
  async open(): Promise<boolean> {
    const url = this.getUrl();
    if (!url) return false;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      analytics.track("feedback_opened", { gameVersion: GAME_VERSION, platform });
      if (Capacitor.isNativePlatform()) await Browser.open({ url: parsed.toString() });
      else {
        const opened = window.open(parsed.toString(), "_blank", "noopener,noreferrer");
        if (!opened) return false;
      }
      return true;
    } catch { return false; }
  }
}

export const feedback = new FeedbackService();