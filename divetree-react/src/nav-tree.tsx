import * as React from "react";
import { useState, useEffect, useRef } from "react";
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
  focusedId: string;
  onFocusedIdChange: (id: string) => void;
  onKeyDown?: (key: string, focusedId: string) => void;
}

export const NavTree: React.FC<Props> = ({
  navTree,
  getDisplayTree,
  getContent,
  focusedId,
  onFocusedIdChange,
  onKeyDown,
}) => {
  const lastVisitedChildren = useRef(new Map<string, string>());

  const navIndex = buildNavIndex(navTree, lastVisitedChildren.current);
  const focusedNavNode =
    (focusedId && navIndex.nodesById.get(focusedId)) || navIndex.root;
  const setFocus = (target: NavIndexNode | undefined) => {
    if (target && target.parent) {
      lastVisitedChildren.current.set(
        target.parent.original.id,
        target.original.id,
      );
    }
    onFocusedIdChange((target || focusedNavNode).original.id);
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
          if (onKeyDown) {
            onKeyDown(e.key, focusedNavNode.original.id);
          }
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

function buildNavIndex(
  navTree: NavNode,
  lastVisitedChildren: Map<string, string>,
): NavIndex {
  const nodesById = new Map<string, NavIndexNode>();
  return {
    root: _buildNavIndex({ original: navTree }, nodesById, lastVisitedChildren),
    nodesById,
  };
}

function _buildNavIndex(
  node: NavIndexNode,
  nodesById: Map<string, NavIndexNode>,
  lastVisitedChildren: Map<string, string>,
): NavIndexNode {
  nodesById.set(node.original.id, node);
  const children: NavIndexNode[] = node.original.children.map(c => ({
    original: c,
    parent: node,
  }));
  children.forEach((c, i) => {
    c.previousSibling = children[i - 1];
    c.nextSibling = children[i + 1];
    _buildNavIndex(c, nodesById, lastVisitedChildren);
  });
  node.preferredChild =
    children.find(
      c => c.original.id === lastVisitedChildren.get(node.original.id),
    ) || children[0];
  return node;
}
