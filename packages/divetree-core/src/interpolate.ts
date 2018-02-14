import { Id } from "./interfaces/input";
import {
  InternalOutputNode as Node,
  InternalOutputNode,
} from "./interfaces/output";
import { AnimationGroup, AnimationKind } from "./plan-animation";

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
  if (animation.kind === AnimationKind.Transform) {
    return t =>
      animation.content.map(id => {
        const b = before.get(id)!;
        const a = after.get(id)!;
        return {
          id,
          lifecycle: 0,
          size: mixVector(b.size, a.size, t),
          offset: mixVector(b.offset, a.offset, t),
        };
      });
  }
  const genericEnterLeave = (
    target: Map<Id, Node>,
    _lifecycle: (t: number) => number,
    _finalMix: (t: number) => number,
  ): Interpolator => t => {
    const lifecycle = _lifecycle(t);
    const finalMix = _finalMix(t);
    const origin = mixVector(
      getCenterLeft(before.get(animation.parent)),
      getCenterLeft(after.get(animation.parent)),
      t,
    );
    return animation.content.map(id => {
      const e = target.get(id);
      return {
        id,
        lifecycle,
        size: mixVector([0, 0], e.size, finalMix),
        offset: mixVector(origin, e.offset, finalMix),
      };
    });
  };
  return animation.kind === AnimationKind.Enter
    ? genericEnterLeave(after, t => t - 1, t => t)
    : genericEnterLeave(before, t => t, t => 1 - t);
}

function getCenterLeft(rect: Node): number[] {
  return [rect.offset[0], rect.offset[1] + rect.size[1] / 2];
}

function mixNumber(x: number, y: number, a: number): number {
  return (1 - a) * x + a * y;
}

function mixVector(x: number[], y: number[], a: number): number[] {
  return x.map((v, i) => mixNumber(v, y[i], a));
}
