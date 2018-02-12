import {
  Id,
  LooseNode,
  TightNode,
  NodeKind,
  TightSplitNode,
  TightLeafNode,
  Split,
} from "./interfaces/input";
import * as kiwi from "kiwi.js";
import { OutputNode } from "./interfaces/output";
import * as R from "ramda";

export class IntervalVar {
  start = new kiwi.Variable();
  end = new kiwi.Variable();

  getWidthExpr(): kiwi.Expression {
    return new kiwi.Expression(this.end, [-1, this.start]);
  }
}

export class RectVar {
  intervals = [new IntervalVar(), new IntervalVar()];

  constructor(public id: Id | undefined) {
    this.id = id;
  }

  setPreferedSize(size: number[]): kiwi.Constraint[] {
    return this.constrainSize(size, kiwi.Operator.Eq, kiwi.Strength.medium);
  }

  setMinSize(size: number[]): kiwi.Constraint[] {
    return this.constrainSize(size, kiwi.Operator.Ge, kiwi.Strength.required);
  }

  private constrainSize(size: number[], op: kiwi.Operator, strength: number) {
    return this.intervals.map((e, i) => {
      const width = e.getWidthExpr();
      return new kiwi.Constraint(width, op, size[i], strength);
    });
  }

  build(): OutputNode | undefined {
    return {
      id: this.id,
      size: this.intervals.map(e => e.end.value() - e.start.value()),
      offset: this.intervals.map(e => e.start.value()),
    };
  }
}

export interface Output {
  constraints: kiwi.Constraint[];
  rects: RectVar[];
  boundingRect: RectVar;
}

export interface Config {
  loose: {
    // distances from parent to children
    singleChildDistance: number; // if only one child
    multiChildDistance: number; // if more than one child

    siblingDistance: number; // vertical between children

    verticalPadding: number; // between bounding box and parent/children
  };
}

export type ConvertAny = (
  node: LooseNode | TightNode,
  config: Config,
) => Output;

function _convertAny(node: LooseNode | TightNode, config: Config): Output {
  switch (node.kind) {
    case NodeKind.Loose:
      return convertLoose(node, config, _convertAny);
    case NodeKind.TightSplit:
      return convertTightSplit(node, config, _convertAny);
    case NodeKind.TightLeaf:
      return convertTightLeaf(node);
  }
}

export function convertLoose(
  node: LooseNode,
  config: Config,
  convertAny: ConvertAny = _convertAny,
): Output {
  const boundingRect = new RectVar(undefined);
  const parent = convertAny(node.parent, config);
  const children = node.children.map(e => convertAny(e, config));
  const constraints = R.chain(e => e.constraints, children);
  constraints.push(...parent.constraints);

  const setVerticalPadding = (
    topEdge: kiwi.Variable,
    bottomEdge: kiwi.Variable,
  ) => {
    [
      { op: kiwi.Operator.Eq, strength: kiwi.Strength.weak },
      { op: kiwi.Operator.Le, strength: kiwi.Strength.medium },
    ].forEach(({ op, strength }) => {
      constraints.push(
        new kiwi.Constraint(
          new kiwi.Expression(topEdge, config.loose.verticalPadding),
          op,
          bottomEdge,
          strength,
        ),
      );
    });
  };

  const centerVertically = (
    topEdge: kiwi.Variable,
    bottomEdge: kiwi.Variable,
  ) => {
    constraints.push(
      new kiwi.Constraint(
        new kiwi.Expression(topEdge, [-1, boundingRect.intervals[1].start]),
        kiwi.Operator.Eq,
        new kiwi.Expression(boundingRect.intervals[1].end, [-1, bottomEdge]),
        kiwi.Strength.weak,
      ),
    );
  };

  // parent touches left side of bounding rect
  constraints.push(
    new kiwi.Constraint(
      parent.boundingRect.intervals[0].start,
      kiwi.Operator.Eq,
      boundingRect.intervals[0].start,
      kiwi.Strength.medium,
    ),
  );

  // center parent vertically
  centerVertically(
    parent.boundingRect.intervals[1].start,
    parent.boundingRect.intervals[1].end,
  );

  // parent / bounding rect padding
  setVerticalPadding(
    boundingRect.intervals[1].start,
    parent.boundingRect.intervals[1].start,
  );
  setVerticalPadding(
    parent.boundingRect.intervals[1].end,
    boundingRect.intervals[1].end,
  );

  if (children.length) {
    // child / bounding rect paddding
    const firstChild = children[0].boundingRect;
    const lastChild = R.last(children)!.boundingRect;
    setVerticalPadding(
      boundingRect.intervals[1].start,
      firstChild.intervals[1].start,
    );
    setVerticalPadding(
      lastChild.intervals[1].end,
      boundingRect.intervals[1].end,
    );
    // center children vertically
    centerVertically(firstChild.intervals[1].start, lastChild.intervals[1].end);
  } else {
    // parent touches right side of bounding rect if no chlidren
    constraints.push(
      new kiwi.Constraint(
        parent.boundingRect.intervals[0].end,
        kiwi.Operator.Eq,
        boundingRect.intervals[0].end,
        kiwi.Strength.medium,
      ),
    );
  }

  // sibling distance
  for (let i = 1; i < children.length; i += 1) {
    const a = children[i - 1].boundingRect;
    const b = children[i].boundingRect;
    constraints.push(
      new kiwi.Constraint(
        new kiwi.Expression(a.intervals[1].end, config.loose.siblingDistance),
        kiwi.Operator.Eq,
        b.intervals[1].start,
        kiwi.Strength.medium,
      ),
    );
  }

  const parentChildDistance =
    children.length === 1
      ? config.loose.singleChildDistance
      : config.loose.multiChildDistance;
  children.forEach(e => {
    constraints.push(
      // sibling parent distance
      new kiwi.Constraint(
        new kiwi.Expression(
          parent.boundingRect.intervals[0].end,
          parentChildDistance,
        ),
        kiwi.Operator.Eq,
        e.boundingRect.intervals[0].start,
        kiwi.Strength.medium,
      ),
      // children inside right side of bounding rect
      new kiwi.Constraint(
        e.boundingRect.intervals[0].end,
        kiwi.Operator.Le,
        boundingRect.intervals[0].end,
      ),
    );
  });

  return {
    constraints,
    boundingRect,
    rects: [
      ...R.chain(e => e.rects, children),
      parent.boundingRect,
      boundingRect,
    ],
  };
}

export function convertTightSplit(
  node: TightSplitNode,
  config: Config,
  convertAny: ConvertAny = _convertAny,
): Output {
  if (!node.children.length) {
    throw new Error("TightSplitNode must have children");
  }
  const [shiftAxis, equalAxis] =
    node.split === Split.SideBySide ? [0, 1] : [1, 0];
  const boundingRect = new RectVar(undefined);
  const children = node.children.map(e => convertAny(e, config));
  const constraints = R.chain(e => e.constraints, children);

  for (let i = 1; i < children.length; i += 1) {
    const a = children[i - 1].boundingRect;
    const b = children[i].boundingRect;
    // children are stacked/side-by-side
    constraints.push(
      new kiwi.Constraint(
        a.intervals[shiftAxis].end,
        kiwi.Operator.Eq,
        b.intervals[shiftAxis].start,
      ),
    );
    // children have same size in shiftAxis
    constraints.push(
      new kiwi.Constraint(
        a.intervals[shiftAxis].getWidthExpr(),
        kiwi.Operator.Eq,
        b.intervals[shiftAxis].getWidthExpr(),
      ),
    );
  }

  // children fill bounding rect
  children.map(e => e.boundingRect).forEach(e => {
    constraints.push(
      new kiwi.Constraint(
        e.intervals[equalAxis].start,
        kiwi.Operator.Eq,
        boundingRect.intervals[equalAxis].start,
      ),
    );
    constraints.push(
      new kiwi.Constraint(
        e.intervals[equalAxis].end,
        kiwi.Operator.Eq,
        boundingRect.intervals[equalAxis].end,
      ),
    );
  });

  // bounding rect is tight around children
  const firstChild = children[0].boundingRect;
  const lastChild = R.last(children)!.boundingRect;
  constraints.push(
    new kiwi.Constraint(
      boundingRect.intervals[shiftAxis].start,
      kiwi.Operator.Eq,
      firstChild.intervals[shiftAxis].start,
    ),
  );
  constraints.push(
    new kiwi.Constraint(
      boundingRect.intervals[shiftAxis].end,
      kiwi.Operator.Eq,
      lastChild.intervals[shiftAxis].end,
    ),
  );

  return {
    constraints,
    boundingRect,
    rects: [...R.chain(e => e.rects, children), boundingRect],
  };
}

export function convertTightLeaf(node: TightLeafNode): Output {
  const rect = new RectVar(node.id);
  return {
    boundingRect: rect,
    rects: [rect],
    constraints: [
      ...rect.setPreferedSize(node.size),
      ...rect.setMinSize(node.size),
    ],
  };
}
