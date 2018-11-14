import * as React from "react";
import NavTree, { NavNode } from "divetree-demo/src/nav-tree";
import { Node as DivetreeNode, NodeKind } from "divetree-core";
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
    kind: ExpressionKind.NumericLiteral,
    value: 22,
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
    return toDisplayTree(this.state.value, focusPath);
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

function toDisplayTree(node: Expression, path: string[]): DivetreeNode {
  return {
    kind: NodeKind.TightLeaf,
    id: node.id,
    size: [200, 50],
  };
}
