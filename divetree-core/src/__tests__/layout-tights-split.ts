import { TightNode, NodeKind, Split } from "../interfaces/input";
import { PublicOutputNode } from "../interfaces/output";
import { layoutTightSplit } from "../tight-layout";
import { sortBy } from "lodash";

describe("layoutTightSplit", () => {
  interface Case {
    label: string;
    node: TightNode;
    output: PublicOutputNode[];
  }

  const cases: Case[] = [
    {
      label: "only leaf",
      node: { kind: NodeKind.TightLeaf, id: "a", size: [40, 30] },
      output: [{ id: "a", visible: true, size: [40, 30], offset: [0, 0] }],
    },
    {
      label: "split with single stacked leaf",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.Stacked,
        children: [{ kind: NodeKind.TightLeaf, id: "a", size: [40, 30] }],
      },
      output: [{ id: "a", visible: true, size: [40, 30], offset: [0, 0] }],
    },
    {
      label: "split with two stacked leaves of equal size",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.Stacked,
        children: [
          { kind: NodeKind.TightLeaf, id: "a", size: [40, 30] },
          { kind: NodeKind.TightLeaf, id: "b", size: [40, 30] },
        ],
      },
      output: [
        { id: "a", visible: true, size: [40, 30], offset: [0, 0] },
        { id: "b", visible: true, size: [40, 30], offset: [0, 30] },
      ],
    },
    {
      label: "split with two stacked leaves of unequal size",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.Stacked,
        children: [
          { kind: NodeKind.TightLeaf, id: "a", size: [45, 20] },
          { kind: NodeKind.TightLeaf, id: "b", size: [40, 25] },
        ],
      },
      output: [
        { id: "a", visible: true, size: [45, 20], offset: [0, 0] },
        { id: "b", visible: true, size: [45, 25], offset: [0, 20] },
      ],
    },
    {
      label:
        "stacked split inside side-by-side split with unequal sizes (stack is stretched)",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.SideBySide,
        children: [
          { kind: NodeKind.TightLeaf, id: "a", size: [30, 105] },
          {
            kind: NodeKind.TightSplit,
            split: Split.Stacked,
            children: [
              { kind: NodeKind.TightLeaf, id: "b-a", size: [45, 20] },
              { kind: NodeKind.TightLeaf, id: "b-b", size: [40, 25] },
            ],
          },
        ],
      },
      output: [
        { id: "a", visible: true, size: [30, 105], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 50], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 55], offset: [30, 50] },
      ],
    },
    {
      label:
        "stacked split inside side-by-side split with unequal sizes (stack is not stretched)",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.SideBySide,
        children: [
          { kind: NodeKind.TightLeaf, id: "a", size: [30, 40] },
          {
            kind: NodeKind.TightSplit,
            split: Split.Stacked,
            children: [
              { kind: NodeKind.TightLeaf, id: "b-a", size: [45, 20] },
              { kind: NodeKind.TightLeaf, id: "b-b", size: [40, 25] },
            ],
          },
        ],
      },
      output: [
        { id: "a", visible: true, size: [30, 45], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 20], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 25], offset: [30, 20] },
      ],
    },
    {
      label: "non-integer sizes when stretching split",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.SideBySide,
        children: [
          { kind: NodeKind.TightLeaf, id: "a", size: [30, 100] },
          {
            kind: NodeKind.TightSplit,
            split: Split.Stacked,
            children: [
              { kind: NodeKind.TightLeaf, id: "b-a", size: [45, 20] },
              { kind: NodeKind.TightLeaf, id: "b-b", size: [40, 25] },
            ],
          },
        ],
      },
      output: [
        { id: "a", visible: true, size: [30, 100], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 47], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 53], offset: [30, 47] },
      ],
    },
  ];

  for (const c of cases) {
    test(c.label, () => {
      const actual = sortBy(layoutTightSplit(c.node), e => e.id);
      const expected = sortBy(c.output, e => e.id);
      expect(actual).toEqual(expected);
    });
  }
});
