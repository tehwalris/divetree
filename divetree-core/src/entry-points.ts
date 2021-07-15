import { flextree } from "d3-flextree";
import * as R from "ramda";
import { Id, Node, NodeKind } from "./interfaces/input";
import { InternalOutputNode, PublicOutputNode } from "./interfaces/output";
import {
  Extents,
  TreeNode,
  WorkingNodeA,
  WorkingNodeB,
  WorkingNodeC,
} from "./interfaces/working";
import { Interpolator, makeInterpolator } from "./interpolate";
import { planAnimation } from "./plan-animation";
import { layoutTight } from "./tight-layout";

export interface Config {
  // TODO some of these might not be used any more

  loose: {
    // distances from parent to children
    singleChildDistance: number; // if only one child
    multiChildDistance: number; // if more than one child

    siblingDistance: number; // vertical between children

    verticalPadding: number; // between bounding box and parent/children
  };
}

export function doLayout(root: Node, config: Config): InternalOutputNode[] {
  return [..._doLayoutNew(root, config).values()];
}

export function doLayoutAnimated(
  before: Node,
  after: Node,
  config: Config,
): Interpolator {
  const beforeRects = _doLayoutNew(before, config);
  const afterRects = _doLayoutNew(after, config);
  const animationGroups = planAnimation(before, after);
  const interpolators = animationGroups.map((e) =>
    makeInterpolator(beforeRects, afterRects, e),
  );
  return (t) => R.chain((e) => e(t), interpolators);
}

function toWorkingTree(
  config: Config,
  node: Node,
  parent: TreeNode<WorkingNodeA> | undefined,
): TreeNode<WorkingNodeA> {
  switch (node.kind) {
    case NodeKind.TightLeaf:
      return {
        size: node.size,
        paddingRight: 0,
        data: node,
        getOutput: (v) => [
          {
            id: node.id,
            visible: true,
            size: v.size,
            offset: [v.x, v.y],
          },
        ],
        children: [],
        parent,
      };
    case NodeKind.TightSplit:
      const { layout, size } = layoutTight(node);
      return {
        size,
        paddingRight: 0,
        data: node,
        getOutput: (v) =>
          layout.map((e) => ({
            ...e,
            offset: [e.offset[0] + v.x, e.offset[1] + v.y],
          })),
        children: [],
        parent,
      };
    case NodeKind.Loose:
      let paddingRight = 0;
      if (node.children.length === 1) {
        paddingRight = config.loose.singleChildDistance;
      } else if (node.children.length > 1) {
        paddingRight = config.loose.multiChildDistance;
      }
      const base = toWorkingTree(config, node.parent, parent);
      const self: TreeNode<WorkingNodeA> = {
        ...base,
        paddingRight,
        getOutput: (v) => [
          ...base.getOutput(v),
          {
            id: node.id,
            visible: true,
            size: v.outerSize,
            offset: [v.x, v.y],
          },
        ],
      };
      if (self.children.length) {
        throw new Error("unexpected children created by LooseNode.parent");
      }
      self.children = node.children.map((c) => toWorkingTree(config, c, self));
      return self;
    default:
      return unreachable(node);
  }
}

function outerExtents(set: Extents[]): Extents {
  return set.reduce(
    (a, c) => ({
      top: Math.min(a.top, c.top),
      right: Math.max(a.right, c.right),
      bottom: Math.max(a.bottom, c.bottom),
      left: Math.min(a.left, c.left),
    }),
    set[0],
  );
}

function calculateExtents(
  node: TreeNode<WorkingNodeB>,
  parent: TreeNode<WorkingNodeC> | undefined,
): TreeNode<WorkingNodeC> {
  const selfExtents = {
    left: node.x,
    right: node.x + node.size[0],
    top: node.y,
    bottom: node.y + node.size[1],
  };
  const self: TreeNode<WorkingNodeC> = {
    ...node,
    parent,

    // All of the following are placeholders which are set later
    children: [],
    extents: undefined as any,
    outerSize: [],
  };
  self.children = node.children.map((c) => calculateExtents(c, self));
  self.extents = outerExtents([
    selfExtents,
    ...self.children.map((v) => v.extents),
  ]);
  self.outerSize = [
    self.extents.right - self.extents.left,
    self.extents.bottom - self.extents.top,
  ];
  return self;
}

function visitTree<T>(node: TreeNode<T>, cb: (node: T) => void): void {
  cb(node);
  node.children.forEach((c) => visitTree(c, cb));
}

function _doLayoutNew(root: Node, config: Config): Map<Id, PublicOutputNode> {
  const layout = flextree({
    nodeSize: (node: TreeNode<WorkingNodeA>): number[] => node.size,
    spacing: (a: TreeNode<WorkingNodeA>, b: TreeNode<WorkingNodeA>): number => {
      if (a.parent === b.parent) {
        return config.loose.siblingDistance;
      }
      return config.loose.verticalPadding;
    },
  });

  const treeA = toWorkingTree(config, root, undefined);
  visitTree(treeA, (node) => {
    node.size = R.reverse(node.size);
    node.size[1] += node.paddingRight;
  });
  const treeB: TreeNode<WorkingNodeB> = layout(treeA);
  visitTree(treeB, (node) => {
    node.size = R.reverse(node.size);
    node.size[0] -= node.paddingRight;
    const { x, y } = node;
    node.x = y;
    node.y = x - node.size[1] / 2; // HACK I'm not sure why "- node.size[1] / 2" is necessary
  });
  const treeC = calculateExtents(treeB, undefined);

  const out = new Map<Id, PublicOutputNode>();
  visitTree(treeC, (workingNode) => {
    workingNode.getOutput(workingNode).forEach((outputNode) => {
      out.set(outputNode.id, outputNode);
    });
  });
  return out;
}

function unreachable(v: never): never {
  console.error("unreachable", v);
  throw new Error("unreachable");
}
