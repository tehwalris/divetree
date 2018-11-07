import { Node, LooseNode, NodeKind } from "./interfaces/input";
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

interface D3Node {
  data: LooseNode;
  children: D3Node[];
}

interface LayoutedD3Node extends D3Node {
  x: number;
  y: number;
  children: LayoutedD3Node[];
}

function toD3Tree(node: Node): D3Node | undefined {
  switch (node.kind) {
    case NodeKind.Loose: {
      return {
        data: node,
        children: node.children.map(toD3Tree).filter(e => e) as D3Node[],
      };
    }
    default: {
      return undefined;
    }
  }
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
  const layout = flextree({
    nodeSize: () => [100, 30],
  });
  const out = new Map<Id, PublicOutputNode>();
  const visitDeep = (e: LayoutedD3Node) => {
    out.set(e.data.id, {
      id: e.data.id,
      visible: true,
      size: [100, 30], // TODO correct size
      offset: [e.x, e.y], // TODO is this correct for the container node?
    });
    if (e.data.parent.kind === NodeKind.TightSplit) {
      // TODO throw new Error("tight split not supported");
      const id = e.data.id + "-tight-split-parent";
      out.set(id, {
        id,
        visible: true,
        size: [100, 30],
        offset: [e.x, e.y],
      });
    } else {
      out.set(e.data.parent.id, {
        id: e.data.parent.id,
        visible: true,
        size: e.data.parent.size,
        offset: [e.x, e.y],
      });
    }
    e.children.forEach(visitDeep);
  };
  visitDeep(layout(toD3Tree(root)));
  return out;
}
