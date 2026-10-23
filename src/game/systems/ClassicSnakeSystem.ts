export type SnakeDirection = "up" | "right" | "down" | "left";

export interface GridPoint {
  x: number;
  y: number;
}

export interface ClassicSnakeState {
  width: number;
  height: number;
  body: GridPoint[];
  direction: SnakeDirection;
  food: GridPoint;
  score: number;
  over: boolean;
}

const vectors: Record<SnakeDirection, GridPoint> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function turnSnake(state: ClassicSnakeState, direction: SnakeDirection): void {
  const current = vectors[state.direction];
  const next = vectors[direction];
  if (current.x + next.x === 0 && current.y + next.y === 0) return;
  state.direction = direction;
}

export function stepSnake(
  state: ClassicSnakeState,
  random: () => number = Math.random,
): ClassicSnakeState {
  if (state.over) return state;
  const vector = vectors[state.direction];
  const head = { x: state.body[0].x + vector.x, y: state.body[0].y + vector.y };
  const eating = head.x === state.food.x && head.y === state.food.y;
  const collisionBody = eating ? state.body : state.body.slice(0, -1);

  if (
    head.x < 0 || head.x >= state.width || head.y < 0 || head.y >= state.height ||
    collisionBody.some((part) => part.x === head.x && part.y === head.y)
  ) {
    state.over = true;
    return state;
  }

  state.body = [head, ...state.body.slice(0, eating ? undefined : -1)];
  if (eating) {
    state.score++;
    const available: GridPoint[] = [];
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (!state.body.some((part) => part.x === x && part.y === y)) available.push({ x, y });
      }
    }
    if (!available.length) state.over = true;
    else state.food = available[Math.min(available.length - 1, Math.floor(random() * available.length))];
  }
  return state;
}