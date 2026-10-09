import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Settings } from "../types/game";

interface NativeOrientationPlugin {
  setOrientation(options: { orientation: Settings["orientation"] }): Promise<void>;
  setImmersiveMode(options: { enabled: boolean }): Promise<void>;
}

const nativeOrientation = registerPlugin<NativeOrientationPlugin>("ScreenOrientation");

interface ScreenOrientationWithLock {
  lock?: (orientation: "portrait" | "landscape") => Promise<void>;
  unlock?: () => void;
}

/** Applies an orientation preference; browser locking may require fullscreen support. */
export async function applyOrientation(orientation: Settings["orientation"]): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await nativeOrientation.setOrientation({ orientation });
      return true;
    } catch {
      return false;
    }
  }

  const screenOrientation = screen.orientation as unknown as ScreenOrientationWithLock | undefined;
  if (!screenOrientation) return orientation === "auto";
  if (orientation === "auto") {
    screenOrientation.unlock?.();
    return true;
  }
  if (!screenOrientation.lock) return false;

  try {
    await screenOrientation.lock(orientation);
    return true;
  } catch {
    return false;
  }
}

/** Uses landscape as Candy World's Android default without overriding an explicit preference. */
export async function applyWorldOrientation(worldId: string, preference: Settings["orientation"]): Promise<boolean> {
  const isCandyAndroidDefault = Capacitor.isNativePlatform() && worldId === "candy-world" && preference === "auto";
  const orientation = isCandyAndroidDefault ? "landscape" : preference;
  return applyOrientation(orientation);
}

/** Hides Android system bars while the game scene is active. */
export async function setImmersiveMode(enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await nativeOrientation.setImmersiveMode({ enabled });
  } catch {
    // Browser builds and older native installs can continue without immersive mode.
  }
}