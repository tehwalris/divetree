import * as React from "react";
import { DrawRect, Id } from "divetree-core";
import { Focus } from "./interfaces";

export type GetContent = (id: Id) => React.ReactElement<unknown> | null;

interface Props {
  offset: number[];
  rects: DrawRect[];
  focuses: Focus[];
  width: number;
  height: number;
  getContent: GetContent;
}

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

function getFocusColor(progress: number): string {
  const a = [245, 222, 179];
  const b = [0, 128, 0];
  const mixed = a
    .map((e, i) => e * (1 - progress) + b[i] * progress)
    .map(Math.floor);
  return `rgb(${mixed.join(", ")})`;
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
}: Props) => {
  // Round to actual display pixels
  const roundPixel = (v: number) => Math.round(v * DPR) * DPRI;
  const toX = (v: number) => roundPixel(v + offset[0] + width / 2);
  const toY = (v: number) => roundPixel(v + offset[1] + height / 2);

  return (
    <div style={{ ...styles.treeWrapper, width, height }}>
      {rects.map(e => {
        const focus = focuses.find(f => f.id === e.id);
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
              background: getFocusColor(focus ? Math.abs(focus.progress) : 0),
            }}
          >
            {getContent(e.id)}
          </div>
        );
      })}
    </div>
  );
};
