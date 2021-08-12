import {
  DrawRectInterpolator,
  Id,
  MaybeConstant,
  MaybeConstantKind,
} from "divetree-core";
import * as React from "react";
import { roundPixel } from "./round-pixel";

interface Props {
  interpolator: DrawRectInterpolator;
  progressProperty: string;
  children: React.ReactNode;
  notFocusedStyle: RectStyle;
  focusedStyle: RectStyle;
  oldFocusId: Id | undefined;
  newFocusId: Id | undefined;
  onClick?: (ev: React.MouseEvent) => void;
}

export interface RectStyle {
  color: number[];
  borderColor: number[];
  extra?: React.CSSProperties;
}

const styles: { [key: string]: React.CSSProperties } = {
  rect: {
    position: "absolute",
    border: "1px solid black",
    overflow: "hidden",
    contain: "strict",
    willChange: "transform, opacity",
  },
};

function padColor(color: number[]): number[] {
  if (color.length === 4) {
    return color;
  } else if (color.length === 3) {
    return [...color, 1];
  } else {
    throw new Error(`invalid color format (length ${color.length})`);
  }
}

function lerpColors(
  _a: number[],
  _b: number[],
  progress: string | number,
): string {
  const a = padColor(_a);
  const b = padColor(_b);
  const mixed = a.map((v, i) =>
    lerp(Math.round(v), Math.round(b[i]), progress),
  );
  return `rgba(${mixed.join(", ")})`;
}

function getFocusColor(
  notFocusedStyle: RectStyle,
  focusedStyle: RectStyle,
  progress: string | number,
): string {
  return lerpColors(notFocusedStyle.color, focusedStyle.color, progress);
}

function getFocusBorderColor(
  notFocusedStyle: RectStyle,
  focusedStyle: RectStyle,
  progress: string | number,
): string {
  return lerpColors(
    notFocusedStyle.borderColor,
    focusedStyle.borderColor,
    progress,
  );
}

function lerp(
  a: string | number,
  b: string | number,
  t: string | number,
): string | number {
  if (a === b) {
    return a;
  }
  return `calc((1 - ${t}) * (${a}) + ${t} * (${b}))`;
}

function fromMaybeConstant<A, B, C>(
  maybe: MaybeConstant<A>,
  map: (v: A) => B,
  join: (a: B, b: B) => C,
  only: (v: B) => C,
): C;
function fromMaybeConstant<A, B, C>(
  maybe: MaybeConstant<A>,
  map: (v: A) => B,
  join: (a: B, b: B) => C,
): B | C;
function fromMaybeConstant<A, B, C>(
  maybe: MaybeConstant<A>,
  map: (v: A) => B,
  join: (a: B, b: B) => C,
  only: (v: B) => B | C = (v) => v,
): B | C {
  if (maybe.kind === MaybeConstantKind.Constant) {
    return only(map(maybe.value));
  } else {
    return join(map(maybe.from), map(maybe.to));
  }
}

function asRoundedPx(v: number): string {
  return `${roundPixel(v)}px`;
}

export const Rect = ({
  interpolator: r,
  progressProperty,
  children,
  focusedStyle,
  notFocusedStyle,
  oldFocusId,
  newFocusId,
  onClick,
}: Props) => {
  const progressLerp = (
    a: string | number,
    b: string | number,
  ): string | number => lerp(a, b, `var(${progressProperty})`);

  const absLifecycle = fromMaybeConstant(
    r.lifecycle,
    (v) => Math.abs(v),
    (a, b) => progressLerp(a, b),
  );
  const [width, height] = [0, 1].map((i) =>
    fromMaybeConstant(
      r.withoutScaling,
      (v) => asRoundedPx(v.size[i]),
      (a, b) => progressLerp(a, b),
    ),
  );
  const zIndex = fromMaybeConstant(
    r.lifecycle,
    (v) => 1 - Math.ceil(Math.abs(v)),
    (a, b) => Math.min(a, b),
  );

  let focusProgress: string | number | undefined;
  if (r.id === oldFocusId && r.id === newFocusId) {
    focusProgress = 1;
  } else if (r.id === oldFocusId) {
    focusProgress = `calc(1 - var(${progressProperty}))`;
  } else if (r.id === newFocusId) {
    focusProgress = `var(${progressProperty})`;
  }

  let transform = fromMaybeConstant(
    r.withoutScaling,
    (v) => v.offset.map((e) => asRoundedPx(e)),
    (a, b) =>
      `translate(
               ${progressLerp(a[0], b[0])},
               ${progressLerp(a[1], b[1])}
             )`,
    (v) => `translate(${v.join(", ")})`,
  );
  let transformOrigin = undefined;
  if (r.withScaling) {
    transform =
      fromMaybeConstant(
        r.withScaling,
        (v) => v.scale,
        (a, b) => `scale(${progressLerp(a, b)})`,
        (v) => (v === 1 ? "" : `scale(${v})`),
      ) +
      " " +
      transform;
    transformOrigin = fromMaybeConstant(
      r.withScaling,
      (v) => v.origin.map((e) => asRoundedPx(e)),
      (a, b) => a.map((v, i) => progressLerp(v, b[i])).join(" "),
      (v) => v.join(" "),
    );
  }

  return (
    <div
      key={r.id}
      onClick={onClick}
      style={{
        ...styles.rect,
        width,
        height,
        transform,
        transformOrigin,
        opacity: `calc(1 - ${absLifecycle})`,
        zIndex,
        background: getFocusColor(
          notFocusedStyle,
          focusedStyle,
          focusProgress ?? 0,
        ),
        borderColor: getFocusBorderColor(
          notFocusedStyle,
          focusedStyle,
          focusProgress ?? 0,
        ),
        ...(focusProgress === undefined ? notFocusedStyle : focusedStyle).extra,
      }}
    >
      {children}
    </div>
  );
};
