import { Id } from "./interfaces/input";
import { InternalOutputNode as Node } from "./interfaces/output";
import { AnimationGroup, AnimationKind } from "./plan-animation";

export interface DrawRectScaling {
  precomputed: {
    size: number[];
    offset: number[];
  };
  info: {
    scale: number;
    origin: number[];
  };
}

export interface DrawRect {
  id: Id;
  lifecycle: number; // -1 before enter, 0 normal, 1 after leave (continuous)
  withoutScaling: {
    size: number[];
    offset: number[];
  };
  withScaling?: DrawRectScaling;

  // transitionBound describes the bounding box within which
  // all member nodes will stay throughout the whole transition.
  // It is only valid from transitions between 0 and 1. Nodes may
  // move outside of this box when overshooting.
  transitionBound?: {
    size: number[];
    offset: number[];
  };
}

export type Interpolator = (t: number) => DrawRect[];

export function makeInterpolator(
  before: Map<Id, Node>,
  after: Map<Id, Node>,
  animation: AnimationGroup,
): Interpolator {
  if (animation.kind === AnimationKind.Transform) {
    const transitionBounds = animation.content.map(id => {
      const b = before.get(id);
      const a = after.get(id);
      if (!b || !a) {
        return undefined;
      }
      const size = [];
      const offset = [];
      for (let dim = 0; dim < 2; dim++) {
        const values = [];
        for (const node of [a, b]) {
          values.push(node.offset[dim], node.offset[dim] + node.size[dim]);
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        size.push(max - min);
        offset.push(min);
      }
      return { size, offset };
    });
    return t =>
      animation.content
        .map((id, i) => {
          const b = before.get(id);
          const a = after.get(id);
          if (!b || !a) {
            // TODO this is only necessary while refactoring
            // change to a throw later
            console.warn("missing node", id);
            return undefined;
          }
          return {
            id,
            lifecycle: 0,
            withoutScaling: {
              size: mixVector(b.size, a.size, t),
              offset: mixVector(b.offset, a.offset, t),
            },
            transitionBound: transitionBounds[i],
          };
        })
        .filter(v => v)
        .map(v => v!);
  }
  const genericEnterLeave = (
    target: Map<Id, Node>,
    _lifecycle: (t: number) => number,
    _finalMix: (t: number) => number,
  ): Interpolator => t => {
    const lifecycle = _lifecycle(t);
    const finalMix = _finalMix(t);
    const _origin =
      animation.parent !== undefined &&
      mixVector(
        getCenterLeft(before.get(animation.parent)!),
        getCenterLeft(after.get(animation.parent)!),
        t,
      );
    return animation.content
      .map(id => {
        const e = target.get(id);
        if (!e) {
          // TODO this is only necessary while refactoring
          // change to a throw later
          console.warn("missing node", id);
          return undefined;
        }
        const origin = _origin || getCenterLeft(e);
        return {
          id,
          lifecycle,
          withoutScaling: {
            size: e.size,
            offset: e.offset,
          },
          withScaling: {
            precomputed: {
              size: mixVector([0, 0], e.size, finalMix),
              offset: mixVector(origin, e.offset, finalMix),
            },
            info: {
              scale: finalMix,
              origin: origin,
            },
          },
        };
      })
      .filter(v => v)
      .map(v => v!);
  };
  return animation.kind === AnimationKind.Enter
    ? genericEnterLeave(
        after,
        t => t - 1,
        t => t,
      )
    : genericEnterLeave(
        before,
        t => t,
        t => 1 - t,
      );
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
