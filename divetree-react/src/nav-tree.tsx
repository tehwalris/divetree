import {
  Id,
  NavIndex,
  NavIndexNode,
  NavNode,
  RootNode as DivetreeNode,
} from "divetree-core";
import * as React from "react";
import { useEffect, useRef } from "react";
import { FocusedTree } from "./focused-tree";
import { GetContent, GetStyle } from "./rects";

interface Props {
  navTree: NavNode;
  getDisplayTree: (focusPath: string[]) => DivetreeNode;
  getContent: GetContent;
  getStyle?: GetStyle;
  focusedIdPath: string[];
  onFocusedIdChange: (id: string) => void;
  disableNav?: boolean;
  onKeyDown?: (event: KeyboardEvent, focusedId: string) => boolean | undefined;
  onKeyUp?: (event: KeyboardEvent, focusedId: string) => void;
  onRectClick?: (ev: React.MouseEvent, rectId: Id) => void;
}

export const NavTree: React.FC<Props> = ({
  navTree,
  getDisplayTree,
  getContent,
  getStyle,
  focusedIdPath: _focusedIdPath,
  onFocusedIdChange,
  disableNav,
  onKeyDown,
  onKeyUp,
  onRectClick,
}) => {
  // TODO The will currently keep growing with no limit
  const lastVisitedChildren = useRef(new Map<string, string>());

  const { focusedIdPath, focusedNavNode } = buildValidNavIndex(
    navTree,
    lastVisitedChildren.current,
    _focusedIdPath,
  );

  const updateLastVisitedChildrenFromVisit = (
    target: NavIndexNode | undefined,
  ) => {
    if (target && target.parent) {
      lastVisitedChildren.current.set(
        target.parent.original.id,
        target.original.id,
      );
    }
  };
  const setFocus = (target: NavIndexNode | undefined) => {
    updateLastVisitedChildrenFromVisit(target);
    onFocusedIdChange((target || focusedNavNode).original.id);
  };
  useEffect(() => {
    updateLastVisitedChildrenFromVisit(focusedNavNode);
  }, [focusedNavNode]);

  useEffect(() => {
    const onKeyDownInner = (e: KeyboardEvent) => {
      let handleNav = !disableNav;
      if (onKeyDown) {
        const continueHandling = onKeyDown(e, focusedNavNode.original.id);
        if (continueHandling === false) {
          handleNav = false;
        }
      }
      if (!handleNav) {
        return;
      }
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
      }
    };
    const onKeyUpInner = (e: KeyboardEvent) => {
      onKeyUp?.(e, focusedNavNode.original.id);
    };
    document.addEventListener("keydown", onKeyDownInner);
    document.addEventListener("keyup", onKeyUpInner);
    return () => {
      document.removeEventListener("keydown", onKeyDownInner);
      document.removeEventListener("keyup", onKeyUpInner);
    };
  });

  return (
    <FocusedTree
      tree={getDisplayTree(focusedIdPath)}
      focusedId={focusedNavNode.original.id}
      getContent={getContent}
      getStyle={getStyle}
      onRectClick={onRectClick}
    />
  );
};

function buildValidNavIndex(
  navTree: NavNode,
  lastVisitedChildren: Map<string, string>,
  focusedIdPath: string[],
): {
  navIndex: NavIndex;
  focusedNavNode: NavIndexNode;
  focusedIdPath: string[];
} {
  const navIndex = buildNavIndexAlongPath(
    navTree,
    lastVisitedChildren,
    focusedIdPath,
  );
  const focusedNavNode = navIndex?.nodesById.get(
    focusedIdPath[focusedIdPath.length - 1],
  );
  if (!navIndex || !focusedNavNode) {
    console.warn("invalid focusedIdPath", focusedIdPath, navTree);
    return buildValidNavIndex(navTree, lastVisitedChildren, [navTree.id]);
  }
  return { navIndex, focusedNavNode, focusedIdPath };
}

function buildNavIndexAlongPath(
  navTree: NavNode,
  lastVisitedChildren: Map<string, string>,
  idPath: string[],
): NavIndex | undefined {
  const nodesById = new Map<string, NavIndexNode>();
  const indexRoot = _buildNavIndexAlongPath(
    { original: navTree },
    nodesById,
    lastVisitedChildren,
    idPath,
    false,
  );
  return (
    indexRoot && {
      root: indexRoot,
      nodesById,
    }
  );
}

function _buildNavIndexAlongPath(
  node: NavIndexNode,
  nodesById: Map<string, NavIndexNode>,
  lastVisitedChildren: Map<string, string>,
  path: string[],
  buildExtraLevel: boolean,
): NavIndexNode | undefined {
  if ((!path.length || node.original.id !== path[0]) && !buildExtraLevel) {
    return undefined;
  }
  nodesById.set(node.original.id, node);
  const children: NavIndexNode[] = node.original.getChildren().map((c) => ({
    original: c,
    parent: node,
  }));
  children.forEach((c, i) => {
    c.previousSibling = children[i - 1];
    c.nextSibling = children[i + 1];
    _buildNavIndexAlongPath(
      c,
      nodesById,
      lastVisitedChildren,
      path.slice(1),
      (path.length === 1 || path.length === 0) && !buildExtraLevel,
    );
  });
  node.preferredChild =
    children.find(
      (c) => c.original.id === lastVisitedChildren.get(node.original.id),
    ) || children[0];
  return node;
}
