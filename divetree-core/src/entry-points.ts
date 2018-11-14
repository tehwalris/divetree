import { Node, NodeKind, TightNode, TightSplitNode } from "./interfaces/input";
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
  return [..._doLayout(root).values()];
}

export function doLayoutAnimated(
  before: Node,
  after: Node,
  config: Config,
): Interpolator {
  const beforeRects = _doLayout(before);
  const afterRects = _doLayout(after);
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
}

function _doLayoutOld(root: Node, config: Config): PublicOutputNode[] {
  const converted = convertAny(root, config);
  const solver = new kiwi.Solver();
  converted.constraints.forEach(e => solver.addConstraint(e));
  [0, 0].forEach((v, i) => {
    const variable = converted.boundingRect.intervals[i].start;
    solver.addEditVariable(variable, kiwi.Strength.strong);
    solver.suggestValue(variable, v);
  });
  solver.updateVariables();
  return converted.rects.map(e => e.build()).filter(isPublicOutputNode);
}

/*
TODO:
  - layout TightSplitNode the old way 
  - convert full tree to "traditional"
    - d3-hirarchy format
    - no node kinds
    - layouted TightSplits
  - layout TightSplitNode a custom faster way
*/
function _doLayout(root: Node): Map<Id, PublicOutputNode> {
  const rotateBefore = R.reverse;
  const rotateAfter = R.reverse;

  const layout = flextree({
    nodeSize: (e: D3HierarchyNode) => {
      if (e.data.kind === NodeKind.TightLeaf) {
        return rotateBefore(e.data.size);
      }
      if (
        e.data.kind === NodeKind.Loose &&
        e.data.parent.kind === NodeKind.TightLeaf
      ) {
        return rotateBefore(e.data.parent.size);
      }

      // console.error("unsupported node", e);
      // throw new Error(`unsupported node ${e.data.kind}`);
      return [50, 50];
    },
    children: (e: Node) => {
      if (e.kind === NodeKind.Loose) {
        return e.children;
      }
      return [];
    },
  });

  const out = new Map<Id, PublicOutputNode>();
  const visitTightDeep = (
    offset: number[],
    splitRoot: TightSplitNode,
  ): void => {
    const config = {
      // TODO none of these options are relevant any more
      loose: {
        singleChildDistance: 0,
        multiChildDistance: 0,
        siblingDistance: 0,
        verticalPadding: 0,
      },
    };
    _doLayoutOld(splitRoot, config).forEach(e => {
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
          e.extents.right - e.extents.left,
          e.extents.bottom - e.extents.top,
        ]), // TODO this might not be correct
        offset: rotateAfter([e.x, e.y]), // TODO is this the correct offset for the container?
      });
      if (e.data.parent.kind === NodeKind.TightLeaf) {
        out.set(e.data.parent.id, {
          id: e.data.parent.id,
          visible: true,
          size: rotateAfter(e.size),
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
