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

function mixColors(progress: number, _a: number[], _b: number[]): string {
  const a = padColor(_a);
  const b = padColor(_b);
  const mixed = a.map((e, i) => e * (1 - progress) + b[i] * progress);
  for (let i = 0; i < 3; i++) {
    mixed[i] = Math.floor(mixed[i]);
  }
  return `rgba(${mixed.join(", ")})`;
}

function getFocusColor(progress: number, id: Id, getStyle: GetStyle): string {
  return mixColors(
    progress,
    getStyle(id, false).color,
    getStyle(id, true).color,
  );
}

function getFocusBorderColor(
  progress: number,
  id: Id,
  getStyle: GetStyle,
): string {
  return mixColors(
    progress,
    getStyle(id, false).borderColor,
    getStyle(id, true).borderColor,
  );
}

function toFocusProgress(progress: number, target: number) {
  return 1 - Math.min(1, Math.abs(progress - target));
}

function progressLerp(a: string | number, b: string | number): string {
  const t = `var(${progressProperty})`;
  return `calc((1 - ${t}) * (${a}) + ${t} * (${b}))`;
}

function fromMaybeConstant<T, O>(
  maybe: MaybeConstant<T>,
  fromValue: (v: T) => O,
  fromLinearFunction: (a: T, b: T) => O,
): O {
  if (maybe.kind === MaybeConstantKind.Constant) {
    return fromValue(maybe.value);
  } else {
    return fromLinearFunction(maybe.from, maybe.to);
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
        const absLifecycle = fromMaybeConstant<number, string | number>(
          r.lifecycle,
          (v) => Math.abs(v),
          (a, b) => progressLerp(Math.abs(a), Math.abs(b)),
        );

        const e = drawRectFromInterpolator(r, progress);

        let focusProgress: number | undefined;
        if (e.id === oldFocusId && e.id === newFocusId) {
          focusProgress = 1;
        } else if (e.id === oldFocusId) {
          focusProgress = toFocusProgress(progress, 0);
        } else if (e.id === newFocusId) {
          focusProgress = toFocusProgress(progress, 1);
        }

        let transform = fromMaybeConstant(
          r.withoutScaling,
          (v) =>
            `translate(
               ${asRoundedPx(v.offset[0])},
               ${asRoundedPx(v.offset[1])}
             )`,
          (a, b) =>
            `translate(
               ${progressLerp(
                 asRoundedPx(a.offset[0]),
                 asRoundedPx(b.offset[0]),
               )},
               ${progressLerp(
                 asRoundedPx(a.offset[1]),
                 asRoundedPx(b.offset[1]),
               )}
             )`,
        );
        if (r.withScaling) {
          transform =
            fromMaybeConstant(
              r.withScaling,
              (v) => (v.info.scale === 1 ? "" : `scale(${v.info.scale})`),
              (a, b) => `scale(${progressLerp(a.info.scale, b.info.scale)})`,
            ) +
            " " +
            transform;
        }
        return (
          <div
            key={e.id}
            style={{
              ...styles.rect,
              width: e.withoutScaling.size[0],
              height: e.withoutScaling.size[1],
              transform,
              transformOrigin:
                e.withScaling &&
                e.withScaling.info.origin
                  .map((v) => roundPixel(v) + "px")
                  .join(" "),
              opacity: `calc(1 - ${absLifecycle})`,
              zIndex: 1 - Math.ceil(Math.abs(e.lifecycle)),
              background: getFocusColor(
                focusProgress ?? 0,
                e.id,
                getStyle || DEFAULT_GET_STYLE,
              ),
              borderColor: getFocusBorderColor(
                focusProgress ?? 0,
                e.id,
                getStyle || DEFAULT_GET_STYLE,
              ),
              ...(getStyle || DEFAULT_GET_STYLE)(
                e.id,
                focusProgress !== undefined,
              ).extra,
            }}
          >
            {getContent(e.id)}
          </div>
        );
      })}
    </div>
  );
};
