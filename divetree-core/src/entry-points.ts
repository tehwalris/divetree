import { flextree } from "d3-flextree";
import * as R from "ramda";
import {
  Id,
  RootNode,
  NodeKind,
  PortalNode,
  TightNode,
} from "./interfaces/input";
import { InternalOutputNode, PublicOutputNode } from "./interfaces/output";
import {
  Extents,
  PureTightNode,
  TreeNode,
  WorkingNodeA,
  WorkingNodeB,
  WorkingNodeC,
} from "./interfaces/working";
import { DrawRectInterpolator, makeInterpolators } from "./interpolate";
import { planAnimation } from "./plan-animation";
import { layoutTight } from "./tight-layout";
import { unreachable } from "./unreachable";

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

export function doLayout(
  root: RootNode,
  config: Config,
  layoutCache: LayoutCache,
): InternalOutputNode[] {
  return [..._doLayoutNew(root, config, layoutCache).values()];
}

export function doLayoutAnimated(
  before: RootNode,
  after: RootNode,
  config: Config,
  layoutCache: LayoutCache,
): DrawRectInterpolator[] {
  const beforeRects = _doLayoutNew(before, config, layoutCache);
  const afterRects = _doLayoutNew(after, config, layoutCache);
  const animationGroups = planAnimation(before, after);
  return animationGroups.flatMap((e) =>
    makeInterpolators(beforeRects, afterRects, e),
  );
}

function toWorkingTree(
  config: Config,
  node: RootNode,
  parent: TreeNode<WorkingNodeA> | undefined,
): TreeNode<WorkingNodeA> | undefined {
  switch (node.kind) {
    case NodeKind.TightLeaf:
      if (node.id === undefined) {
        return undefined;
      }
      return {
        size: node.size,
        paddingRight: 0,
        data: node,
        getOutput: (v) => [
          {
            id: node.id!,
            visible: true,
            size: v.size,
            offset: [v.x, v.y],
          },
        ],
        children: [],
        parent,
      };
    case NodeKind.TightSplit:
      const { pureTightNode, withPortalChildren } = layoutPortals(node, config);
      const { layout, size } = layoutTight(pureTightNode);
      return {
        size,
        paddingRight: 0,
        data: node,
        getOutput: (v) =>
          withPortalChildren(
            layout.map((e) => ({
              ...e,
              offset: [e.offset[0] + v.x, e.offset[1] + v.y],
            })),
          ),
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
      const base: TreeNode<WorkingNodeA> = toWorkingTree(
        config,
        node.parent,
        parent,
      ) || {
        size: [0, 0],
        paddingRight: 0,
        data: node.parent,
        getOutput: () => [],
        children: [],
      };
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
      self.children = node.children
        .map((c) => toWorkingTree(config, c, self))
        .filter((v) => v)
        .map((v) => v!);
      return self;
    default:
      return unreachable(node);
  }
}

function layoutPortals(
  node: TightNode,
  config: Config,
): {
  pureTightNode: PureTightNode;
  withPortalChildren: (
    pureTightLayout: PublicOutputNode[],
  ) => PublicOutputNode[];
} {
  const layoutsByPortalId = new Map<Id, Map<Id, PublicOutputNode>>();

  function extentsFromPortalLayout(layout: Map<Id, PublicOutputNode>): Extents {
    return outerExtents(
      [...layout.values()].map((n) => extentsFromSizeOffset(n)),
    );
  }

  function extractPortal(portalNode: PortalNode): PureTightNode {
    const layout = _doLayoutNew(portalNode.child, config, undefined);
    layoutsByPortalId.set(portalNode.id, layout);
    return {
      kind: NodeKind.TightLeaf,
      id: portalNode.id,
      size: sizeOffsetFromExtents(extentsFromPortalLayout(layout)).size,
    };
  }

  function extractAllPortals(node: TightNode | PortalNode): PureTightNode {
    switch (node.kind) {
      case NodeKind.TightLeaf:
        return node;
      case NodeKind.TightSplit:
        return {
          ...node,
          children: node.children.map((c) => extractAllPortals(c)),
        };
      case NodeKind.Portal:
        return extractPortal(node);
      default:
        return unreachable(node);
    }
  }

  return {
    pureTightNode: extractAllPortals(node),
    withPortalChildren: (
      pureTightLayout: PublicOutputNode[],
    ): PublicOutputNode[] => {
      const mergedLayout: PublicOutputNode[] = [];
      for (const pureTightOutputNode of pureTightLayout) {
        const portalLayout = layoutsByPortalId.get(pureTightOutputNode.id);
        if (!portalLayout) {
          mergedLayout.push(pureTightOutputNode);
          continue;
        }
        const portalChildOffset = sizeOffsetFromExtents(
          extentsFromPortalLayout(portalLayout),
        ).offset;
        for (const portalOutputNode of portalLayout.values()) {
          mergedLayout.push({
            ...portalOutputNode,
            offset: portalOutputNode.offset.map(
              (v, i) =>
                v + pureTightOutputNode.offset[i] - portalChildOffset[i],
            ),
          });
        }
      }
      return mergedLayout;
    },
  };
}

function extentsFromSizeOffset({
  size,
  offset,
}: {
  size: number[];
  offset: number[];
}): Extents {
  return {
    top: offset[1],
    right: offset[0] + size[0],
    bottom: offset[1] + size[1],
    left: offset[0],
  };
}

function sizeOffsetFromExtents({ top, right, bottom, left }: Extents): {
  size: number[];
  offset: number[];
} {
  return {
    size: [right - left, bottom - top],
    offset: [left, top],
  };
}

function outerExtents(set: Extents[]): Extents {
  if (!set.length) {
    throw new Error("can not get extents of empty set");
  }
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

export class LayoutCache {
  private config: Config | undefined;
  private resultsByNode = new WeakMap<RootNode, Map<Id, PublicOutputNode>>();

  set(node: RootNode, config: Config, result: Map<Id, PublicOutputNode>) {
    if (this.config && this.config !== config) {
      this.resultsByNode = new WeakMap();
    }
    this.config = config;
    this.resultsByNode.set(node, result);
  }

  get(node: RootNode, config: Config): Map<Id, PublicOutputNode> | undefined {
    if (this.config !== config) {
      return undefined;
    }
    return this.resultsByNode.get(node);
  }
}

function _doLayoutNew(
  root: RootNode,
  config: Config,
  layoutCache: LayoutCache | undefined,
): Map<Id, PublicOutputNode> {
  const cachedOut = layoutCache?.get(root, config);
  if (cachedOut) {
    return cachedOut;
  }

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
  if (!treeA) {
    return new Map();
  }
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
  layoutCache?.set(root, config, out);
  return out;
}
