import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { save } from "../systems/SaveSystem";
export function haptic(kind: "coin" | "golden" | "power" | "error") {
  if (!save.profile.settings.haptics || !Capacitor.isNativePlatform()) return;
  const call =
    kind === "error"
      ? Haptics.notification({ type: NotificationType.Error })
      : Haptics.impact({
          style:
            kind === "coin"
              ? ImpactStyle.Light
              : kind === "golden"
                ? ImpactStyle.Heavy
                : ImpactStyle.Medium,
        });
  void call.catch(() => undefined);
}
