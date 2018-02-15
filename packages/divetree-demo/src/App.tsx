import * as React from "react";
import { doLayoutAnimated, NodeKind, Split, LooseNode } from "divetree-core";

const beforeTree: LooseNode = {
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for i in 1...100",
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
          children: [
            {
              kind: NodeKind.TightLeaf,
              id: "print-fizzbuzz",
              size: [180, 50],
            },
          ],
        },
        ...[0, 1, 2].map((i: number): LooseNode => ({
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
        })),
      ],
    },
  ],
};

const afterTree: LooseNode = {
  kind: NodeKind.Loose,
  id: "root",
  parent: {
    kind: NodeKind.TightLeaf,
    id: "for i in 1...100",
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
          children: [
            {
              kind: NodeKind.TightLeaf,
              id: "print-fizzbuzz",
              size: [180, 50],
            },
          ],
        },
        ...[0, 2, 3].map((i: number): LooseNode => ({
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
        })),
      ],
    },
  ],
};

const layoutConfig = {
  loose: {
    verticalPadding: 0,
    siblingDistance: 20,
    singleChildDistance: 20,
    multiChildDistance: 40,
  },
  tightSplit: {
    equalSize: false,
  },
};

const output = doLayoutAnimated(beforeTree, afterTree, layoutConfig);

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    position: "relative",
  },
  rect: {
    position: "absolute",
    border: "1px solid black",
    boxSizing: "border-box",
  },
};

class App extends React.Component {
  render() {
    return (
      <div style={styles.wrapper}>
        {output(0.75).map(e => (
          <div
            key={e.id}
            style={{
              ...styles.rect,
              top: e.offset[1],
              left: e.offset[0],
              width: e.size[0],
              height: e.size[1],
            }}
          />
        ))}
      </div>
    );
  }
}

export default App;
