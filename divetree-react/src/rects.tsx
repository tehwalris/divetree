import * as React from "react";
import { DrawRect, Id } from "divetree-core";
import { Focus } from "./interfaces";

export type GetContent = (id: Id) => React.ReactElement<unknown> | null;

export interface RectStyle {
  color: number[];
  borderColor: number[];
}

export type GetStyle = (id: Id, focused: boolean) => RectStyle;

interface Props {
  offset: number[];
  rects: DrawRect[];
  focuses: Focus[];
  width: number;
  height: number;
  getContent: GetContent;
  getStyle?: GetStyle;
}

const DEFAULT_GET_STYLE: GetStyle = (id, focused) =>
  focused
    ? { color: [0, 128, 0], borderColor: [0, 0, 0] }
    : { color: [245, 222, 179], borderColor: [0, 0, 0] };

const styles: { [key: string]: React.CSSProperties } = {
  treeWrapper: {
    position: "relative",
    border: "1px solid black",
    overflow: "hidden",
  },
  rect: {
    position: "absolute",
    border: "1px solid black",
    overflow: "hidden",
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

const DPR = window.devicePixelRatio;
const DPRI = 1 / DPR;

export const Rects = ({
  offset,
  rects,
  focuses,
  width,
  height,
  getContent,
  getStyle,
}: Props) => {
  // Round to actual display pixels
  const roundPixel = (v: number) => Math.round(v * DPR) * DPRI;
  const toX = (v: number) => roundPixel(v + offset[0] + width / 2);
  const toY = (v: number) => roundPixel(v + offset[1] + height / 2);

  return (
    <div style={{ ...styles.treeWrapper, width, height }}>
      {rects.map((e) => {
        const focus = focuses.find((f) => f.id === e.id);
        let transform = `translate(
          ${toX(e.withoutScaling.offset[0])}px,
          ${toY(e.withoutScaling.offset[1])}px
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
                [toX, toY]
                  .map((f, i) => f(e.withScaling!.info.origin[i]) + "px")
                  .join(" "),
              willChange: "transform, opacity",
              opacity: 1 - Math.abs(e.lifecycle),
              zIndex: 1 - Math.ceil(Math.abs(e.lifecycle)),
              background: getFocusColor(
                focus ? Math.abs(focus.progress) : 0,
                e.id,
                getStyle || DEFAULT_GET_STYLE,
              ),
              borderColor: getFocusBorderColor(
                focus ? Math.abs(focus.progress) : 0,
                e.id,
                getStyle || DEFAULT_GET_STYLE,
              ),
            }}
          >
            {getContent(e.id)}
          </div>
        );
      })}
    </div>
  );
};
