import { Output, convertAny } from "../tree-to-constraints";
import {
  NodeKind,
  Split,
  TightLeafNode,
  TightSplitNode,
  LooseNode,
  TightNode,
} from "../interfaces/input";
import * as kiwi from "kiwi.js";
import * as R from "ramda";

describe("convertTightLeaf", () => {
  const id = "test id";
  const output = convertAny(
    {
      kind: NodeKind.TightLeaf,
      id: id,
      size: [200, 50],
    },
    {} as any,
  );
  const rect = output.boundingRect;

  const solver = new kiwi.Solver();
  output.constraints.forEach(e => solver.addConstraint(e));

  test("returns a single rect", () => {
    expect(output.rects.length).toBe(1);
    expect(output.rects[0]).toBe(output.boundingRect);
  });

  test("usually creates a rect with the target size", () => {
    solver.addEditVariable(rect.intervals[0].start, kiwi.Strength.strong);
    solver.suggestValue(rect.intervals[0].start, 30);
    solver.addEditVariable(rect.intervals[1].end, kiwi.Strength.strong);
    solver.suggestValue(rect.intervals[1].end, 30);

    solver.updateVariables();
    expect(rect.build()).toEqual({
      id: id,
      visible: true,
      size: [200, 50],
      offset: [30, -20],
    });
  });

  test("rect cannot be compressed", () => {
    solver.addEditVariable(rect.intervals[1].start, kiwi.Strength.medium);
    solver.suggestValue(rect.intervals[1].start, -10);

    solver.updateVariables();
    expect(rect.build()).toEqual({
      id: id,
      visible: true,
      size: [200, 50],
      offset: [30, -20],
    });
  });

  test("rect can be expanded", () => {
    solver.suggestValue(rect.intervals[1].end, 100);

    solver.updateVariables();
    expect(rect.build()).toEqual({
      id: id,
      visible: true,
      size: [200, 110],
      offset: [30, -10],
    });
  });
});

describe("convertTightSplit", () => {
  function setup(
    split: Split,
  ): {
    ids: {}[];
    input: TightSplitNode;
    output: Output;
    solver: kiwi.Solver;
  } {
    const ids = ["A", "B", "C"];
    const input = {
      kind: NodeKind.TightSplit as NodeKind.TightSplit,
      split,
      children: [
        {
          kind: NodeKind.TightLeaf,
          id: ids[0],
          size: [50, 10],
        },
        {
          kind: NodeKind.TightLeaf,
          id: ids[1],
          size: [30, 20],
        },
        {
          kind: NodeKind.TightLeaf,
          id: ids[2],
          size: [55, 15],
        },
      ] as TightLeafNode[],
    };
    const output = convertAny(input, {
      loose: {} as any,
    });
    const solver = new kiwi.Solver();
    output.constraints.forEach(e => solver.addConstraint(e));
    return { ids, input, output, solver };
  }

  test("passes through all rects and creates own", () => {
    const { input, output } = setup(Split.Stacked);
    expect(output.rects.length).toBe(4);
    input.children.forEach(a => {
      expect(output.rects.find(b => (a as any).id === b.id)).toBeTruthy();
    });
  });

  test("creates the correct layout (base case, stacked)", () => {
    const { ids, output, solver } = setup(Split.Stacked);
    const expected = [
      {
        id: ids[0],
        visible: true,
        size: [55, 10],
        offset: [3, 7],
      },
      {
        id: ids[1],
        visible: true,
        size: [55, 20],
        offset: [3, 17],
      },
      {
        id: ids[2],
        visible: true,
        size: [55, 15],
        offset: [3, 37],
      },
      {
        id: undefined,
        visible: false,
        size: [55, 45],
        offset: [3, 7],
      },
    ];

    [3, 7].forEach((e, i) => {
      const variable = output.boundingRect.intervals[i].start;
      solver.addEditVariable(variable, kiwi.Strength.strong);
      solver.suggestValue(variable, e);
    });
    solver.updateVariables();
    const actual = output.rects.map(e => e.build());

    expect(expected.length).toBe(actual.length);
    expected.forEach(e => expect(actual).toContainEqual(e));
  });

  test("creates the correct layout (base case, side-by-side)", () => {
    const { ids, output, solver } = setup(Split.SideBySide);
    const expected = [
      {
        id: ids[0],
        visible: true,
        size: [50, 20],
        offset: [3, 7],
      },
      {
        id: ids[1],
        visible: true,
        size: [30, 20],
        offset: [53, 7],
      },
      {
        id: ids[2],
        visible: true,
        size: [55, 20],
        offset: [83, 7],
      },
      {
        id: undefined,
        visible: false,
        size: [135, 20],
        offset: [3, 7],
      },
    ];

    [3, 7].forEach((e, i) => {
      const variable = output.boundingRect.intervals[i].start;
      solver.addEditVariable(variable, kiwi.Strength.strong);
      solver.suggestValue(variable, e);
    });
    solver.updateVariables();
    const actual = output.rects.map(e => e.build());

    expect(expected.length).toBe(actual.length);
    expected.forEach(e => expect(actual).toContainEqual(e));
  });

  test("is stretchable in equal direction", () => {
    const { ids, output, solver } = setup(Split.Stacked);
    const expected = [
      {
        id: ids[0],
        visible: true,
        size: [80, 10],
        offset: [3, 7],
      },
      {
        id: ids[1],
        visible: true,
        size: [80, 20],
        offset: [3, 17],
      },
      {
        id: ids[2],
        visible: true,
        size: [80, 15],
        offset: [3, 37],
      },
      {
        id: undefined,
        visible: false,
        size: [80, 45],
        offset: [3, 7],
      },
    ];

    R.forEachObjIndexed(
      (g, k) => {
        g.forEach((e, i) => {
          const variable = output.boundingRect.intervals[i][k];
          solver.addEditVariable(variable, kiwi.Strength.strong);
          solver.suggestValue(variable, e);
        });
      },
      { start: [3, 7], end: [83, 52] },
    );
    solver.updateVariables();
    const actual = output.rects.map(e => e.build());

    expect(expected.length).toBe(actual.length);
    expected.forEach(e => expect(actual).toContainEqual(e));
  });

  test("is stretchable in shift direction");

  test("throws without children", () => {
    const input = {
      kind: NodeKind.TightSplit as NodeKind.TightSplit,
      split: Split.SideBySide,
      children: [],
    };
    expect(() => {
      convertAny(input, {
        loose: {} as any,
      });
    }).toThrow();
  });
});

describe("convertLoose", () => {
  test("(no children)", () => {
    const input = {
      kind: NodeKind.Loose as NodeKind.Loose,
      id: "loose",
      parent: {
        kind: NodeKind.TightLeaf,
        id: "parent",
        size: [30, 35],
      } as TightLeafNode,
      children: [],
    };
    const output = convertAny(input, {
      loose: {
        verticalPadding: 7,
        siblingDistance: 8,
        singleChildDistance: 5,
        multiChildDistance: 10,
      },
    });
    const expected = [
      {
        id: "loose",
        visible: false,
        offset: [3, 7],
        size: [30, 49],
      },
      {
        id: "parent",
        visible: true,
        offset: [3, 14],
        size: [30, 35],
      },
    ];

    const solver = new kiwi.Solver();
    output.constraints.forEach(e => solver.addConstraint(e));
    [3, 7].forEach((e, i) => {
      const variable = output.boundingRect.intervals[i].start;
      solver.addEditVariable(variable, kiwi.Strength.strong);
      solver.suggestValue(variable, e);
    });
    solver.updateVariables();
    const actual = output.rects.map(e => e.build());

    expect(expected.length).toBe(actual.length);
    expected.forEach(e => expect(actual).toContainEqual(e));
  });

  test("(single child)", () => {
    const input = {
      kind: NodeKind.Loose as NodeKind.Loose,
      id: "loose",
      parent: {
        kind: NodeKind.TightLeaf,
        id: "parent",
        size: [30, 35],
      } as TightLeafNode,
      children: [
        {
          kind: NodeKind.TightLeaf,
          id: "child",
          size: [50, 10],
        } as TightNode,
      ],
    };
    const output = convertAny(input, {
      loose: {
        verticalPadding: 7,
        siblingDistance: 8,
        singleChildDistance: 5,
        multiChildDistance: 10,
      },
    });
    const expected = [
      {
        id: "loose",
        visible: false,
        offset: [3, 7],
        size: [85, 49],
      },
      {
        id: "parent",
        visible: true,
        offset: [3, 14],
        size: [30, 35],
      },
      {
        id: "child",
        visible: true,
        offset: [38, 26.5],
        size: [50, 10],
      },
    ];

    const solver = new kiwi.Solver();
    output.constraints.forEach(e => solver.addConstraint(e));
    [3, 7].forEach((e, i) => {
      const variable = output.boundingRect.intervals[i].start;
      solver.addEditVariable(variable, kiwi.Strength.strong);
      solver.suggestValue(variable, e);
    });
    solver.updateVariables();
    const actual = output.rects.map(e => e.build());

    expect(expected.length).toBe(actual.length);
    expected.forEach(e => expect(actual).toContainEqual(e));
  });

  describe("(multiple children)", () => {
    function setup(): {
      input: LooseNode;
      output: Output;
      solver: kiwi.Solver;
    } {
      const input = {
        kind: NodeKind.Loose as NodeKind.Loose,
        id: "loose",
        parent: {
          kind: NodeKind.TightLeaf,
          id: "parent",
          size: [30, 35],
        } as TightLeafNode,
        children: [[50, 10], [30, 20], [55, 15]].map((e, i) => ({
          kind: NodeKind.TightLeaf,
          id: i,
          size: e,
        })) as TightNode[],
      };
      const output = convertAny(input, {
        loose: {
          verticalPadding: 7,
          siblingDistance: 8,
          singleChildDistance: 5,
          multiChildDistance: 10,
        },
      });
      const solver = new kiwi.Solver();
      output.constraints.forEach(e => solver.addConstraint(e));
      return { input, output, solver };
    }

    test("passes through all rects and creates own", () => {
      const { input, output } = setup();
      expect(output.rects.length).toBe(1 + 1 + 3);
      input.children.forEach(a => {
        expect(
          output.rects.find(b => (a as TightLeafNode).id === b.id),
        ).toBeTruthy();
      });
      expect(
        output.rects.find(b => (input.parent as TightLeafNode).id === b.id),
      ).toBeTruthy();
      expect(output.rects.filter(e => e.id === "loose").length).toBe(1);
    });

    test("typical layout", () => {
      const { output, solver } = setup();
      const expected = [
        // bounding rect
        {
          id: "loose",
          visible: false,
          offset: [3, 7],
          size: [95, 75],
        },
        // parent
        {
          id: "parent",
          visible: true,
          offset: [3, 27],
          size: [30, 35],
        },
        // children
        {
          id: 0,
          visible: true,
          offset: [43, 14],
          size: [50, 10],
        },
        {
          id: 1,
          visible: true,
          offset: [43, 32],
          size: [30, 20],
        },
        {
          id: 2,
          visible: true,
          offset: [43, 60],
          size: [55, 15],
        },
      ];

      [3, 7].forEach((e, i) => {
        const variable = output.boundingRect.intervals[i].start;
        solver.addEditVariable(variable, kiwi.Strength.strong);
        solver.suggestValue(variable, e);
      });
      solver.updateVariables();
      const actual = output.rects.map(e => e.build());

      expect(expected.length).toBe(actual.length);
      expected.forEach(e => expect(actual).toContainEqual(e));
    });
  });
});
