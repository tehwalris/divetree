import "jest";
import { Id } from "../interfaces/input";
import { PublicOutputNode } from "../interfaces/output";
import {
  makeInterpolators,
  drawRectFromInterpolator,
  DrawRect,
} from "../interpolate";
import { AnimationKind, AnimationGroup } from "../plan-animation";

function setup(): { [K in "before" | "after"]: Map<Id, PublicOutputNode> } {
  const makeOutputNodes = (
    list: PublicOutputNode[],
  ): Map<Id, PublicOutputNode> =>
    new Map(list.map((e) => [e.id, e] as [Id, PublicOutputNode]));
  return {
    before: makeOutputNodes([
      {
        id: "A",
        visible: true,
        size: [10, 10],
        offset: [50, 60],
      },
      {
        id: "B",
        visible: true,
        size: [40, 40],
        offset: [10, 40],
      },
      {
        id: "P",
        visible: false,
        size: [30, 20],
        offset: [20, 30],
      },
    ]),
    after: makeOutputNodes([
      {
        id: "A",
        visible: true,
        size: [20, 10],
        offset: [40, 40],
      },
      {
        id: "B",
        visible: true,
        size: [40, 40],
        offset: [30, 40],
      },
      {
        id: "P",
        visible: false,
        size: [10, 30],
        offset: [10, 0],
      },
    ]),
  };
}

function templatedTest(animation: AnimationGroup, expected: DrawRect[]) {
  return () => {
    const { before, after } = setup();
    const interpolators = makeInterpolators(before, after, animation);
    const actual = interpolators.map((interpolator) =>
      drawRectFromInterpolator(interpolator, 0.25),
    );
    expect(actual.length).toBe(expected.length);
    expected.forEach((a) => {
      expect(actual.find((b) => drawRectEqualEnough(a, b))).toBeTruthy();
    });
  };
}

function numberEqualEnough(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.1;
}

function vector2dEqualEnough(a: number[], b: number[]): boolean {
  if (a.length !== 2 || b.length !== 2) {
    throw new Error("expected 2 dimensions");
  }
  return a.every((v, i) => numberEqualEnough(v, b[i]));
}

function drawRectEqualEnough(a: DrawRect, b: DrawRect): boolean {
  let baseMatches =
    a.id === b.id &&
    a.lifecycle === b.lifecycle &&
    vector2dEqualEnough(a.withoutScaling.size, b.withoutScaling.size) &&
    vector2dEqualEnough(a.withoutScaling.offset, b.withoutScaling.offset) &&
    !a.withScaling === !b.withScaling &&
    !a.transitionBound === !b.transitionBound;
  if (a.transitionBound && b.transitionBound) {
    baseMatches =
      baseMatches &&
      vector2dEqualEnough(a.transitionBound.size, b.transitionBound.size) &&
      vector2dEqualEnough(a.transitionBound.offset, b.transitionBound.offset);
  }
  if (!a.withScaling || !baseMatches) {
    return baseMatches;
  }
  return (
    a.withScaling.scale === b.withScaling!.scale &&
    vector2dEqualEnough(a.withScaling.origin, b.withScaling!.origin)
  );
}

describe("makeInterpolator", () => {
  it(
    "transform",
    templatedTest(
      {
        kind: AnimationKind.Transform,
        content: ["A", "B"],
      },
      [
        {
          id: "A",
          lifecycle: 0,
          withoutScaling: {
            size: [12.5, 10],
            offset: [47.5, 55],
          },
          transitionBound: { size: [20, 30], offset: [40, 40] },
        },
        {
          id: "B",
          lifecycle: 0,
          withoutScaling: {
            size: [40, 40],
            offset: [15, 40],
          },
          transitionBound: { size: [60, 40], offset: [10, 40] },
        },
      ],
    ),
  );

  it(
    "enter",
    templatedTest(
      {
        kind: AnimationKind.Enter,
        parent: "P",
        content: ["A", "B"],
      },
      [
        {
          id: "A",
          lifecycle: -0.75,
          withoutScaling: {
            size: [20, 10],
            offset: [40, 40],
          },
          withScaling: {
            scale: 0.25,
            origin: [17.5, 33.7],
          },
        },
        {
          id: "B",
          lifecycle: -0.75,
          withoutScaling: {
            size: [40, 40],
            offset: [30, 40],
          },
          withScaling: {
            scale: 0.25,
            origin: [17.5, 33.75],
          },
        },
      ],
    ),
  );

  it(
    "leave",
    templatedTest(
      {
        kind: AnimationKind.Leave,
        parent: "P",
        content: ["A", "B"],
      },
      [
        {
          id: "A",
          lifecycle: 0.25,
          withoutScaling: {
            size: [10, 10],
            offset: [50, 60],
          },
          withScaling: {
            scale: 0.75,
            origin: [17.5, 33.75],
          },
        },
        {
          id: "B",
          lifecycle: 0.25,
          withoutScaling: {
            size: [40, 40],
            offset: [10, 40],
          },
          withScaling: {
            scale: 0.75,
            origin: [17.5, 33.7],
          },
        },
      ],
    ),
  );
});
