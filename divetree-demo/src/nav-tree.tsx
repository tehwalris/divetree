import * as React from "react";
import { Node as DivetreeNode } from "divetree-core";
import { FocusedTree } from "divetree-demo/src/focused-tree";

export interface NavNode {
  id: string;
  children: NavNode[];
}

interface Props {
  navTree: NavNode;
  getDisplayTree: (focusPath: string[]) => DivetreeNode;
}

interface State {
  focusPath: string[];
}

export default class NavTree extends React.Component<Props, State> {
  state: State = { focusPath: [] };

  componentWillMount() {
    document.addEventListener("keydown", this.onKeyDown);
    this.setState({ focusPath: [this.props.navTree.id] });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const { focusPath } = this.state;
    const currentNavNode = atPath(focusPath, this.props.navTree);
    switch (e.key) {
      case "ArrowLeft": {
        console.log("left"); // TODO
        break;
      }
      case "ArrowRight": {
        const target = currentNavNode && currentNavNode.children[0];
        if (target) {
          this.setState({ focusPath: [...focusPath, target.id] });
        }
        break;
      }
      default:
        break;
    }
  };

  render() {
    const { focusPath } = this.state;
    const { getDisplayTree, navTree } = this.props;
    return (
      <FocusedTree
        tree={getDisplayTree([navTree.id, ...focusPath])}
        focusedId={focusPath[focusPath.length - 1]}
      />
    );
  }
}

function atPath(path: string[], start: NavNode): NavNode | undefined {
  return path.reduce(
    (a, c) => a && a.children.find(child => child.id === c),
    start,
  );
}
