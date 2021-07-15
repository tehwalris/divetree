import "jest";
import { AnimationQueue } from "../animation-queue";

// AnimationQueue should not care about dtMillis and velocity,
// so arbitary values are used in these tests

describe("AnimationQueue", () => {
  let buildInterval: <T>(a: T, b: T) => [T, T];
  beforeEach(() => {
    buildInterval = (a, b) => [a, b];
  });

  it("has expected initial state", () => {
    const spring = jest.fn().mockReturnValueOnce({ position: 2, velocity: 0 });
    const queue = new AnimationQueue(spring, buildInterval, "a");
    expect(queue.tick(0)).toEqual({
      interval: ["a", "a"],
      progress: 1,
    });
    expect(spring.mock.calls).toEqual([
      [{ position: 2, velocity: 0, target: 2, dtMillis: 0 }],
    ]);
  });

  it("doesn't change state if spring doesn't move", () => {
    const spring = jest.fn().mockReturnValue({ position: 2, velocity: 0 });
    const queue = new AnimationQueue(spring, buildInterval, "a");
    [1000, 0, 9999, 83888].forEach((dt) => {
      expect(queue.tick(dt)).toEqual({
        interval: ["a", "a"],
        progress: 1,
      });
    });
  });

  it("moves through initial interval according to spring position", () => {
    const spring = jest.fn();
    const queue = new AnimationQueue(spring, buildInterval, "a");
    [
      {
        call: { position: 2, velocity: 0 },
        return: { position: 1.5, velocity: 1.2 },
        progress: 0.5,
        dtMillis: 7,
      },
      {
        call: { position: 1.5, velocity: 1.2 },
        return: { position: 1.25, velocity: 4 },
        progress: 0.25,
        dtMillis: -50,
      },
      {
        call: { position: 1.25, velocity: 4 },
        return: { position: 2, velocity: 4 },
        progress: 1,
        dtMillis: 0,
      },
    ].forEach((e) => {
      spring.mockReturnValueOnce(e.return);
      expect(queue.tick(e.dtMillis)).toEqual({
        interval: ["a", "a"],
        progress: e.progress,
      });
      expect(spring).toHaveBeenLastCalledWith({
        target: 2,
        dtMillis: e.dtMillis,
        ...e.call,
      });
    });
  });

  it("extrapolates if no next interval is available", () => {
    const spring = jest
      .fn()
      .mockReturnValueOnce({ position: 2.25, velocity: 0 });
    const queue = new AnimationQueue(spring, buildInterval, "a");
    expect(queue.tick(0)).toEqual({
      interval: ["a", "a"],
      progress: 1.25,
    });
  });

  it("switches to queued interval if there is one", () => {
    const spring = jest
      .fn()
      .mockReturnValueOnce({ position: 2.25, velocity: 0 });
    const queue = new AnimationQueue(spring, buildInterval, "a");
    queue.queueChange("b");
    expect(queue.tick(0)).toEqual({
      interval: ["a", "b"],
      progress: 0.25,
    });
  });

  it("lets the queued interval be replaced if it isn't reached yet", () => {
    const spring = jest.fn();
    const queue = new AnimationQueue(spring, buildInterval, "a");

    queue.queueChange("b");
    queue.queueChange("c");
    spring.mockReturnValueOnce({ position: 2.25, velocity: 4 });
    expect(queue.tick(3)).toEqual({
      interval: ["a", "c"],
      progress: 0.25,
    });
    expect(spring).toHaveBeenLastCalledWith({
      position: 2,
      velocity: 0,
      target: 3,
      dtMillis: 3,
    });

    spring.mockReturnValueOnce({ position: 2, velocity: 8 });
    expect(queue.tick(9)).toEqual({
      interval: ["a", "c"],
      progress: 1,
    });
    expect(spring).toHaveBeenLastCalledWith({
      // position coordinate system shifted by -1
      // spring is stateless, so it doesn't care
      position: 1.25, // 2.25 - 1
      velocity: 4, // unchanged by shift
      target: 2, // 3 - 1
      dtMillis: 9, // unchanged by shift
    });
  });

  it("does nothing instead of undershooting initially", () => {
    const spring = jest
      .fn()
      .mockReturnValueOnce({ position: 0.75, velocity: 0 });
    const queue = new AnimationQueue(spring, buildInterval, "a");
    expect(queue.tick(0)).toEqual({
      interval: ["a", "a"],
      progress: 0.75,
    });
  });

  it("supports undershoot in the typical case", () => {
    // undershoot should only typically occur after reaching a target, overshooting, then bouncing back a little
    // though it could occur in other cases, they are not worth carefully planned support

    const spring = jest.fn();
    const queue = new AnimationQueue(spring, buildInterval, "a");

    // move past b
    queue.queueChange("b");
    spring.mockReturnValueOnce({ position: 3.25, velocity: 0 });
    expect(queue.tick(0)).toEqual({
      interval: ["a", "b"],
      progress: 1.25,
    });

    // move past c
    queue.queueChange("c");
    spring.mockReturnValueOnce({ position: 3.25, velocity: 0 });
    expect(queue.tick(0)).toEqual({
      interval: ["b", "c"],
      progress: 1.25,
    });
    expect(spring).toHaveBeenLastCalledWith({
      position: 2.25, // 3.25 - 1
      velocity: 0,
      target: 3,
      dtMillis: 0,
    });

    // undershoot (drop back under c) our target (now 2, not 3, due to shift)
    spring.mockReturnValueOnce({ position: 0.5, velocity: 0 });
    expect(queue.tick(0)).toEqual({
      interval: ["a", "b"],
      progress: 0.5,
    });
    expect(spring).toHaveBeenLastCalledWith({
      position: 2.25, // 3.25 - 1
      velocity: 0,
      target: 2,
      dtMillis: 0,
    });

    // stabilize back in the "current" interval
    spring.mockReturnValueOnce({ position: 1.25, velocity: 0 });
    expect(queue.tick(0)).toEqual({
      interval: ["b", "c"],
      progress: 0.25,
    });
  });

  it("deals with spring misbehaving", () => {
    const spring = jest.fn();
    const queue = new AnimationQueue(spring, buildInterval, "a");
    spring.mockReturnValueOnce({ position: 999999, velocity: 0 });
    expect(queue.tick(0)).toEqual({
      interval: ["a", "a"],
      progress: 999998,
    });
    spring.mockReturnValueOnce({ position: -999999, velocity: 0 });
    expect(queue.tick(0)).toEqual({
      interval: ["a", "a"],
      progress: -999999,
    });
  });
});
