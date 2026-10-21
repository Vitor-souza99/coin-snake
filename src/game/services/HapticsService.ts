import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { save } from "../systems/SaveSystem";
export function haptic(kind: "coin" | "golden" | "power" | "error") {
  if (!save.profile.settings.haptics) return;

  if (Capacitor.isNativePlatform()) {
    const call = kind === "error"
      ? Haptics.notification({ type: NotificationType.Error })
      : Haptics.impact({
          style: kind === "coin"
            ? ImpactStyle.Light
            : kind === "golden"
              ? ImpactStyle.Heavy
              : ImpactStyle.Medium,
        });
    void call.catch(() => vibrateInBrowser(kind));
    return;
  }

  vibrateInBrowser(kind);
}

function vibrateInBrowser(kind: "coin" | "golden" | "power" | "error") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = kind === "error"
    ? [35, 45, 35]
    : kind === "coin"
      ? [18]
      : kind === "golden"
        ? [70]
        : [40, 35, 40];
  navigator.vibrate(pattern);
}
