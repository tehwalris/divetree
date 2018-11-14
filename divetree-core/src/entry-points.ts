import {
  Node,
  NodeKind,
  TightNode,
  TightSplitNode,
  LooseNode,
} from "./interfaces/input";
import {
  PublicOutputNode,
  InternalOutputNode,
  isPublicOutputNode,
} from "./interfaces/output";
import { Config, convertAny, Output } from "./tree-to-constraints";
import { Interpolator, makeInterpolator } from "./interpolate";
import { Id } from "./interfaces/input";
import { planAnimation } from "./plan-animation";
import * as R from "ramda";
import { flextree } from "d3-flextree";
import * as kiwi from "kiwi.js";

export function doLayout(root: Node, config: Config): InternalOutputNode[] {
  return [..._doLayout(root, config).values()];
}

export function doLayoutAnimated(
  before: Node,
  after: Node,
  config: Config,
): Interpolator {
  const beforeRects = _doLayout(before, config);
  const afterRects = _doLayout(after, config);
  const animationGroups = planAnimation(before, after);
  const interpolators = animationGroups.map(e =>
    makeInterpolator(beforeRects, afterRects, e),
  );
  return t => R.chain(e => e(t), interpolators);
}

interface D3HierarchyNode {
  x: number;
  y: number;
  size: number[];
  extents: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  data: Node;
  children: D3HierarchyNode[] | null;
  parent: D3HierarchyNode | null;
}

function _doLayoutOld(root: Node, config: Config): Output {
  const converted = convertAny(root, config);
  const solver = new kiwi.Solver();
  converted.constraints.forEach(e => solver.addConstraint(e));
  [0, 0].forEach((v, i) => {
    const variable = converted.boundingRect.intervals[i].start;
    solver.addEditVariable(variable, kiwi.Strength.strong);
    solver.suggestValue(variable, v);
  });
  solver.updateVariables();
  return converted;
}

function _doLayout(root: Node, config: Config): Map<Id, PublicOutputNode> {
  const rotateBefore = R.reverse;
  const rotateAfter = R.reverse;

  function getChildPadding(node: LooseNode) {
    if (node.children.length === 0) {
      return 0;
    }
    if (node.children.length === 1) {
      return config.loose.singleChildDistance;
    }
    return config.loose.multiChildDistance;
  }

  const layout = flextree({
    nodeSize: (e: D3HierarchyNode): never | number[] => {
      const getSplitSize = (s: TightSplitNode) => {
        return _doLayoutOld(s, config).boundingRect.build().size;
      };

      if (e.data.kind === NodeKind.TightLeaf) {
        return rotateBefore(e.data.size);
      } else if (e.data.kind === NodeKind.Loose) {
        if (e.data.parent.kind === NodeKind.TightLeaf) {
          const size = [...e.data.parent.size];
          size[0] += getChildPadding(e.data);
          return rotateBefore(size);
        } else if (e.data.parent.kind === NodeKind.TightSplit) {
          const size = getSplitSize(e.data.parent);
          size[0] += getChildPadding(e.data);
          return rotateBefore(size);
        } else {
          return e.data.parent;
        }
      } else if (e.data.kind === NodeKind.TightSplit) {
        return rotateBefore(getSplitSize(e.data));
      } else {
        return e.data;
      }
    },
    children: (e: Node) => {
      if (e.kind === NodeKind.Loose) {
        return e.children;
      }
      return [];
    },
    spacing: (a: D3HierarchyNode, b: D3HierarchyNode): number => {
      if (a.parent === b.parent) {
        return config.loose.siblingDistance;
      }
      return config.loose.verticalPadding;
    },
  });

  const out = new Map<Id, PublicOutputNode>();
  const visitTightDeep = (
    offset: number[],
    splitRoot: TightSplitNode,
  ): void => {
    _doLayoutOld(splitRoot, config)
      .rects.map(e => e.build())
      .filter(isPublicOutputNode)
      .forEach(e => {
        out.set(e.id, { ...e, offset: e.offset.map((v, i) => v + offset[i]) });
      });
  };
  const visitDeep = (e: D3HierarchyNode): never | undefined => {
    if (e.data.kind === NodeKind.TightLeaf) {
      out.set(e.data.id, {
        id: e.data.id,
        visible: true,
        size: rotateAfter(e.size),
        offset: rotateAfter([e.x, e.y]),
      });
    } else if (e.data.kind === NodeKind.Loose) {
      out.set(e.data.id, {
        id: e.data.id,
        visible: false,
        size: rotateAfter([
          // TODO `extents` is an expensive getter
          e.extents.right - e.extents.left,
          e.extents.bottom - e.extents.top,
        ]),
        offset: rotateAfter([e.x, e.y]), // TODO is this the correct offset for the container?
      });
      if (e.data.parent.kind === NodeKind.TightLeaf) {
        out.set(e.data.parent.id, {
          id: e.data.parent.id,
          visible: true,
          size: e.data.parent.size,
          offset: rotateAfter([e.x, e.y]),
        });
      } else {
        visitTightDeep(rotateAfter([e.x, e.y]), e.data.parent);
        return;
      }
    } else if (e.data.kind === NodeKind.TightSplit) {
      visitTightDeep(rotateAfter([e.x, e.y]), e.data);
      return;
    } else {
      console.error("unreachable", e);
      return e.data;
    }
    if (e.children) {
      e.children.forEach(visitDeep);
    }
  };

  visitDeep(layout(layout.hierarchy(root)));
  return out;
}
