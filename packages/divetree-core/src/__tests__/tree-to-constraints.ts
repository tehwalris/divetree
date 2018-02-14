import {
  convertTightLeaf,
  convertTightSplit,
  Output,
  convertLoose,
} from "../tree-to-constraints";
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
  const output = convertTightLeaf({
    kind: NodeKind.TightLeaf,
    id: id,
    size: [200, 50],
  });
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
      size: [200, 50],
      offset: [30, -20],
    });
  });

  test("rect can be expanded", () => {
    solver.suggestValue(rect.intervals[1].end, 100);

    solver.updateVariables();
    expect(rect.build()).toEqual({
      id: id,
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
    const output = convertTightSplit(input, {
      tightSplit: { equalSize: true },
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
        size: [55, 20],
        offset: [3, 7],
      },
      {
        id: ids[1],
        size: [55, 20],
        offset: [3, 27],
      },
      {
        id: ids[2],
        size: [55, 20],
        offset: [3, 47],
      },
      {
        id: undefined,
        size: [55, 60],
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
        size: [55, 20],
        offset: [3, 7],
      },
      {
        id: ids[1],
        size: [55, 20],
        offset: [58, 7],
      },
      {
        id: ids[2],
        size: [55, 20],
        offset: [113, 7],
      },
      {
        id: undefined,
        size: [165, 20],
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

  test("stretches evenly", () => {
    const { ids, output, solver } = setup(Split.Stacked);
    const expected = [
      {
        id: ids[0],
        size: [60, 100],
        offset: [3, 7],
      },
      {
        id: ids[1],
        size: [60, 100],
        offset: [3, 107],
      },
      {
        id: ids[2],
        size: [60, 100],
        offset: [3, 207],
      },
      {
        id: undefined,
        size: [60, 300],
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
      { start: [3, 7], end: [63, 307] },
    );
    solver.updateVariables();
    const actual = output.rects.map(e => e.build());

    expect(expected.length).toBe(actual.length);
    expected.forEach(e => expect(actual).toContainEqual(e));
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
    const output = convertLoose(input, {
      loose: {
        verticalPadding: 7,
        siblingDistance: 8,
        singleChildDistance: 5,
        multiChildDistance: 10,
      },
      tightSplit: {} as any,
    });
    const expected = [
      {
        id: undefined,
        offset: [3, 7],
        size: [30, 49],
      },
      {
        id: "parent",
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
    const output = convertLoose(input, {
      loose: {
        verticalPadding: 7,
        siblingDistance: 8,
        singleChildDistance: 5,
        multiChildDistance: 10,
      },
      tightSplit: {} as any,
    });
    const expected = [
      {
        id: undefined,
        offset: [3, 7],
        size: [85, 49],
      },
      {
        id: "parent",
        offset: [3, 14],
        size: [30, 35],
      },
      {
        id: "child",
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
      const output = convertLoose(input, {
        loose: {
          verticalPadding: 7,
          siblingDistance: 8,
          singleChildDistance: 5,
          multiChildDistance: 10,
        },
        tightSplit: {} as any,
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
      expect(output.rects.filter(e => e.id === undefined).length).toBe(1);
    });

    test("typical layout", () => {
      const { output, solver } = setup();
      const expected = [
        // bounding rect
        {
          id: undefined,
          offset: [3, 7],
          size: [95, 75],
        },
        // parent
        {
          id: "parent",
          offset: [3, 27],
          size: [30, 35],
        },
        // children
        {
          id: 0,
          offset: [43, 14],
          size: [50, 10],
        },
        {
          id: 1,
          offset: [43, 32],
          size: [30, 20],
        },
        {
          id: 2,
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
