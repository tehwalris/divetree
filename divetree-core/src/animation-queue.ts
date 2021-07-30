import { Spring } from "./spring";

export class AnimationQueue<T, I> {
  private points: [T, T, T, T | undefined];
  private intervals: [I, I, I | undefined];
  private position: number = 2;
  private velocity: number = 0;
  private spring: Spring;
  private pointsDidChange = true;

  constructor(
    statelessSpring: Spring,
    private buildInterval: (a: T, b: T) => I,
    initial: T,
  ) {
    this.spring = statelessSpring;
    this.buildInterval = buildInterval;

    this.points = [initial, initial, initial, undefined];
    const normalInterval = buildInterval(initial, initial);
    this.intervals = [normalInterval, normalInterval, undefined];
  }

  queueChange(target: T) {
    this.points[3] = target;
    this.pointsDidChange = true;
    this.rebuildLastInterval();
  }

  tick(dtMillis: number): {
    interval: I;
    progress: number;
    didChange: boolean;
  } {
    const hasQueued = this.points[3] !== undefined;
    const springDidChange = this.tickSpring(dtMillis, hasQueued ? 3 : 2);
    let didChange = springDidChange || this.pointsDidChange;
    this.pointsDidChange = false;
    if (hasQueued && this.position >= 2) {
      didChange = true;
      this.shiftLeft();
      this.rebuildLastInterval();
    }
    const i = this.getCurrentIntervalIndex();
    return {
      interval: this.intervals[i]!,
      progress: this.position - i,
      didChange,
    };
  }

  private tickSpring(dtMillis: number, target: number): boolean {
    const updated = this.spring.calculateResult({
      position: this.position,
      velocity: this.velocity,
      dtMillis,
      target,
    });
    if (
      this.position === updated.position &&
      this.velocity === updated.velocity
    ) {
      return false;
    }
    this.position = updated.position;
    this.velocity = updated.velocity;
    return true;
  }

  private shiftLeft() {
    this.position -= 1;
    shiftLeftInPlace(this.points);
    shiftLeftInPlace(this.intervals);
    this.rebuildLastInterval();
  }

  private rebuildLastInterval() {
    const lastPoint = this.points[3];
    this.intervals[2] = lastPoint
      ? this.buildInterval(this.points[2], lastPoint)
      : undefined;
  }

  private getCurrentIntervalIndex(): number {
    const limit = this.intervals[2] === undefined ? 1 : 2;
    return Math.max(0, Math.min(limit, Math.floor(this.position)));
  }
}

function shiftLeftInPlace<T>(target: T[]) {
  for (let i = 0; i < target.length; i += 1) {
    // shifts in undefined on last interation
    target[i] = target[i + 1];
  }
}
