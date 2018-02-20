import * as React from "react";
import {
  doLayoutAnimated,
  createSpring,
  AnimationQueue,
  DrawRect,
} from "divetree-core";
import { trees } from "./data";

const LAYOUT_CONFIG = {
  loose: {
    verticalPadding: 0,
    siblingDistance: 20,
    singleChildDistance: 20,
    multiChildDistance: 40,
  },
  tightSplit: {
    equalSize: false,
  },
};

const spring = createSpring({
  stepMillis: 5,
  precision: 0.01,
  stiffness: 260,
  damping: 24,
});

const styles: { [key: string]: React.CSSProperties } = {
  treeWrapper: {
    position: "relative",
  },
  rect: {
    position: "absolute",
    border: "1px solid black",
    boxSizing: "border-box",
    background: "wheat",
    overflow: "hidden",
  },
};

class App extends React.Component {
  private queue = new AnimationQueue(
    spring,
    (a, b) => doLayoutAnimated(a, b, LAYOUT_CONFIG),
    trees[0],
  );
  state: {
    rects: DrawRect[];
    isFirstAnimate: boolean;
    lastT: number;
    lastPushedIndex: number;
  } = { rects: [], isFirstAnimate: true, lastT: 0, lastPushedIndex: 0 };

  // TODO unmount
  componentWillMount() {
    this.tick(0);
    window.requestAnimationFrame(this.animationCallback);
    document.addEventListener("keydown", this.onKeyDown);
  }

  private animationCallback = (t: number) => {
    const lastT = this.state.isFirstAnimate ? this.state.lastT : t;
    this.tick(t - lastT);
    requestAnimationFrame(this.animationCallback);
    this.setState({ lastT: t });
  };

  private tick(dt: number) {
    const { progress, interval } = this.queue.tick(dt);
    this.setState({ rects: interval(progress) });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        this.switchView(-1);
        break;
      case "ArrowRight":
        this.switchView(1);
        break;
      default:
        break;
    }
  };

  private switchView(delta: number) {
    const nextIndex = this.state.lastPushedIndex + delta;
    if (nextIndex < 0 || nextIndex + 1 >= trees.length) {
      return;
    }
    this.queue.queueChange(trees[nextIndex]);
    this.setState({ lastPushedIndex: nextIndex });
  }

  render() {
    return (
      <div>
        <div style={styles.treeWrapper}>
          {this.state.rects.map(e => (
            <div
              key={e.id}
              style={{
                ...styles.rect,
                top: e.offset[1],
                left: e.offset[0],
                width: e.size[0],
                height: e.size[1],
                opacity: 1 - Math.abs(e.lifecycle),
                zIndex: 1 - Math.ceil(Math.abs(e.lifecycle)),
              }}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default App;
