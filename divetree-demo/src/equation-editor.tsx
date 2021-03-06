import * as React from "react";
import {
  RootNode as DivetreeNode,
  NodeKind,
  Split,
  TightLeafNode,
  Id,
  NavNode,
} from "divetree-core";
import { unreachable } from "./util";
import { NavTree } from "divetree-react";

type Expression = BinaryExpression | NumericLiteral | Hole;

enum ExpressionKind {
  BinaryExpression,
  NumericLiteral,
  Hole,
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

interface Hole extends BaseExpression {
  kind: ExpressionKind.Hole;
}

type Index = Map<Id, { idPath: string[]; node: Expression }>;

interface State {
  expression: Expression;
  index: Index;
  focusedId: string;
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
        kind: ExpressionKind.Hole,
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
    expression: DEMO_EXPRESSION,
    index: buildIndex(DEMO_EXPRESSION),
    focusedId: DEMO_EXPRESSION.id,
  };

  render() {
    return (
      <NavTree
        navTree={toNavTree(this.state.expression)}
        getDisplayTree={this.getDisplayTree}
        getContent={this.getContent}
        focusedIdPath={this.state.index.get(this.state.focusedId)?.idPath || []}
        onFocusedIdChange={(focusedId) => this.setState({ focusedId })}
        onKeyDown={this.onKeyDown}
      />
    );
  }

  getDisplayTree = (focusPath: string[]): DivetreeNode => {
    return toDisplayTree(this.state.expression, focusPath, 0);
  };

  getContent = (id: Id): React.ReactElement<unknown> | null => {
    const indexEntry = this.state.index.get(id);
    if (!indexEntry) {
      return null;
    }
    const { node } = indexEntry;
    switch (node.kind) {
      case ExpressionKind.BinaryExpression:
        return <div>{Operation[node.operation]}</div>;
      case ExpressionKind.NumericLiteral:
        return <div>{node.value}</div>;
      case ExpressionKind.Hole:
        return <div>(hole)</div>;
      default:
        return unreachable(node);
    }
  };

  onKeyDown = (
    event: KeyboardEvent,
    focusedId: string,
  ): boolean | undefined => {
    const setWrapped = (wrap: (node: Expression) => Expression) =>
      this.setExpression(wrapAt(this.state.expression, focusedId, wrap));
    switch (event.key) {
      case "a": {
        setWrapped((node) => ({
          id: "" + Math.random(),
          kind: ExpressionKind.BinaryExpression,
          operation: Operation.Add,
          left: node,
          right: {
            id: "" + Math.random(),
            kind: ExpressionKind.Hole,
          },
        }));
        return false;
      }
      case "m": {
        setWrapped((node) => ({
          id: "" + Math.random(),
          kind: ExpressionKind.BinaryExpression,
          operation: Operation.Multiply,
          left: node,
          right: {
            id: "" + Math.random(),
            kind: ExpressionKind.Hole,
          },
        }));
        return false;
      }
      case "s": {
        this.setExpression(
          map(this.state.expression, (e) => {
            if (
              e.id === focusedId &&
              (e.kind === ExpressionKind.NumericLiteral ||
                e.kind === ExpressionKind.Hole)
            ) {
              const value = parseFloat(prompt("Enter a number") || "");
              if (!isNaN(value)) {
                return {
                  id: e.id,
                  kind: ExpressionKind.NumericLiteral,
                  value,
                };
              }
            }
            return e;
          }),
        );
        return false;
      }
      default: {
        return true;
      }
    }
  };

  setExpression(expression: Expression) {
    this.setState({ expression, index: buildIndex(expression) });
  }
}

function map(
  oldRoot: Expression,
  cb: (node: Expression) => Expression,
): Expression {
  const newRoot = cb(oldRoot);
  switch (newRoot.kind) {
    case ExpressionKind.BinaryExpression:
      return {
        ...newRoot,
        left: map(newRoot.left, cb),
        right: map(newRoot.right, cb),
      };
    case ExpressionKind.NumericLiteral:
    case ExpressionKind.Hole:
      return newRoot;
    default:
      return unreachable(newRoot);
  }
}

function wrapAt(
  node: Expression,
  targetId: Id,
  wrap: (node: Expression) => Expression,
): Expression {
  if (node.id === targetId) {
    return wrap(node);
  }
  if (node.kind === ExpressionKind.BinaryExpression) {
    return {
      ...node,
      left: wrapAt(node.left, targetId, wrap),
      right: wrapAt(node.right, targetId, wrap),
    };
  }
  return node;
}

function buildIndex(
  node: Expression,
  _index: Index = new Map(),
  parentIdPath: string[] = [],
): Index {
  const idPath = [...parentIdPath, node.id];
  _index.set(node.id, { idPath, node: node });
  if (node.kind === ExpressionKind.BinaryExpression) {
    [node.left, node.right].forEach((c) => buildIndex(c, _index, idPath));
  }
  return _index;
}

function toNavTree(node: Expression): NavNode {
  switch (node.kind) {
    case ExpressionKind.BinaryExpression:
      return {
        id: node.id,
        getChildren: () => [node.left, node.right].map(toNavTree),
      };
    default:
      return {
        id: node.id,
        getChildren: () => [],
      };
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
          children: children.map(
            (c): TightLeafNode => ({
              kind: NodeKind.TightLeaf,
              id: c.id,
              size: [75, 25],
            }),
          ),
        },
      ],
    };
  }
  return {
    kind: NodeKind.Loose,
    id: `${node.id}-loose`,
    parent: base,
    children: children.map((c) => {
      return toDisplayTree(
        c,
        isOnPath ? path.slice(1) : [],
        extraDepth + (isOnPath ? 0 : 1),
      );
    }),
  };
}
