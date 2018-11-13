import { Node, LooseNode, NodeKind, TightNode } from "./interfaces/input";
import { PublicOutputNode, InternalOutputNode } from "./interfaces/output";
import { Config } from "./tree-to-constraints";
import { Interpolator, makeInterpolator } from "./interpolate";
import { Id } from "./interfaces/input";
import { planAnimation } from "./plan-animation";
import * as R from "ramda";
import { flextree } from "d3-flextree";

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
    e: TightNode,
  ): never | undefined => {
    if (e.kind === NodeKind.TightLeaf) {
      out.set(e.id, {
        id: e.id,
        visible: true,
        size: e.size,
        offset: offset,
      });
    } else if (e.kind === NodeKind.TightSplit) {
      // TODO adjust passed down offset
      e.children.forEach(c => visitTightDeep(offset, c));
    } else {
      return e;
    }
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
