import { PublicOutputNode } from "./interfaces/output";
import { Node, Id, NodeKind } from "./interfaces/input";
import * as crawl from "tree-crawl";
import * as R from "ramda";

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

function getChildren(node: Node): Node[] {
  switch (node.kind) {
    case NodeKind.Loose:
      return [...node.children, node.parent];
    case NodeKind.TightSplit:
      return node.children;
    case NodeKind.TightLeaf:
      return [];
  }
}

function treeToIds(
  root: Node,
  kind: NodeKind.TightLeaf | NodeKind.Loose,
): Id[] {
  const ids: Id[] = [];
  crawl(
    root,
    e => {
      if (e.kind === kind) {
        ids.push(e.id);
      }
    },
    { getChildren },
  );
  return ids;
}

function indexTreeNodesById(
  root: Node,
  kind: NodeKind.TightLeaf | NodeKind.Loose,
): Map<Id, Node> {
  const out = new Map();
  crawl(
    root,
    (e, context) => {
      if (e.kind === kind) {
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

export function planAnimation(before: Node, after: Node): AnimationGroup[] {
  const animationGroups: AnimationGroup[] = [];

  const tightIds = {
    before: treeToIds(before, NodeKind.TightLeaf),
    after: treeToIds(after, NodeKind.TightLeaf),
    common: [] as Id[],
  };
  tightIds.common = R.intersection(tightIds.before, tightIds.after);

  if (tightIds.common.length) {
    animationGroups.push({
      kind: AnimationKind.Transform,
      content: tightIds.common,
    });
  }

  const looseIds = {
    before: treeToIds(before, NodeKind.Loose),
    after: treeToIds(after, NodeKind.Loose),
    common: new Set<Id>(),
  };
  looseIds.common = new Set(R.intersection(looseIds.before, looseIds.after));

  [
    {
      kind: AnimationKind.Leave as AnimationKind.Leave,
      tree: before,
      tightIdsOwn: tightIds.before,
    },
    {
      kind: AnimationKind.Enter as AnimationKind.Enter,
      tree: after,
      tightIdsOwn: tightIds.after,
    },
  ].forEach(({ tree, kind, tightIdsOwn }) => {
    const parents = indexTreeParentsByChildren(tree);
    const tightById = indexTreeNodesById(tree, NodeKind.TightLeaf);
    const changingByParent = new Map<Id | undefined, Id[]>();

    R.difference(tightIdsOwn, tightIds.common).forEach(id => {
      let changeParent: Node | undefined;
      let cur = tightById.get(id);
      while (
        cur &&
        !(cur.kind === NodeKind.Loose && looseIds.common.has(cur.id))
      ) {
        cur = parents.get(cur);
      }
      const parent = cur && cur.id;
      const group = changingByParent.get(parent) || [];
      group.push(id);
      changingByParent.set(parent, group);
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

/*
- iterate before tree
  - everything which isn't common is leaving
  - parent for leaving is closest common (=not leaving) loose node
- iterate after tree
  - everything which isn't common is entering
  - parent for entering is closest common (=not leaving) loose node
*/

/*
- what to do with tight parent node?
  - what if it's a split? handle enter/leave the usual way?
    - actually that's pretty good
- what is entering/leaving?
  - entering/leaving without looking at groups:
    - anything not in commonIds
  - only leaf nodes have ids!
    - but there is a leaf in every loose node, so loose nodes have ids
      - except loose nodes with split parent!
    - give synthetic ids to loose nodes?
      - really complicated for no good reason
    - require ids on loose nodes
      - consequences?
        - nodes inside tight parents will always leave/enter relative to tight bounding box
*/

/*
  - final
    - mark transformed
      - collect all ids in before tree
      - collect all ids in after tree
      - create set with intersection
      - create transform group from set
    - enter/leave
      - track closest loose id (as parent)
      - iterate down tree
      - when cur is entering/leaving, take whole subtree (with cur)
      - parent is parent of subtree
*/
