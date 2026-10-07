import { controls } from "../data/controls";
import { turnToward } from "../utils/math";
export function joystickDirection(x: number, y: number): number | null {
  return Math.hypot(x, y) < controls.deadZone ? null : Math.atan2(y, x);
}
export class SteeringSystem {
  angle = -Math.PI / 2;
  update(target: number, dt: number) {
    const delta = Math.atan2(
      Math.sin(target - this.angle),
      Math.cos(target - this.angle),
    );
    this.angle = turnToward(
      this.angle,
      target,
      Math.abs(delta) * (1 - Math.exp(-controls.smoothing * dt)),
    );
    return this.angle;
  }
  reset(angle: number) {
    this.angle = angle;
  }
}
