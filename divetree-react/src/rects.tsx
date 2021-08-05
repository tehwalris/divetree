import { DrawRectInterpolator, Id, SpringPath } from "divetree-core";
import * as React from "react";
import { useEffect, useRef } from "react";
import { Rect, RectStyle } from "./rect";

const progressProperty: string = "--divetree-rects-progress";

export type GetContent = (id: Id) => React.ReactElement<unknown> | null;

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

export const Rects = ({
  rectInterpolators,
  oldFocusId,
  newFocusId,
  getContent,
  getStyle,
  progressPath,
}: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
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

      // TODO stop animation when endOfPath?
      const { result, endOfPath } = progressPath.getResult(dt);
      progressRef.current = result.position;

      if (wrapperRef.current) {
        wrapperRef.current.style.setProperty(
          progressProperty,
          "" + progressRef.current,
        );
      }

      requestAnimationFrame(animationCallback);
    }

    animationCallback();

    return () => {
      shouldStop = true;
    };
  }, [progressPath, progressProperty]);

  return (
    <div ref={wrapperRef} style={{ [progressProperty]: progressRef.current }}>
      {rectInterpolators.map((r) => (
        <Rect
          key={r.id}
          interpolator={r}
          progressProperty={progressProperty}
          notFocusedStyle={(getStyle || DEFAULT_GET_STYLE)(r.id, false)}
          focusedStyle={(getStyle || DEFAULT_GET_STYLE)(r.id, true)}
          oldFocusId={oldFocusId}
          newFocusId={newFocusId}
        >
          {getContent(r.id)}
        </Rect>
      ))}
    </div>
  );
};
