import * as React from "react";
import { LooseNode } from "divetree-core";
import { trees, focuses } from "./data";
import { FocusedTree } from "./focused-tree";

interface State {
  tree: LooseNode;
  treeIndex: number;
}

export default class HardcodedTree extends React.Component<{}, State> {
  state = { tree: trees[0], treeIndex: 0 };

  componentWillMount() {
    document.addEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        this.switchView(-1);
        break;
      case "ArrowRight":
        this.switchView(1);
        break;
      default:
        break;
    }
  };

  private switchView(delta: number) {
    const nextIndex = this.state.treeIndex + delta;
    if (nextIndex < 0 || nextIndex + 1 >= trees.length) {
      return;
    }
    this.setState({ tree: trees[nextIndex], treeIndex: nextIndex });
  }

  render() {
    return (
      <FocusedTree
        tree={this.state.tree}
        focusedId={focuses[this.state.treeIndex]}
        getContent={() => null}
      />
    );
  }
}
