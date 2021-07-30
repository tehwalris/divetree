import * as React from "react";
import { roundPixel } from "./round-pixel";

interface Props {
  width: number;
  height: number;
  offset: number[];
  children: React.ReactNode;
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    position: "relative",
    border: "1px solid black",
    overflow: "hidden",
  },
};

export const Viewport = ({ width, height, offset, children }: Props) => {
  return (
    <div
      style={{
        ...styles.wrapper,
        width,
        height,
      }}
    >
      <div
        style={{
          transform: `translate(${offset
            .map((v) => `${roundPixel(v)}px`)
            .join(", ")})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
