import * as React from "react";
import NavTree, { NavNode } from "divetree-demo/src/nav-tree";
import {
  Node as DivetreeNode,
  NodeKind,
  Split,
  TightLeafNode,
} from "divetree-core";
import { unreachable } from "divetree-demo/src/util";

type Expression = BinaryExpression | NumericLiteral;

enum ExpressionKind {
  BinaryExpression,
  NumericLiteral,
}

enum Operation {
  Add,
  Multiply,
}

interface BaseExpression {
  id: string;
}

interface BinaryExpression extends BaseExpression {
  kind: ExpressionKind.BinaryExpression;
  operation: Operation;
  left: Expression;
  right: Expression;
}

interface NumericLiteral extends BaseExpression {
  kind: ExpressionKind.NumericLiteral;
  value: number;
}

interface State {
  value: Expression;
}

const DEMO_EXPRESSION: Expression = {
  id: "neasnxjsrbjj",
  kind: ExpressionKind.BinaryExpression,
  operation: Operation.Add,
  left: {
    id: "snrcctcaues",
    kind: ExpressionKind.NumericLiteral,
    value: 123,
  },
  right: {
    id: "cljwoej",
    kind: ExpressionKind.BinaryExpression,
    operation: Operation.Multiply,
    left: {
      id: "vvetar",
      kind: ExpressionKind.BinaryExpression,
      operation: Operation.Add,
      left: {
        id: "snqrcee",
        kind: ExpressionKind.NumericLiteral,
        value: 22,
      },
      right: {
        id: "tttscjee",
        kind: ExpressionKind.NumericLiteral,
        value: 3,
      },
    },
    right: {
      id: "rjknsw",
      kind: ExpressionKind.NumericLiteral,
      value: 75,
    },
  },
};

export class EquationEditor extends React.Component<{}, State> {
  state: State = {
    value: DEMO_EXPRESSION,
  };

  render() {
    return (
      <NavTree
        navTree={toNavTree(this.state.value)}
        getDisplayTree={this.getDisplayTree}
      />
    );
  }

  getDisplayTree = (focusPath: string[]): DivetreeNode => {
    return toDisplayTree(this.state.value, focusPath, 0);
  };
}

function toNavTree(node: Expression): NavNode {
  switch (node.kind) {
    case ExpressionKind.BinaryExpression:
      return {
        id: node.id,
        children: [node.left, node.right].map(toNavTree),
      };
    case ExpressionKind.NumericLiteral:
      return {
        id: node.id,
        children: [],
      };
    default:
      return unreachable(node);
  }
}

function toDisplayTree(
  node: Expression,
  path: string[],
  extraDepth: number,
): DivetreeNode {
  let children: Expression[] = [];
  if (node.kind === ExpressionKind.BinaryExpression) {
    children = [node.left, node.right];
  }

  const isOnPath = node.id === path[0];
  const isFinal = !isOnPath || !!extraDepth;

  const base: TightLeafNode = {
    kind: NodeKind.TightLeaf,
    id: node.id,
    size: [100, 50],
  };
  if (isFinal) {
    if (!children.length) {
      return base;
    }
    return {
      kind: NodeKind.TightSplit,
      split: Split.SideBySide,
      children: [
        base,
        {
          kind: NodeKind.TightSplit,
          split: Split.Stacked,
          children: children.map((c): TightLeafNode => ({
            kind: NodeKind.TightLeaf,
            id: c.id,
            size: [75, 25],
          })),
        },
      ],
    };
  }
  return {
    kind: NodeKind.Loose,
    id: `${node.id}-loose`,
    parent: base,
    children: children.map(c => {
      return toDisplayTree(
        c,
        isOnPath ? path.slice(1) : [],
        extraDepth + (isOnPath ? 0 : 1),
      );
    }),
  };
}
