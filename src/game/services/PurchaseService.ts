/** Virtual-currency-only boundary. Real billing is intentionally not integrated. */
export class PurchaseService {
  async purchaseCosmetic(productId: string): Promise<false> {
    void productId;
    return false;
  }
}
export const purchases = new PurchaseService();