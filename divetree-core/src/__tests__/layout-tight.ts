import { sortBy } from "lodash";
import { NodeKind, Split } from "../interfaces/input";
import { PublicOutputNode } from "../interfaces/output";
import { PureTightNode } from "../interfaces/working";
import { layoutTight } from "../tight-layout";

describe("layoutTight", () => {
  interface Case {
    label: string;
    node: PureTightNode;
    layout: PublicOutputNode[];
    size: number[];
  }

  const cases: Case[] = [
    {
      label: "only leaf",
      node: { kind: NodeKind.TightLeaf, id: "a", size: [40, 30] },
      layout: [{ id: "a", visible: true, size: [40, 30], offset: [0, 0] }],
      size: [40, 30],
    },
    {
      label: "split with single stacked leaf",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.Stacked,
        children: [{ kind: NodeKind.TightLeaf, id: "a", size: [40, 30] }],
      },
      layout: [{ id: "a", visible: true, size: [40, 30], offset: [0, 0] }],
      size: [40, 30],
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
      layout: [
        { id: "a", visible: true, size: [40, 30], offset: [0, 0] },
        { id: "b", visible: true, size: [40, 30], offset: [0, 30] },
      ],
      size: [40, 60],
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
      layout: [
        { id: "a", visible: true, size: [45, 20], offset: [0, 0] },
        { id: "b", visible: true, size: [45, 25], offset: [0, 20] },
      ],
      size: [45, 45],
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
      layout: [
        { id: "a", visible: true, size: [30, 105], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 50], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 55], offset: [30, 50] },
      ],
      size: [75, 105],
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
      layout: [
        { id: "a", visible: true, size: [30, 45], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 20], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 25], offset: [30, 20] },
      ],
      size: [75, 45],
    },
    {
      label:
        "stacked split inside side-by-side split with unequal sizes (growLast = true)",
      node: {
        kind: NodeKind.TightSplit,
        split: Split.SideBySide,
        children: [
          { kind: NodeKind.TightLeaf, id: "a", size: [30, 105] },
          {
            kind: NodeKind.TightSplit,
            split: Split.Stacked,
            growLast: true,
            children: [
              { kind: NodeKind.TightLeaf, id: "b-a", size: [45, 20] },
              { kind: NodeKind.TightLeaf, id: "b-b", size: [40, 25] },
            ],
          },
        ],
      },
      layout: [
        { id: "a", visible: true, size: [30, 105], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 20], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 85], offset: [30, 20] },
      ],
      size: [75, 105],
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
      layout: [
        { id: "a", visible: true, size: [30, 100], offset: [0, 0] },
        { id: "b-a", visible: true, size: [45, 47], offset: [30, 0] },
        { id: "b-b", visible: true, size: [45, 53], offset: [30, 47] },
      ],
      size: [75, 100],
    },
  ];

  for (const c of cases) {
    test(c.label, () => {
      const actual = layoutTight(c.node);
      expect(sortBy(actual.layout, (e) => e.id)).toEqual(
        sortBy(c.layout, (e) => e.id),
      );
      expect(actual.size).toEqual(c.size);
    });
  }
});
