import { Id } from "./input";

export interface InternalOutputNode {
  id: Id | undefined;
  visible: boolean;
  size: number[];
  offset: number[];
}

export interface PublicOutputNode extends InternalOutputNode {
  id: Id;
}

export function isPublicOutputNode(
  v: InternalOutputNode,
): v is PublicOutputNode {
  return v.id !== undefined;
}
