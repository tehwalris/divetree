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

function treeToIds(root: Node): Id[] {
  const ids: Id[] = [];
  crawl(
    root,
    (e, context) => {
      if (e.kind === NodeKind.TightLeaf || e.kind === NodeKind.Loose) {
        ids.push(e.id);
      }
    },
    { getChildren },
  );
  return ids;
}

export function planAnimation(before: Node, after: Node): AnimationGroup[] {
  const animationGroups: AnimationGroup[] = [];
  const commonIds = new Set(
    R.intersection(treeToIds(before), treeToIds(after)),
  );
  return animationGroups;
}

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
