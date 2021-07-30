import { Id } from "./interfaces/input";
import { InternalOutputNode as Node } from "./interfaces/output";
import { AnimationGroup, AnimationKind } from "./plan-animation";
import { unionOffsetRects } from "./geometry";

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

export interface DrawRectInterpolator {
  id: Id;
  lifecycle: (t: number) => number;
  withoutScaling: (t: number) => DrawRect["withoutScaling"];
  withScaling?: (t: number) => NonNullable<DrawRect["withScaling"]>;
  transitionBound?: DrawRect["transitionBound"];
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

export function drawRectFromInterpolator(
  interpolator: DrawRectInterpolator,
  t: number,
): DrawRect {
  return {
    id: interpolator.id,
    lifecycle: interpolator.lifecycle(t),
    withoutScaling: interpolator.withoutScaling(t),
    withScaling: interpolator.withScaling?.(t),
    transitionBound: interpolator.transitionBound,
  };
}

export function makeInterpolators(
  before: Map<Id, Node>,
  after: Map<Id, Node>,
  animation: AnimationGroup,
): DrawRectInterpolator[] {
  if (animation.kind === AnimationKind.Transform) {
    const transitionBounds = animation.content.map((id) => {
      const b = before.get(id);
      const a = after.get(id);
      if (!b || !a) {
        throw new Error(`missing node: ${id}`);
      }
      return unionOffsetRects([a, b]);
    });
    return animation.content.map((id, i) => {
      const b = before.get(id);
      const a = after.get(id);
      if (!b || !a) {
        throw new Error(`missing node: ${id}`);
      }
      return {
        id,
        lifecycle: () => 0,
        withoutScaling: (t) => ({
          size: mixVector(b.size, a.size, t),
          offset: mixVector(b.offset, a.offset, t),
        }),
        transitionBound: transitionBounds[i],
      };
    });
  }
  const genericEnterLeave = (
    target: Map<Id, Node>,
    lifecycle: (t: number) => number,
    finalMix: (t: number) => number,
  ): DrawRectInterpolator[] => {
    const _origin =
      animation.parent !== undefined &&
      ((t: number) =>
        mixVector(
          getCenterLeft(before.get(animation.parent!)!),
          getCenterLeft(after.get(animation.parent!)!),
          t,
        ));
    return animation.content.map((id) => {
      const e = target.get(id);
      if (!e) {
        throw new Error(`missing node: ${id}`);
      }
      const origin = _origin || (() => getCenterLeft(e));
      return {
        id,
        lifecycle,
        withoutScaling: (t) => ({
          size: e.size,
          offset: e.offset,
        }),
        withScaling: (t) => ({
          precomputed: {
            size: mixVector([0, 0], e.size, finalMix(t)),
            offset: mixVector(origin(t), e.offset, finalMix(t)),
          },
          info: {
            scale: finalMix(t),
            origin: origin(t),
          },
        }),
      };
    });
  };
  return animation.kind === AnimationKind.Enter
    ? genericEnterLeave(
        after,
        (t) => t - 1,
        (t) => t,
      )
    : genericEnterLeave(
        before,
        (t) => t,
        (t) => 1 - t,
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
