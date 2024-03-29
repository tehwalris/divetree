import * as R from "ramda";
import * as crawl from "tree-crawl";
import { Id, Node, NodeKind, RootNode } from "./interfaces/input";
import { unreachable } from "./unreachable";

export enum AnimationKind {
  Transform,
  Enter,
  Leave,
}

export type AnimationGroup = TransformGroup | EnterLeaveGroup;

export interface TransformGroup {
  kind: AnimationKind.Transform;
  content: Id[];
}

export interface EnterLeaveGroup {
  kind: AnimationKind.Enter | AnimationKind.Leave;
  parent: Id | undefined;
  content: Id[];
}

interface IdGroup {
  before: Id[];
  after: Id[];
  common: Set<Id>;
}

function getChildren(node: Node): Node[] {
  switch (node.kind) {
    case NodeKind.Loose:
      return [...node.children, node.parent];
    case NodeKind.TightSplit:
      return node.children;
    case NodeKind.TightLeaf:
      return [];
    case NodeKind.Portal:
      return [node.child];
    default:
      return unreachable(node);
  }
}

function indexTreeNodesById(
  root: Node,
  kind: NodeKind.TightLeaf | NodeKind.Loose,
): Map<Id, Node> {
  const out = new Map<Id, Node>();
  crawl(
    root,
    (e, context) => {
      if (e.kind === kind && e.id !== undefined) {
        out.set(e.id, e);
      }
    },
    { getChildren },
  );
  return out;
}

function indexTreeParentsByChildren(root: Node): Map<Node, Node> {
  const out = new Map();
  crawl(
    root,
    (e, context) => {
      if (context.parent) {
        out.set(e, context.parent);
      }
    },
    { getChildren },
  );
  return out;
}

function loadIdGroup(
  beforeRoot: RootNode,
  afterRoot: RootNode,
  kind: NodeKind.TightLeaf | NodeKind.Loose,
): IdGroup {
  const before = indexTreeNodesById(beforeRoot, kind);
  const after = indexTreeNodesById(afterRoot, kind);
  const common = new Set<Id>();
  for (const k of before.keys()) {
    if (after.has(k)) {
      common.add(k);
    }
  }
  return {
    before: [...before.keys()],
    after: [...after.keys()],
    common,
  };
}

export function planAnimation(
  before: RootNode,
  after: RootNode,
): AnimationGroup[] {
  const animationGroups: AnimationGroup[] = [];
  const ids = {
    tight: loadIdGroup(before, after, NodeKind.TightLeaf),
    loose: loadIdGroup(before, after, NodeKind.Loose),
  };

  if (ids.tight.common.size) {
    animationGroups.push({
      kind: AnimationKind.Transform,
      content: [...ids.tight.common],
    });
  }

  [
    {
      kind: AnimationKind.Leave as AnimationKind.Leave,
      tree: before,
      tightIdsOwn: ids.tight.before,
    },
    {
      kind: AnimationKind.Enter as AnimationKind.Enter,
      tree: after,
      tightIdsOwn: ids.tight.after,
    },
  ].forEach(({ tree, kind, tightIdsOwn }) => {
    const parents = indexTreeParentsByChildren(tree);
    const tightById = indexTreeNodesById(tree, NodeKind.TightLeaf);
    const changingByParent = new Map<Id | undefined, Id[]>();

    R.difference(tightIdsOwn, [...ids.tight.common]).forEach((id) => {
      let cur = tightById.get(id);
      while (
        cur &&
        !(cur.kind === NodeKind.Loose && ids.loose.common.has(cur.id))
      ) {
        cur = parents.get(cur);
      }
      const changeParent = cur && cur.id;
      const group = changingByParent.get(changeParent) || [];
      group.push(id);
      changingByParent.set(changeParent, group);
    });

    changingByParent.forEach((content, parent) => {
      animationGroups.push({
        kind,
        parent: parent,
        content: content,
      });
    });
  });

  return animationGroups;
}
