export class AdsService {
  private busy = false;
  isRewardedAdReady() {
    return import.meta.env.DEV && !this.busy;
  }
  async showRewardedAd(reason: "revive"): Promise<boolean> {
    if (reason !== "revive" || !this.isRewardedAdReady()) return false;
    this.busy = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return true;
    } finally {
      this.busy = false;
    }
  }
  showInterstitial(): Promise<void> {
    return Promise.resolve();
  }
}
export const ads = new AdsService();
