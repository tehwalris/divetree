import * as React from "react";
import {
  DrawRect,
  drawRectFromInterpolator,
  DrawRectInterpolator,
  Id,
  MaybeConstantKind,
  MaybeConstant,
} from "divetree-core";
import { Focus } from "./interfaces";
import { roundPixel } from "./round-pixel";
import { SpringPath } from "divetree-core";
import { useEffect, useState } from "react";

const progressProperty: string = "--divetree-rects-progress";

export type GetContent = (id: Id) => React.ReactElement<unknown> | null;

export interface RectStyle {
  color: number[];
  borderColor: number[];
  extra?: React.CSSProperties;
}

export type GetStyle = (id: Id, focused: boolean) => RectStyle;

interface Props {
  rectInterpolators: DrawRectInterpolator[];
  oldFocusId: Id | undefined;
  newFocusId: Id | undefined;
  getContent: GetContent;
  getStyle?: GetStyle;
  progressPath: SpringPath;
}

const DEFAULT_GET_STYLE: GetStyle = (id, focused) =>
  focused
    ? { color: [0, 128, 0], borderColor: [0, 0, 0] }
    : { color: [245, 222, 179], borderColor: [0, 0, 0] };

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

function progressLerpColors(
  _a: number[],
  _b: number[],
  progress?: string | number,
): string {
  const a = padColor(_a);
  const b = padColor(_b);
  const mixed = a.map((v, i) =>
    progressLerp(Math.round(v), Math.round(b[i]), progress),
  );
  return `rgba(${mixed.join(", ")})`;
}

function getFocusColor(
  id: Id,
  getStyle: GetStyle,
  progress: string | number,
): string {
  return progressLerpColors(
    getStyle(id, false).color,
    getStyle(id, true).color,
    progress,
  );
}

function getFocusBorderColor(
  id: Id,
  getStyle: GetStyle,
  progress: string | number,
): string {
  return progressLerpColors(
    getStyle(id, false).borderColor,
    getStyle(id, true).borderColor,
    progress,
  );
}

function progressLerp(
  a: string | number,
  b: string | number,
  progress?: string | number,
): string | number {
  if (a === b) {
    return a;
  }
  const t = progress ?? `var(${progressProperty})`;
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

export const Rects = ({
  rectInterpolators,
  oldFocusId,
  newFocusId,
  getContent,
  getStyle,
  progressPath,
}: Props) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let shouldStop = false;

    let startT: number | undefined;
    function animationCallback() {
      if (shouldStop) {
        return;
      }

      const t = window.performance.now();
      if (startT === undefined) {
        startT = t;
      }
      const dt = t - startT;

      const { result, endOfPath } = progressPath.getResult(dt);
      setProgress(result.position);

      requestAnimationFrame(animationCallback);
    }

    animationCallback();

    return () => {
      shouldStop = true;
    };
  }, [progressPath]);

  return (
    <div style={{ [progressProperty]: progress }}>
      {rectInterpolators.map((r) => {
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
            style={{
              ...styles.rect,
              width,
              height,
              transform,
              transformOrigin,
              opacity: `calc(1 - ${absLifecycle})`,
              zIndex,
              background: getFocusColor(
                r.id,
                getStyle || DEFAULT_GET_STYLE,
                focusProgress ?? 0,
              ),
              borderColor: getFocusBorderColor(
                r.id,
                getStyle || DEFAULT_GET_STYLE,
                focusProgress ?? 0,
              ),
              ...(getStyle || DEFAULT_GET_STYLE)(
                r.id,
                focusProgress !== undefined,
              ).extra,
            }}
          >
            {getContent(r.id)}
          </div>
        );
      })}
    </div>
  );
};
