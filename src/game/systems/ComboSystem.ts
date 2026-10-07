import { B } from "../data/balance";
export class ComboSystem {
  value = 1;
  remaining = 0;
  max = 1;
  collect(): number {
    this.value = this.remaining > 0 ? Math.min(B.combo.max, this.value + 1) : 1;
    this.remaining = B.combo.timeout;
    this.max = Math.max(this.max, this.value);
    return this.value;
  }
  update(dt: number) {
    this.remaining = Math.max(0, this.remaining - dt);
    if (!this.remaining) this.value = 1;
  }
}
