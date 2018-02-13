import * as React from "react";
import { doLayout, NodeKind, TightNode, Split } from "divetree-core";

const output = doLayout(
  {
    kind: NodeKind.Loose as NodeKind.Loose,
    parent: {
      kind: NodeKind.TightSplit,
      split: Split.Stacked,
      children: [
        {
          kind: NodeKind.TightLeaf,
          id: "parent-top",
          size: [200, 50],
        },
        {
          kind: NodeKind.TightLeaf,
          id: "parent-bottom-1",
          size: [200, 50],
        },
        {
          kind: NodeKind.TightLeaf,
          id: "parent-bottom-2",
          size: [200, 50],
        },
      ],
    },
    children: [[500, 100], [300, 100], [550, 150]].map((e, i) => ({
      kind: NodeKind.TightLeaf,
      id: i,
      size: e,
    })) as TightNode[],
  },
  {
    loose: {
      verticalPadding: 10,
      siblingDistance: 20,
      singleChildDistance: 20,
      multiChildDistance: 40,
    },
  },
);

console.log(output);

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
        {output.map(e => (
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
