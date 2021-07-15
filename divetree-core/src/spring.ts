export type Spring = (args: {
  position: number;
  velocity: number;
  dtMillis: number;
  target: number;
}) => { position: number; velocity: number };

// Heavily based on the spring implementation in react-motion
// https://github.com/chenglou/react-motion/blob/master/src/stepper.js
export function createSpring({
  stepMillis,
  precision,
  stiffness: k,
  damping: b,
}: {
  stepMillis: number;
  precision: number;
  stiffness: number;
  damping: number;
}): Spring {
  return ({ position, velocity, dtMillis: dtWhole, target }) => {
    let s = position;
    let v = velocity;
    let dtRemaining = dtWhole;
    while (dtRemaining > 0) {
      let dt = Math.min(stepMillis, dtRemaining);
      dtRemaining -= dt;

      const springF = -k * (s - target);
      const damperF = -b * v;
      const a = springF + damperF; // assume mass = 1

      v = v + a * dt * 0.001;
      s = s + v * dt * 0.001;

      if (Math.abs(v) < precision && Math.abs(s - target) < precision) {
        return { position: target, velocity: 0 };
      }
    }
    return { position: s, velocity: v };
  };
}
