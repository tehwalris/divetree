import { Node } from "./interfaces/input";
import {
  PublicOutputNode,
  isPublicOutputNode,
  InternalOutputNode,
} from "./interfaces/output";
import { convertAny, Config, Output } from "./tree-to-constraints";
import * as kiwi from "kiwi.js";
import { Interpolator, makeInterpolator } from "./interpolate";
import { Id } from "./interfaces/input";
import { planAnimation } from "./plan-animation";
import * as R from "ramda";

export function doLayout(root: Node, config: Config): InternalOutputNode[] {
  return _doLayout(root, config)
    .rects.map(e => e.build())
    .filter(isPublicOutputNode);
}

export function doLayoutAnimated(
  before: Node,
  after: Node,
  config: Config,
): Interpolator {
  const beforeRects = _doLayout(before, config).rects;
  const afterRects = _doLayout(after, config).rects;
  const beforeRectMap = new Map<Id, PublicOutputNode>();
  beforeRects.forEach(e => {
    const built = e.build();
    if (isPublicOutputNode(built)) {
      beforeRectMap.set(built.id, built);
    }
  });
  const afterRectMap = new Map<Id, PublicOutputNode>();
  afterRects.forEach(e => {
    const built = e.build();
    if (isPublicOutputNode(built)) {
      afterRectMap.set(built.id, built);
    }
  });
  const animationGroups = planAnimation(before, after);
  const interpolators = animationGroups.map(e =>
    makeInterpolator(beforeRectMap, afterRectMap, e),
  );
  return t => R.chain(e => e(t), interpolators);
}

function _doLayout(root: Node, config: Config): Output {
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
