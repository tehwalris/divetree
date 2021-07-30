import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spring, SpringPath } from "divetree-core/lib/spring";
import { roundPixel } from "./round-pixel";

interface Props {
  width: number;
  height: number;
  staticOffset: number[];
  offsetPath: SpringPath[];
  children: React.ReactNode;
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    position: "relative",
    border: "1px solid black",
    overflow: "hidden",
  },
};

function useStylesheet(): CSSStyleSheet | undefined {
  const [sheet, setSheet] = useState<CSSStyleSheet>();
  const styleRef = useRef(document.createElement("style"));
  useEffect(() => {
    styleRef.current.type = "text/css";
    document.getElementsByTagName("head")[0].appendChild(styleRef.current);
    if (styleRef.current.sheet) {
      setSheet(styleRef.current.sheet);
    } else {
      console.warn("failed to create stylesheet");
    }

    return () => {
      styleRef.current.remove();
    };
  }, []);
  return sheet;
}

function useKeyframeAnimation(keyframesDeclarationBody: string) {
  const sheet = useStylesheet();
  const [animationName, setAnimationName] = useState<string>();
  useEffect(() => {
    if (!sheet) {
      return;
    }

    // HACK really bad name generation
    const name = `viewport-animation-${Math.round(100000 * Math.random())}`;
    sheet.insertRule(`@keyframes ${name} { ${keyframesDeclarationBody} }`);
    setAnimationName(name);

    return () => {
      sheet.removeRule(0);
    };
  }, [sheet, keyframesDeclarationBody]);
  return animationName;
}

export const Viewport = ({
  width,
  height,
  staticOffset,
  offsetPath,
  children,
}: Props) => {
  const [keyframeBody, animationDurationMillis] = useMemo(() => {
    const offsetSteps = SpringPath.getZippedPositions(offsetPath).map((o) =>
      o.map((v, i) => v + staticOffset[i]),
    );
    const keyframeSteps: string[] = [];
    for (let percent = 0; percent <= 100; percent++) {
      const i = Math.round((percent / 100) * (offsetSteps.length - 1));
      keyframeSteps.push(`
        ${percent}% {
          transform: translate(${offsetSteps[i]
            .map((v) => `${roundPixel(v)}px`)
            .join(", ")});
        }`);
    }
    const animationDurationMillis = Math.max(
      ...offsetPath.map((p) => p.getDurationMillis()),
    );

    return [keyframeSteps.join("\n"), animationDurationMillis];
  }, [staticOffset, offsetPath]);

  const animationName = useKeyframeAnimation(keyframeBody);

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
          transform: `translate(${staticOffset
            .map((v) => `${roundPixel(v)}px`)
            .join(", ")})`,
          animationName,
          animationDuration: `${animationDurationMillis}ms`,
          animationFillMode: "forwards",
          animationTimingFunction: "linear",
        }}
      >
        {children}
      </div>
    </div>
  );
};
