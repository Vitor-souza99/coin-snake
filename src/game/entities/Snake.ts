import { B } from "../data/balance";
import type { Point } from "../types/game";
import { distance, turnToward } from "../utils/math";
// Distance-sampled ring buffer: memory and body spacing do not depend on FPS.
export class Snake {
  x = 360;
  y = 690;
  angle = -Math.PI / 2;
  length: number = B.snake.initial;
  readonly body: Point[] = Array.from({ length: B.snake.max }, () => ({
    x: 360,
    y: 690,
  }));
  private capacity =
    Math.ceil((B.snake.max * B.snake.spacing) / B.snake.trailStep) + 10;
  private trail: Point[] = Array.from({ length: this.capacity }, () => ({
    x: 0,
    y: 0,
  }));
  private cursor = 0;
  private residual = 0;
  constructor() {
    this.reset();
  }
  reset(x = 360, y = 690) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.cursor = 0;
    this.residual = 0;
    for (let i = 0; i < this.capacity; i++) {
      const index = (this.capacity - i) % this.capacity;
      this.trail[index].x = this.x;
      this.trail[index].y = this.y + i * B.snake.trailStep;
    }
    this.placeBody();
  }
  grow() {
    this.length = Math.min(B.snake.max, this.length + 1);
  }
  move(
    dt: number,
    target: number,
    speed: number,
    turnSpeed: number = B.snake.rotation,
  ) {
    this.angle = turnToward(this.angle, target, turnSpeed * dt);
    const oldX = this.x,
      oldY = this.y,
      dx = Math.cos(this.angle),
      dy = Math.sin(this.angle),
      travel = speed * dt;
    this.x += dx * travel;
    this.y += dy * travel;
    let next = B.snake.trailStep - this.residual;
    while (next <= travel) {
      this.cursor = (this.cursor + 1) % this.capacity;
      const p = this.trail[this.cursor];
      p.x = oldX + dx * next;
      p.y = oldY + dy * next;
      next += B.snake.trailStep;
    }
    this.residual = (this.residual + travel) % B.snake.trailStep;
    this.placeBody();
  }
  private placeBody() {
    this.body[0].x = this.x;
    this.body[0].y = this.y;
    for (let i = 1; i < this.length; i++) {
      const offset = Math.max(
          0,
          (i * B.snake.spacing - this.residual) / B.snake.trailStep,
        ),
        whole = Math.floor(offset),
        fraction = offset - whole;
      const a =
          this.trail[(this.cursor - whole + this.capacity) % this.capacity],
        b =
          this.trail[
            (this.cursor - whole - 1 + 2 * this.capacity) % this.capacity
          ];
      this.body[i].x = a.x + (b.x - a.x) * fraction;
      this.body[i].y = a.y + (b.y - a.y) * fraction;
    }
  }
  selfCollision() {
    for (let i = B.snake.selfSkip; i < this.length; i++)
      if (distance(this, this.body[i]) < B.snake.radius * 1.65) return true;
    return false;
  }
}
