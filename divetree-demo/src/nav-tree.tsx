import * as React from "react";
import { Node as DivetreeNode } from "divetree-core";
import { FocusedTree } from "divetree-demo/src/focused-tree";
import * as R from "ramda";
import { GetContent } from "divetree-demo/src/rects";

export interface NavNode {
  id: string;
  children: NavNode[];
}

interface Props {
  navTree: NavNode;
  getDisplayTree: (focusPath: string[]) => DivetreeNode;
  getContent: GetContent;
}

interface State {
  focusPath: string[];
}

export default class NavTree extends React.Component<Props, State> {
  state: State = { focusPath: [] };

  componentWillMount() {
    document.addEventListener("keydown", this.onKeyDown);
    this.setState({});
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const { focusPath } = this.state;
    switch (e.key) {
      case "ArrowLeft": {
        this.setState({ focusPath: R.dropLast(1, focusPath) });
        break;
      }
      case "ArrowRight": {
        const currentNavNode = atPath(focusPath, this.props.navTree);
        const target = currentNavNode && currentNavNode.children[0];
        if (target) {
          this.setState({ focusPath: [...focusPath, target.id] });
        }
        break;
      }
      case "ArrowUp":
      case "ArrowDown": {
        const parentPath = R.dropLast(1, focusPath);
        const currentNavParent = atPath(parentPath, this.props.navTree);
        if (!currentNavParent) {
          break;
        }
        const currentIndex = currentNavParent.children.findIndex(
          c => c.id === R.last(focusPath),
        );
        const target =
          currentNavParent.children[
            currentIndex + (e.key === "ArrowUp" ? -1 : 1)
          ];
        if (target) {
          this.setState({ focusPath: [...parentPath, target.id] });
        }
        break;
      }
      default:
        break;
    }
  };

  render() {
    const { getDisplayTree, navTree, getContent } = this.props;
    const { focusPath } = this.state;
    const focusedId = focusPath.length
      ? focusPath[focusPath.length - 1]
      : navTree.id;
    return (
      <FocusedTree
        tree={getDisplayTree([navTree.id, ...focusPath])}
        focusedId={focusedId}
        getContent={getContent}
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
