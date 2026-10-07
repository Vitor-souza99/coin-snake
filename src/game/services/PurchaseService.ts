export type PurchaseResult =
  | { status: "purchased"; productId: string }
  | { status: "notAvailable"; productId: string };
export interface PurchaseProduct {
  productId: string;
  type: "non-consumable";
}
/** No-op billing boundary. Local save data is never authoritative for premium ownership. */
export class PurchaseService {
  isAvailable(): boolean {
    return false;
  }
  getProduct(productId: string): PurchaseProduct | null {
    return productId.startsWith("coinsnake.skin.")
      ? { productId, type: "non-consumable" }
      : null;
  }
  async purchase(productId: string): Promise<PurchaseResult> {
    return { status: "notAvailable", productId };
  }
  async restorePurchases(): Promise<{ status: "notAvailable" }> {
    return { status: "notAvailable" };
  }
  /** Backward-compatible boundary used by older callers. */
  async purchaseCosmetic(productId: string): Promise<false> {
    await this.purchase(productId);
    return false;
  }
}
export const purchases = new PurchaseService();