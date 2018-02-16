import * as React from "react";
import { doLayoutAnimated } from "divetree-core";
import { beforeTree, afterTree } from "./data";
import Slider from "rc-slider";

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

const output = doLayoutAnimated(beforeTree, afterTree, LAYOUT_CONFIG);

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
  state: {
    t: number;
  } = { t: 0 };

  onSliderChange = (t: number) => {
    this.setState({ t });
  };

  render() {
    const { t } = this.state;
    return (
      <div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          onChange={this.onSliderChange}
          value={t}
        />
        <div style={styles.treeWrapper}>
          {output(t).map(e => (
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
