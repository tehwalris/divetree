import * as React from "react";
import { Node as DivetreeNode } from "divetree-core";
import { FocusedTree } from "divetree-demo/src/focused-tree";
import * as R from "ramda";
import { GetContent } from "divetree-demo/src/rects";

export interface NavNode {
  id: string;
  children: NavNode[];
}

interface PassedDownConnections {
  parent?: NavIndexNode;
  previousSibling?: NavIndexNode;
  nextSibling?: NavIndexNode;
}

interface NavIndexNode extends PassedDownConnections {
  original: NavNode;
  preferredChild?: NavIndexNode;
}

interface NavIndex {
  root: NavIndexNode;
  nodesById: Map<string, NavIndexNode>;
}

interface Props {
  navTree: NavNode;
  getDisplayTree: (focusPath: string[]) => DivetreeNode;
  getContent: GetContent;
  onKeyDown: (key: string, focusedId: string) => void;
}

interface State {
  focusPath: string[];
}

export default class NavTree extends React.Component<Props, State> {
  state: State = { focusPath: [] };

  componentWillMount() {
    document.addEventListener("keydown", this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.onKeyDown);
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
      default: {
        const currentNavNode = atPath(focusPath, this.props.navTree);
        if (currentNavNode) {
          this.props.onKeyDown(e.key, currentNavNode.id);
        }
      }
    }
  };

  render() {
    const { getDisplayTree, navTree, getContent } = this.props;
    const { focusPath } = this.state;
    const focusedId = focusPath.length
      ? focusPath[focusPath.length - 1]
      : navTree.id;

    // TODO use this for actual nav
    console.log(buildNavIndex(navTree));

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

function buildNavIndex(navTree: NavNode): NavIndex {
  const nodesById = new Map<string, NavIndexNode>();
  return {
    root: _buildNavIndex({ original: navTree }, nodesById),
    nodesById,
  };
}

function _buildNavIndex(
  node: NavIndexNode,
  nodesById: Map<string, NavIndexNode>,
): NavIndexNode {
  nodesById.set(node.original.id, node);
  const children: NavIndexNode[] = node.original.children.map(c => ({
    original: c,
    parent: node,
  }));
  children.forEach((c, i) => {
    c.previousSibling = children[i - 1];
    c.nextSibling = children[i + 1];
    _buildNavIndex(c, nodesById);
  });
  node.preferredChild = children[0];
  return node;
}
