import { Node } from "./input";
import { PublicOutputNode } from "./output";

export type TreeNode<T> = T & {
  children: TreeNode<T>[];
  parent?: TreeNode<T>;
};

export interface WorkingNodeA {
  size: number[];
  paddingRight: number;
  data: Node;
  getOutput: (v: WorkingNodeC) => PublicOutputNode[];
}

export interface WorkingNodeB extends WorkingNodeA {
  x: number;
  y: number;
}

export interface WorkingNodeC extends WorkingNodeB {
  extents: Extents;
  outerSize: number[];
}

export interface Extents {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
