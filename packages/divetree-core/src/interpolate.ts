import { Id } from "./interfaces/input";
import { InternalOutputNode as Node } from "./interfaces/output";
import { AnimationGroup } from "./plan-animation";

export interface DrawRect {
  id: Id;
  lifecycle: number; // -1 before enter, 0 normal, 1 after leave (continuous)
  size: number[];
  offset: number[];
}

export type Interpolator = (t: number) => DrawRect[];

export function makeInterpolator(
  before: Map<Id, Node>,
  after: Map<Id, Node>,
  animation: AnimationGroup,
): Interpolator {
  return () => [];
}
