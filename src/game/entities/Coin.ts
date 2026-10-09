import Phaser from "phaser";
import { B, beeCoins, candyWorldCoinWeights, fireflyCoins, type CoinKind } from "../data/balance";
import { weighted } from "../utils/math";
export class Coin {
  x = 0;
  y = 0;
  active = false;
  kind: CoinKind = B.coins[0];
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  constructor(s: Phaser.Scene) {
    this.image = s.add.image(0, 0, "coin-normal").setVisible(false);
    this.label = s.add
      .text(0, 0, "1", {
        fontFamily: "Arial",
        fontSize: "19px",
        fontStyle: "bold",
        color: "#273f36",
      })
      .setOrigin(0.5)
      .setVisible(false);
  }
  spawn(x: number, y: number, beeEquipped: boolean | "firefly" = false, luckyStar = false, candyWorld = false) {
    this.x = x;
    this.y = y;
    const source: ReadonlyArray<{ id: string; value: number; score: number; weight: number; color: number; label: string }> =
      beeEquipped === "firefly" ? fireflyCoins : beeEquipped ? beeCoins : B.coins;
    const candyAdjusted = candyWorld ? candyWorldCoinWeights(source) : source;
    const weights = luckyStar
      ? candyAdjusted.map((coin) => ({ ...coin, weight: Math.max(0, coin.weight + (coin.id === "normal" ? -10 : coin.id === "blue" ? 5 : coin.id === "diamond" ? 3 : coin.id === "golden" || coin.id === "mythic" ? 1 : 0)) }))
      : candyAdjusted;
    this.kind = weighted(weights) as CoinKind;
    this.active = true;
    this.image.setTexture(`coin-${this.kind.id}`).setVisible(true);
    this.label.setText(this.kind.label).setVisible(true);
    this.render();
  }
  spawnCandy(x: number, y: number) {
    this.x = x;
    this.kind = B.coins.find((coin) => coin.id === "candy_coin")!;
    this.y = y;
    this.active = true;
    this.image.setTexture("coin-candy_coin").setVisible(true);
    this.label.setText(this.kind.label).setVisible(true);
    this.render();
  }
  spawnPearl(x: number, y: number) {
    const pearl = B.coins.find((coin) => coin.id === "pearl_coin");
    if (!pearl) return;
    this.x = x;
    this.y = y;
    this.kind = pearl as CoinKind;
    this.active = true;
    this.image.setTexture("coin-pearl_coin").setVisible(true);
    this.label.setText(this.kind.label).setVisible(true);
    this.render();
  }
  render() {
    this.image.setPosition(this.x, this.y);
    this.label.setPosition(this.x, this.y);
  }
  hide() {
    this.active = false;
    this.image.setVisible(false);
    this.label.setVisible(false);
  }
}
