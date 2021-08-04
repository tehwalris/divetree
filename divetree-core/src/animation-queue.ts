import { Spring, SpringPath, SpringResult } from "./spring";

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
    didShift: boolean;
  } {
    const hasQueued = this.points[3] !== undefined;
    const springDidChange = this.tickSpring(dtMillis, hasQueued ? 3 : 2);
    return this.finishTick(hasQueued, springDidChange);
  }

  calculatePath(): {
    interval: I;
    progressPath: SpringPath;
    willChange: boolean;
  } {
    const stepMillis = 5;
    const elements: SpringResult[] = [];
    let firstInterval: I | undefined;
    let willChange = false;
    const futureSelf = this.clone();
    while (true) {
      const { interval, progress, didChange, didShift } =
        futureSelf.tick(stepMillis);
      if (didChange) {
        willChange = true;
      }
      if (!elements.length) {
        firstInterval = interval;
      }
      if (elements.length && (!didChange || didShift)) {
        console.log(
          "DEBUG calculatePath stop",
          elements.length,
          didChange,
          didShift,
        );
        break;
      }
      elements.push({ position: progress, velocity: 0 });
    }
    return {
      interval: firstInterval!,
      progressPath: new SpringPath(elements, stepMillis),
      willChange,
    };
  }

  private finishTick(
    hasQueued: boolean,
    springDidChange: boolean,
  ): {
    interval: I;
    progress: number;
    didChange: boolean;
    didShift: boolean;
  } {
    let didChange = springDidChange || this.pointsDidChange;
    let didShift = false;
    this.pointsDidChange = false;
    if (hasQueued && this.position >= 2) {
      didChange = true;
      didShift = true;
      this.shiftLeft();
      this.rebuildLastInterval();
    }
    const i = this.getCurrentIntervalIndex();
    return {
      interval: this.intervals[i]!,
      progress: this.position - i,
      didChange,
      didShift,
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

  private clone(): AnimationQueue<T, I> {
    const other = new AnimationQueue(
      this.spring,
      this.buildInterval,
      this.points[0],
    );
    other.points = [...this.points];
    other.intervals = [...this.intervals];
    other.position = this.position;
    other.velocity = this.velocity;
    other.spring = this.spring;
    other.pointsDidChange = this.pointsDidChange;
    other.buildInterval = this.buildInterval;
    return other;
  }
}

function shiftLeftInPlace<T>(target: T[]) {
  for (let i = 0; i < target.length; i += 1) {
    // shifts in undefined on last iteration
    target[i] = target[i + 1];
  }
}
