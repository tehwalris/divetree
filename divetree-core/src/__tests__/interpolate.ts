import "jest";
import { Id } from "../interfaces/input";
import { PublicOutputNode } from "../interfaces/output";
import { makeInterpolator, DrawRect } from "../interpolate";
import { AnimationKind, AnimationGroup } from "../plan-animation";

function setup(): { [K in "before" | "after"]: Map<Id, PublicOutputNode> } {
  const makeOutputNodes = (
    list: PublicOutputNode[],
  ): Map<Id, PublicOutputNode> =>
    new Map(list.map(e => [e.id, e] as [Id, PublicOutputNode]));
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
    const interpolator = makeInterpolator(before, after, animation);
    const actual = interpolator(0.25);
    expect(actual.length).toBe(expected.length);
    expected.forEach(a =>
      expect(actual.find(b => drawRectEqualEnough(a, b))).toBeTruthy(),
    );
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
  return (
    a.id === b.id &&
    a.lifecycle === b.lifecycle &&
    vector2dEqualEnough(a.size, b.size) &&
    vector2dEqualEnough(a.offset, b.offset)
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
          size: [12.5, 10],
          offset: [47.5, 55],
        },
        {
          id: "B",
          lifecycle: 0,
          size: [40, 40],
          offset: [15, 40],
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
          size: [5, 2.5],
          offset: [23.1, 35.3],
        },
        {
          id: "B",
          lifecycle: -0.75,
          size: [10, 10],
          offset: [20.6, 35.3],
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
          size: [7.5, 7.5],
          offset: [41.8, 53.4],
        },
        {
          id: "B",
          lifecycle: 0.25,
          size: [30, 30],
          offset: [11.8, 38.4],
        },
      ],
    ),
  );

  test.skip("enter leave in special case", () => {
    // const origin = _origin || ***getCenterLeft(e);***
  });
});
