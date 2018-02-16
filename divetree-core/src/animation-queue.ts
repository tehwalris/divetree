import { Node } from "./interfaces/input";

export type Spring = (
  args: {
    position: number;
    velocity: number;
    dtMillis: number;
    target: number;
  },
) => { position: number; velocity: number };

class AnimationQueue<T extends {}, I> {
  private points: [T, T, T, T | undefined];
  private intervals: [I, I, I];
  private position: number = 2;
  private velocity: number = 0;

  constructor(
    private spring: Spring,
    private buildInterval: (a: T, b: T | undefined) => I,
    initial: T,
  ) {
    this.spring = spring;
    this.buildInterval = buildInterval;

    this.points = [initial, initial, initial, undefined];
    const normalInterval = buildInterval(initial, initial);
    this.intervals = [
      normalInterval,
      normalInterval,
      buildInterval(initial, undefined),
    ];
  }

  queueChange(target: T) {
    this.points[3] = target;
    this.rebuildLastInterval();
  }

  tick(dtMillis: number): { interval: I; progress: number } {
    const hasQueued = this.points[3] !== undefined;
    this.tickSpring(dtMillis, hasQueued ? 3 : 2);
    if (hasQueued && this.position >= 2) {
      this.shiftLeft();
      this.rebuildLastInterval();
    }
    return { interval: this.intervals[2], progress: this.position - 1 };
  }

  private tickSpring(dtMillis: number, target: number) {
    const updated = this.spring({
      position: this.position,
      velocity: this.velocity,
      dtMillis,
      target,
    });
    this.position = updated.position;
    this.velocity = updated.velocity;
  }

  private shiftLeft() {
    this.position -= 1;
    shiftLeftInPlace(this.points);
    shiftLeftInPlace(this.intervals);
    this.rebuildLastInterval();
  }

  private rebuildLastInterval() {
    this.intervals[2] = this.buildInterval(this.points[2], this.points[3]);
  }
}

function shiftLeftInPlace<T>(target: T[]) {
  for (let i = 0; i < target.length; i += 1) {
    // shifts in undefined on last interation
    target[i] = target[i + 1];
  }
}
