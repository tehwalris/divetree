export interface NavNode {
  id: string;
  children: NavNode[];
}

export interface PassedDownConnections {
  parent?: NavIndexNode;
  previousSibling?: NavIndexNode;
  nextSibling?: NavIndexNode;
}

export interface NavIndexNode extends PassedDownConnections {
  original: NavNode;
  preferredChild?: NavIndexNode;
}

export interface NavIndex {
  root: NavIndexNode;
  nodesById: Map<string, NavIndexNode>;
}
