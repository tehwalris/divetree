import "jest";
import { createSpring } from "../spring";

describe("spring", () => {
  it("generally behaves as expected", () => {
    const spring = createSpring({
      stepMillis: 10,
      precision: 1,
      stiffness: 9,
      damping: 1,
    });
    [
      { t: 0, s: [250, 250], v: [0, 0] },
      { t: 1, s: [0, 25], v: [-80, -30] },
      { t: 2, s: [126, 175], v: [30, 80] },
      { t: 10, s: [98, 102], v: [-5, 5] },
      { t: 100, s: [100, 100], v: [0, 0] },
    ].forEach((e) => {
      const out = spring({
        dtMillis: e.t * 1000,
        position: 250,
        velocity: 0,
        target: 100,
      });
      expect(out.position).toBeGreaterThanOrEqual(e.s[0]);
      expect(out.position).toBeLessThanOrEqual(e.s[1]);
      expect(out.velocity).toBeGreaterThanOrEqual(e.v[0]);
      expect(out.velocity).toBeLessThanOrEqual(e.v[1]);
    });
  });
});
