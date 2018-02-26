import * as React from "react";
import { DrawRect } from "divetree-core";
import { Focus } from "./interfaces";

interface Props {
  offset: number[];
  rects: DrawRect[];
  focuses: Focus[];
  width: number;
  height: number;
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
    boxSizing: "border-box",
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

export const Rects = ({ offset, rects, focuses, width, height }: Props) => (
  <div style={{ ...styles.treeWrapper, width, height }}>
    {rects.map(e => {
      const focus = focuses.find(f => f.id === e.id);
      return (
        <div
          key={e.id}
          style={{
            ...styles.rect,
            top: e.offset[1] + offset[1] + height / 2,
            left: e.offset[0] + offset[0] + width / 2,
            width: e.size[0],
            height: e.size[1],
            opacity: 1 - Math.abs(e.lifecycle),
            zIndex: 1 - Math.ceil(Math.abs(e.lifecycle)),
            background: getFocusColor(focus ? Math.abs(focus.progress) : 0),
          }}
        />
      );
    })}
  </div>
);
