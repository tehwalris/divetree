import { NodeKind, Split, LooseNode } from "divetree-core";

export const trees: LooseNode[] = [];
export const focuses = ["for", "if", "and", "and-part-2"];

trees.push({
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for",
    size: [200, 50],
  },
  children: [],
});

trees.push({
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for",
    size: [150, 50],
  },
  children: [
    {
      kind: NodeKind.Loose,
      id: "if-loose",
      parent: {
        kind: NodeKind.TightLeaf,
        id: "if",
        size: [50, 50],
      },
      children: [],
    },
  ],
});

trees.push({
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for",
    size: [150, 50],
  },
  children: [
    {
      kind: NodeKind.Loose,
      id: "if-loose",
      parent: {
        kind: NodeKind.TightLeaf,
        id: "if",
        size: [50, 50],
      },
      children: [
        {
          kind: NodeKind.Loose,
          id: "fizzbuzz-loose",
          parent: {
            kind: NodeKind.TightSplit,
            split: Split.SideBySide,
            children: [
              {
                kind: NodeKind.TightLeaf,
                id: "and",
                size: [50, 50],
              },
              {
                kind: NodeKind.TightSplit,
                split: Split.Stacked,
                children: [
                  {
                    kind: NodeKind.TightLeaf,
                    id: "and-part-1",
                    size: [110, 25],
                  },
                  {
                    kind: NodeKind.TightLeaf,
                    id: "and-part-2",
                    size: [110, 25],
                  },
                ],
              },
            ],
          },
          children: [],
        },
        ...[0, 1, 2].map(
          (i: number): LooseNode => ({
            kind: NodeKind.Loose,
            id: `${i}-loose`,
            parent: {
              kind: NodeKind.TightLeaf,
              id: `condition-${i}`,
              size: [160, 50],
            },
            children: [],
          }),
        ),
      ],
    },
  ],
});

trees.push({
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for",
    size: [150, 50],
  },
  children: [
    {
      kind: NodeKind.Loose,
      id: "if-loose",
      parent: {
        kind: NodeKind.TightLeaf,
        id: "if",
        size: [50, 50],
      },
      children: [
        {
          kind: NodeKind.Loose,
          id: "fizzbuzz-loose",
          parent: {
            kind: NodeKind.TightLeaf,
            id: "and",
            size: [50, 50],
          },
          children: [
            {
              kind: NodeKind.TightLeaf,
              id: "and-part-1",
              size: [180, 50],
            },
            {
              kind: NodeKind.TightLeaf,
              id: "and-part-2",
              size: [180, 50],
            },
          ],
        },
        ...[0, 1, 2].map(
          (i: number): LooseNode => ({
            kind: NodeKind.Loose,
            id: `${i}-loose`,
            parent: {
              kind: NodeKind.TightLeaf,
              id: `condition-${i}`,
              size: [160, 50],
            },
            children: [
              {
                kind: NodeKind.TightLeaf,
                id: `print-${i}`,
                size: [150, 50],
              },
            ],
          }),
        ),
      ],
    },
  ],
});

trees.push({
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for",
    size: [150, 50],
  },
  children: [
    {
      kind: NodeKind.Loose,
      id: "if-loose",
      parent: {
        kind: NodeKind.TightLeaf,
        id: "if",
        size: [50, 50],
      },
      children: [
        {
          kind: NodeKind.Loose,
          id: "fizzbuzz-loose",
          parent: {
            kind: NodeKind.TightLeaf,
            id: "and",
            size: [50, 50],
          },
          children: [
            {
              kind: NodeKind.TightLeaf,
              id: "and-part-1",
              size: [180, 50],
            },
            {
              kind: NodeKind.TightLeaf,
              id: "and-part-2",
              size: [180, 50],
            },
          ],
        },
        ...[0, 1, 2, 3].map(
          (i: number): LooseNode => ({
            kind: NodeKind.Loose,
            id: `${i}-loose`,
            parent: {
              kind: NodeKind.TightLeaf,
              id: `condition-${i}`,
              size: [160, 50],
            },
            children: [
              {
                kind: NodeKind.TightLeaf,
                id: `print-${i}`,
                size: [150, 50],
              },
            ],
          }),
        ),
      ],
    },
  ],
});
