export type Id = string | number | undefined;

export enum NodeKind {
  Loose,
  TightSplit,
  TightLeaf,
}

export interface LooseNode {
  kind: NodeKind.Loose;
  parent: TightNode;
  children: Node[];
}

export type TightNode = TightSplitNode | TightLeafNode;
export type Node = LooseNode | TightNode;

export enum Split {
  Stacked,
  SideBySide,
}

export interface TightSplitNode {
  kind: NodeKind.TightSplit;
  split: Split;
  children: TightNode[];
}

export interface TightLeafNode {
  kind: NodeKind.TightLeaf;
  id: Id;
  size: number[];
}
