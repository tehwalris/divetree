export type Id = string | number;

export enum NodeKind {
  Loose,
  TightSplit,
  TightLeaf,
  Portal,
}

export interface LooseNode {
  kind: NodeKind.Loose;
  id: Id;
  parent: TightNode;
  children: (LooseNode | TightNode)[];
}

export type TightNode = TightSplitNode | TightLeafNode;
export type RootNode = LooseNode | TightNode;
export type Node = RootNode | PortalNode;

export enum Split {
  Stacked,
  SideBySide,
}

export interface TightSplitNode {
  kind: NodeKind.TightSplit;
  split: Split;
  growLast?: boolean;
  children: (TightNode | PortalNode)[];
}

export interface TightLeafNode {
  kind: NodeKind.TightLeaf;
  id: Id;
  size: number[];
}

export interface PortalNode {
  kind: NodeKind.Portal;
  id: Id;
  child: LooseNode | TightNode;
}
