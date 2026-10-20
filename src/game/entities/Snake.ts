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
  private readonly capacity =
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
  reset(x = 360, y = 690, angle = -Math.PI / 2) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.cursor = 0;
    this.residual = 0;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    for (let i = 0; i < this.capacity; i++) {
      const index = (this.capacity - i) % this.capacity;
      this.trail[index].x = this.x - dx * i * B.snake.trailStep;
      this.trail[index].y = this.y - dy * i * B.snake.trailStep;
    }
    this.placeBody();
  }
  restore(x: number, y: number, angle: number, length: number) {
    if (![x, y, angle, length].every(Number.isFinite)) return false;
    if (length < 1 || length > B.snake.max) return false;
    this.length = Math.floor(length);
    this.reset(x, y, angle);
    return true;
  }
  grow() {
    if (this.length >= B.snake.max) return;
    const previousTail = this.body[this.length - 1];
    const newSegment = this.body[this.length];
    newSegment.x = previousTail.x;
    newSegment.y = previousTail.y;
    this.length++;
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
  moveVector(dt: number, target: number, speed: number, force: Point, turnSpeed: number = B.snake.rotation, maxSpeed = Number.POSITIVE_INFINITY) {
    this.angle = turnToward(this.angle, target, turnSpeed * dt);
    const oldX = this.x, oldY = this.y;
    let velocity = { x: Math.cos(this.angle) * speed + force.x, y: Math.sin(this.angle) * speed + force.y };
    const velocityMagnitude = Math.hypot(velocity.x, velocity.y);
    if (velocityMagnitude > maxSpeed) velocity = { x: velocity.x / velocityMagnitude * maxSpeed, y: velocity.y / velocityMagnitude * maxSpeed };
    const travel = Math.hypot(velocity.x, velocity.y) * dt;
    if (travel <= 0) return;
    const dx = velocity.x / Math.hypot(velocity.x, velocity.y), dy = velocity.y / Math.hypot(velocity.x, velocity.y);
    this.x += velocity.x * dt;
    this.y += velocity.y * dt;
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
