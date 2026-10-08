import { Capacitor } from "@capacitor/core";
import { AdMob, type RewardAdOptions } from "@capacitor-community/admob";

export type RewardedPlacement = "revive" | "shop-coins";

// Use Google's sample rewarded unit until real AdMob app/unit IDs are supplied.
const TEST_REWARDED_UNIT = "ca-app-pub-3940256099942544/5224354917";
const configuredUnit = import.meta.env.VITE_ADMOB_REWARDED_ID as string | undefined;
const rewardedUnit = configuredUnit?.trim() || TEST_REWARDED_UNIT;

export class AdsService {
  private busy = false;
  private initialized = false;
  private consentReady = false;

  isRewardedAdReady(): boolean {
    return Capacitor.isNativePlatform() && this.consentReady && Boolean(import.meta.env.DEV || configuredUnit?.trim()) && !this.busy;
  }

  async requestConsent(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.consentReady) return;
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && String(info.status) === "REQUIRED") info = await AdMob.showConsentForm();
      if (!info.canRequestAds) return;
      this.consentReady = true;
      await AdMob.initialize({ initializeForTesting: import.meta.env.DEV || !configuredUnit });
      this.initialized = true;
    } catch {
      this.consentReady = false;
    }
  }

  async showRewardedAd(_reason: RewardedPlacement): Promise<boolean> {
    if (!this.isRewardedAdReady()) return false;
    this.busy = true;
    try {
      if (!this.initialized) await this.requestConsent();
      if (!this.consentReady || !this.initialized) return false;
      await AdMob.prepareRewardVideoAd({ adId: rewardedUnit } satisfies RewardAdOptions);
      // The plugin resolves this promise only when its native reward callback fires.
      await AdMob.showRewardVideoAd({ adId: rewardedUnit });
      return true;
    } catch {
      return false;
    } finally {
      this.busy = false;
    }
  }

  showInterstitial(): Promise<void> {
    return Promise.resolve();
  }
}

export const ads = new AdsService();