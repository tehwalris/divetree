import * as React from "react";
import { convertAny, NodeKind } from "divetree-core";

const output = convertAny(
  {
    kind: NodeKind.TightLeaf,
    id: 123,
    size: [50, 10],
  },
  {
    loose: {
      verticalPadding: 7,
      siblingDistance: 8,
      singleChildDistance: 5,
      multiChildDistance: 10,
    },
  },
);

console.log(output);

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
