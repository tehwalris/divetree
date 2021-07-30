import { path } from "ramda";

export interface SpringOptions {
  stepMillis: number;
  precision: number;
  stiffness: number;
  damping: number;
}

export interface SpringInput {
  position: number;
  velocity: number;
  dtMillis: number;
  target: number;
}

export interface SpringResult {
  position: number;
  velocity: number;
}

export class SpringPath {
  constructor(private elements: SpringResult[], private stepMillis: number) {
    if (elements.length === 1) {
      elements = [];
    }
  }
}

export class Spring {
  constructor(private options: SpringOptions) {}

  calculateResult(input: SpringInput): SpringResult {
    let latestResult: SpringResult = {
      position: input.position,
      velocity: input.velocity,
    };
    this.calculate(input, (r) => {
      latestResult = r;
    });
    return latestResult;
  }

  calculatePath(input: SpringInput): SpringPath {
    const pathElements: SpringResult[] = [];
    this.calculate(input, (r) => {
      pathElements.push(r);
    });
    return new SpringPath(pathElements, this.options.stepMillis);
  }

  // Heavily based on the spring implementation in react-motion
  // https://github.com/chenglou/react-motion/blob/master/src/stepper.js
  private calculate(
    input: SpringInput,
    onElement: (result: SpringResult, dt: number) => void,
  ) {
    const k = this.options.stiffness;
    const b = this.options.damping;
    let s = input.position;
    let v = input.velocity;
    let dtRemaining = input.dtMillis;
    while (dtRemaining > 0) {
      let dt = Math.min(this.options.stepMillis, dtRemaining);
      dtRemaining -= dt;

      const springF = -k * (s - input.target);
      const damperF = -b * v;
      const a = springF + damperF; // assume mass = 1

      v = v + a * dt * 0.001;
      s = s + v * dt * 0.001;

      if (
        Math.abs(v) < this.options.precision &&
        Math.abs(s - input.target) < this.options.precision
      ) {
        onElement({ position: input.target, velocity: 0 }, dt);
        return;
      }

      onElement({ position: s, velocity: v }, dt);
    }
  }
}
