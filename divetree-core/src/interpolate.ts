import { Id } from "./interfaces/input";
import { InternalOutputNode as Node } from "./interfaces/output";
import { AnimationGroup, AnimationKind } from "./plan-animation";
import { unionOffsetRects } from "./geometry";
import { unreachable } from "./unreachable";

export enum MaybeConstantKind {
  Constant,
  Function,
}

export interface InterpolationConstant<T> {
  kind: MaybeConstantKind.Constant;
  value: T;
}

export interface InterpolationLinearFunction<T> {
  kind: MaybeConstantKind.Function;
  from: T;
  to: T;
}

export type MaybeConstant<T> =
  | InterpolationConstant<T>
  | InterpolationLinearFunction<T>;

function fromConstant<T>(value: T): InterpolationConstant<T> {
  return { kind: MaybeConstantKind.Constant, value };
}

function fromFunction<T>(
  getValue: (t: number) => T,
): InterpolationLinearFunction<T> {
  return {
    kind: MaybeConstantKind.Function,
    from: getValue(0),
    to: getValue(1),
  };
}

function fromMaybeConstant<T>(
  maybe: MaybeConstant<T>,
  t: number,
  interpolate: (a: T, b: T, t: number) => T,
): T {
  switch (maybe.kind) {
    case MaybeConstantKind.Constant:
      return maybe.value;
    case MaybeConstantKind.Function:
      return interpolate(maybe.from, maybe.to, t);
    default:
      return unreachable(maybe);
  }
}

function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}

function lerpArray(a: number[], b: number[], t: number): number[] {
  if (a.length !== b.length) {
    throw new Error("a and b must have same length");
  }
  return a.map((v, i) => (1 - t) * v + t * b[i]);
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

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
  lifecycle: MaybeConstant<number>;
  withoutScaling: MaybeConstant<DrawRect["withoutScaling"]>;
  withScaling?: MaybeConstant<NonNullable<DrawRect["withScaling"]>>;
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
    lifecycle: fromMaybeConstant(interpolator.lifecycle, t, lerp),
    withoutScaling: fromMaybeConstant(
      interpolator.withoutScaling,
      t,
      (a, b, t) => ({
        size: lerpArray(a.size, b.size, t),
        offset: lerpArray(a.offset, b.offset, t),
      }),
    ),
    withScaling:
      interpolator.withScaling &&
      fromMaybeConstant(interpolator.withScaling, t, (a, b, t) => ({
        precomputed: {
          size: lerpArray(a.precomputed.size, b.precomputed.size, t),
          offset: lerpArray(a.precomputed.offset, b.precomputed.offset, t),
        },
        info: {
          scale: lerp(a.info.scale, b.info.scale, t),
          origin: lerpArray(a.info.origin, b.info.origin, t),
        },
      })),
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
    return animation.content.map((id, i): DrawRectInterpolator => {
      const b = before.get(id);
      const a = after.get(id);
      if (!b || !a) {
        throw new Error(`missing node: ${id}`);
      }
      if (arraysEqual(a.offset, b.offset) && arraysEqual(a.size, b.size)) {
        return {
          id,
          lifecycle: fromConstant(0),
          withoutScaling: fromConstant({ size: a.size, offset: a.offset }),
          transitionBound: transitionBounds[i],
        };
      }
      return {
        id,
        lifecycle: fromConstant(0),
        withoutScaling: fromFunction((t) => ({
          size: mixVector(b.size, a.size, t),
          offset: mixVector(b.offset, a.offset, t),
        })),
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
    return animation.content.map((id): DrawRectInterpolator => {
      const e = target.get(id);
      if (!e) {
        throw new Error(`missing node: ${id}`);
      }
      const origin = _origin || (() => getCenterLeft(e));
      return {
        id,
        lifecycle: fromFunction(lifecycle),
        withoutScaling: fromConstant({
          size: e.size,
          offset: e.offset,
        }),
        withScaling: fromFunction((t) => ({
          precomputed: {
            size: mixVector([0, 0], e.size, finalMix(t)),
            offset: mixVector(origin(t), e.offset, finalMix(t)),
          },
          info: {
            scale: finalMix(t),
            origin: origin(t),
          },
        })),
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
