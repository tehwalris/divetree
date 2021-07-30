import * as React from "react";
import {
  Spring,
  DrawRect,
  AnimationQueue,
  RootNode as DivetreeNode,
  DrawRectInterpolator,
  LayoutConfig,
  doLayout,
  doLayoutAnimated,
  Id,
  unionOffsetRects,
  offsetRectsMayIntersect,
  LayoutCache,
  drawRectFromInterpolator,
} from "divetree-core";
import { Rects, GetContent, GetStyle } from "./rects";
import { Focus } from "./interfaces";
import * as R from "ramda";
import { Viewport } from "./viewport";

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
  didUnmount: boolean;
}

const DEFAULT_SPRING = new Spring({
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
    didUnmount: false,
  };

  private lastT = 0;
  private forceNextUpdate = true;
  private queue!: AnimationQueue<DivetreeNode, DrawRectInterpolator[]>;
  private layoutCache = new LayoutCache();

  componentDidMount() {
    this.queue = new AnimationQueue(
      this.props.expansionSpring!,
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
  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (nextProps.tree !== this.props.tree) {
      this.queue.queueChange(nextProps.tree);
      this.updateFocusTarget(nextProps);
    } else if (nextProps.focusedId !== this.props.focusedId) {
      this.updateFocusTarget(nextProps);
    }
  }

  private animationCallback = (t: number) => {
    const { didUnmount } = this.state;
    this.tick(t - this.lastT);
    this.lastT = t;
    if (!didUnmount) {
      requestAnimationFrame(this.animationCallback);
    }
  };

  private tick(dtMillis: number) {
    const {
      progress,
      interval,
      didChange: queueDidChange,
    } = this.queue.tick(dtMillis);
    if (queueDidChange || this.forceNextUpdate) {
      this.setState({
        rects: interval.map((interpolator) =>
          drawRectFromInterpolator(interpolator, progress),
        ),
      });
    }

    const { offset, offsetVelocity, focusTarget } = this.state;
    const focusWillChange = !focusTarget.every(
      (e, i) => offset[i] === -e && offsetVelocity[i] === 0,
    );
    if (focusWillChange || this.forceNextUpdate) {
      const springOutputs = focusTarget.map((e, i) =>
        this.props.focusSpring!.calculateResult({
          position: offset[i],
          velocity: offsetVelocity[i],
          dtMillis,
          target: -e,
        }),
      );
      this.setState({
        offset: springOutputs.map((e) => e.position),
        offsetVelocity: springOutputs.map((e) => e.velocity),
      });
    }

    this.forceNextUpdate = false;
  }

  private updateFocusTarget({ tree, layoutConfig, focusedId }: Props) {
    this.forceNextUpdate = true;
    let targetRect;
    if (focusedId !== undefined) {
      targetRect = doLayout(tree, layoutConfig!, this.layoutCache).find(
        (e) => e.id === focusedId,
      );
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

  private indirectDoLayoutAnimated = (
    a: DivetreeNode,
    b: DivetreeNode,
  ): DrawRectInterpolator[] => {
    return doLayoutAnimated(a, b, this.props.layoutConfig!, this.layoutCache);
  };

  private getFocuses(): Focus[] {
    const { focusId, lastFocusId, offset, focusTarget, lastFocusTarget } =
      this.state;
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
    ].map((e) => ({ ...e, progress: e.progress / totalDistance }));
  }

  render() {
    const { rects, offset, focusTarget, lastFocusTarget } = this.state;
    const viewport = { width: 1000, height: 650 };
    const viewportTransitionBound = unionOffsetRects(
      [focusTarget, lastFocusTarget].map((target) => ({
        size: [viewport.width, viewport.height],
        offset: [
          target[0] - viewport.width / 3,
          target[1] - viewport.height / 3,
        ],
      })),
    );
    const possiblyVisibleRects = rects.filter(
      (rect) =>
        !rect.transitionBound ||
        offsetRectsMayIntersect(rect.transitionBound, viewportTransitionBound),
    );
    console.log("DEBUG FocusedTree.render");
    return (
      <Viewport
        width={viewport.width}
        height={viewport.height}
        offset={[
          offset[0] + viewport.width / 3,
          offset[1] + viewport.height / 3,
        ]}
      >
        <Rects
          rects={possiblyVisibleRects}
          focuses={this.getFocuses()}
          getContent={this.props.getContent}
          getStyle={this.props.getStyle}
        />
      </Viewport>
    );
  }
}
