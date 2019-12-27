import * as React from "react";
import { useState, useEffect } from "react";
import {
  Node as DivetreeNode,
  NavNode,
  NavIndex,
  NavIndexNode,
} from "divetree-core";
import { FocusedTree } from "./focused-tree";
import { GetContent } from "./rects";

interface Props {
  navTree: NavNode;
  getDisplayTree: (focusPath: string[]) => DivetreeNode;
  getContent: GetContent;
  onKeyDown: (key: string, focusedId: string) => void;
}

const NavTree: React.FC<Props> = ({
  navTree,
  getDisplayTree,
  getContent,
  onKeyDown,
}) => {
  const [_focusedNodeId, setFocusedNodeId] = useState<string>();

  const navIndex = buildNavIndex(navTree);
  const focusedNavNode =
    (_focusedNodeId && navIndex.nodesById.get(_focusedNodeId)) || navIndex.root;
  const setFocus = (target: NavIndexNode | undefined) => {
    setFocusedNodeId((target || focusedNavNode).original.id);
  };

  useEffect(() => {
    const onKeyDownInner = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft": {
          setFocus(focusedNavNode.parent);
          break;
        }
        case "ArrowRight": {
          setFocus(focusedNavNode.preferredChild);
          break;
        }
        case "ArrowUp": {
          setFocus(focusedNavNode.previousSibling);
          break;
        }
        case "ArrowDown": {
          setFocus(focusedNavNode.nextSibling);
          break;
        }
        default: {
          onKeyDown(e.key, focusedNavNode.original.id);
          break;
        }
      }
    };
    document.addEventListener("keydown", onKeyDownInner);
    return () => {
      document.removeEventListener("keydown", onKeyDownInner);
    };
  });

  return (
    <FocusedTree
      tree={getDisplayTree(focusPathToNode(focusedNavNode))}
      focusedId={focusedNavNode.original.id}
      getContent={getContent}
    />
  );
};

function focusPathToNode(navNode: NavIndexNode): string[] {
  const path: string[] = [];
  for (let c: NavIndexNode | undefined = navNode; c; c = c.parent) {
    path.push(c.original.id);
  }
  return path.reverse();
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

export default NavTree;
