import * as React from "react";
import {
  DrawRect,
  drawRectFromInterpolator,
  DrawRectInterpolator,
  Id,
} from "divetree-core";
import { Focus } from "./interfaces";
import { roundPixel } from "./round-pixel";
import { SpringPath } from "divetree-core";
import { useEffect, useState } from "react";

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

  console.log("DEBUG Rects.render", progress, progressPath.getDurationMillis());
  return (
    <>
      {rectInterpolators.map((rectInterpolator) => {
        const e = drawRectFromInterpolator(rectInterpolator, progress);

        let focusProgress: number | undefined;
        if (e.id === oldFocusId && e.id === newFocusId) {
          focusProgress = 1;
        } else if (e.id === oldFocusId) {
          focusProgress = toFocusProgress(progress, 0);
        } else if (e.id === newFocusId) {
          focusProgress = toFocusProgress(progress, 1);
        }

        let transform = `translate(
          ${roundPixel(e.withoutScaling.offset[0])}px,
          ${roundPixel(e.withoutScaling.offset[1])}px
        )`;
        if (e.withScaling && e.withScaling.info.scale !== 1) {
          transform = `scale(${e.withScaling.info.scale}) ${transform}`;
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
              opacity: 1 - Math.abs(e.lifecycle),
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
    </>
  );
};
