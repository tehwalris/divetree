import * as React from "react";
import { DrawRect } from "divetree-core";

interface Props {
  offset: number[];
  rects: DrawRect[];
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
    background: "wheat",
    overflow: "hidden",
  },
};

export const Rects = ({ offset, rects, width, height }: Props) => (
  <div style={{ ...styles.treeWrapper, width, height }}>
    {rects.map(e => (
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
        }}
      />
    ))}
  </div>
);
