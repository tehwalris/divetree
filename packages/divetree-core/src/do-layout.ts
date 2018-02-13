import { Node } from "./interfaces/input";
import { PublicOutputNode, isPublicOutputNode } from "./interfaces/output";
import { _convertAny, Config } from "./tree-to-constraints";
import * as kiwi from "kiwi.js";

export function doLayout(root: Node, config: Config): PublicOutputNode[] {
  const converted = _convertAny(root, config);
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
