import * as React from "react";
import {
  Spring,
  createSpring,
  DrawRect,
  AnimationQueue,
  Node as DivetreeNode,
  Interpolator,
  LayoutConfig,
  doLayout,
  doLayoutAnimated,
  Id,
} from "divetree-core";
import { Rects, GetContent, GetStyle } from "./rects";
import { Focus } from "./interfaces";
import * as R from "ramda";

interface Props {
  expansionSpring?: Spring;
  focusSpring?: Spring;
  layoutConfig?: LayoutConfig;
  tree: DivetreeNode;
  focusedId: Id | undefined;
  getContent: GetContent;
  getStyle?: GetStyle;
}

interface State {
  rects: DrawRect[];
  offset: number[];
  offsetVelocity: number[];
  focusTarget: number[];
  focusId: Id | undefined;
  lastFocusTarget: number[];
  lastFocusId: Id | undefined;
  isFirstAnimate: boolean;
  didUnmount: boolean;
  lastT: number;
}

const DEFAULT_SPRING = createSpring({
  stepMillis: 5,
  precision: 0.01,
  stiffness: 260,
  damping: 24,
});

const DEFAULT_LAYOUT_CONFIG = {
  loose: {
    verticalPadding: 7,
    siblingDistance: 7,
    singleChildDistance: 20,
    multiChildDistance: 20,
  },
};

export class FocusedTree extends React.Component<Props, State> {
  static defaultProps: Partial<Props> = {
    expansionSpring: DEFAULT_SPRING,
    focusSpring: DEFAULT_SPRING,
    layoutConfig: DEFAULT_LAYOUT_CONFIG,
  };

  state: State = {
    rects: [],
    offset: [0, 0],
    offsetVelocity: [0, 0],
    focusTarget: [0, 0],
    focusId: undefined,
    lastFocusTarget: [0, 0],
    lastFocusId: undefined,
    isFirstAnimate: true,
    didUnmount: false,
    lastT: 0,
  };

  private queue!: AnimationQueue<DivetreeNode, Interpolator>;

  componentWillMount() {
    this.queue = new AnimationQueue(
      this.indirectSpring,
      this.indirectDoLayoutAnimated,
      this.props.tree,
    );

    this.tick(0);
    this.updateFocusTarget(this.props);
    window.requestAnimationFrame(this.animationCallback);
  }

  componentWillUnmount() {
    this.setState({ didUnmount: true });
  }

  // TODO re-queue on layout config change, otherwise it will be ignored
  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.tree !== this.props.tree) {
      this.queue.queueChange(nextProps.tree);
      this.updateFocusTarget(nextProps);
    } else if (nextProps.focusedId !== this.props.focusedId) {
      this.updateFocusTarget(nextProps);
    }
  }

  private animationCallback = (t: number) => {
    const { isFirstAnimate, lastT: _lastT, didUnmount } = this.state;
    const lastT = isFirstAnimate ? _lastT : t;
    this.tick(t - lastT);
    this.setState({ lastT: t });
    if (!didUnmount) {
      requestAnimationFrame(this.animationCallback);
    }
  };

  private tick(dtMillis: number) {
    const { progress, interval } = this.queue.tick(dtMillis);
    this.setState({ rects: interval(progress) });

    const { offset, offsetVelocity, focusTarget } = this.state;
    const springOutputs = focusTarget.map((e, i) =>
      this.props.focusSpring!({
        position: offset[i],
        velocity: offsetVelocity[i],
        dtMillis,
        target: -e,
      }),
    );
    this.setState({
      offset: springOutputs.map(e => e.position),
      offsetVelocity: springOutputs.map(e => e.velocity),
    });
  }

  private updateFocusTarget({ tree, layoutConfig, focusedId }: Props) {
    let targetRect;
    if (focusedId !== undefined) {
      targetRect = doLayout(tree, layoutConfig!).find(e => e.id === focusedId);
    }
    if (targetRect) {
      const { size } = targetRect;
      const center = targetRect.offset.map((e, i) => size[i] / 2 + e);
      this.setState({
        focusTarget: center,
        focusId: focusedId,
        lastFocusTarget: this.state.focusTarget,
        lastFocusId: this.state.focusId,
      });
    } else {
      this.setState({
        focusTarget: this.state.focusTarget,
        focusId: undefined,
        lastFocusTarget: this.state.focusTarget,
        lastFocusId: this.state.focusId,
      });
    }
  }

  private indirectSpring: Spring = args => {
    return this.props.expansionSpring!(args);
  };

  private indirectDoLayoutAnimated = (
    a: DivetreeNode,
    b: DivetreeNode,
  ): Interpolator => {
    return doLayoutAnimated(a, b, this.props.layoutConfig!);
  };

  private getFocuses(): Focus[] {
    const {
      focusId,
      lastFocusId,
      offset,
      focusTarget,
      lastFocusTarget,
    } = this.state;
    const getDistance = R.compose(
      Math.sqrt,
      R.sum,
      R.map((e: number) => e ** 2),
      R.zipWith<number, number, number>(R.subtract),
    );
    const totalDistance = getDistance(focusTarget, lastFocusTarget);
    const remainingDistance = getDistance(focusTarget, offset.map(R.negate));
    if (totalDistance === 0) {
      return [{ id: focusId, progress: 1 }];
    }
    return [
      { id: focusId, progress: totalDistance - remainingDistance },
      { id: lastFocusId, progress: remainingDistance },
    ].map(e => ({ ...e, progress: e.progress / totalDistance }));
  }

  render() {
    const { rects, offset } = this.state;
    return (
      <Rects
        offset={offset}
        rects={rects}
        focuses={this.getFocuses()}
        width={800}
        height={600}
        getContent={this.props.getContent}
        getStyle={this.props.getStyle}
      />
    );
  }
}
