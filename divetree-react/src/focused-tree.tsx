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
import { SpringPath } from "../../divetree-core/lib/spring";

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
  rectInterpolators: DrawRectInterpolator[];
  rectInterpolatorProgress: number;
  focusTarget: number[];
  focusId: Id | undefined;
  lastFocusTarget: number[];
  lastFocusId: Id | undefined;
  focusPath: SpringPath[];
  focusPathStartedAt: number;
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
    rectInterpolators: [],
    rectInterpolatorProgress: 0,
    focusTarget: [0, 0],
    focusId: undefined,
    lastFocusTarget: [0, 0],
    lastFocusId: undefined,
    focusPath: [0, 1].map(
      () => new SpringPath([{ position: 0, velocity: 0 }], 5),
    ),
    focusPathStartedAt: 0,
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
        rectInterpolatorProgress: progress,
        rectInterpolators: interval,
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

    const calculateFocusPath = (target: number[]): SpringPath[] => {
      const {
        focusPath: oldFocusPath,
        focusPathStartedAt: oldFocusPathStartedAt,
      } = this.state;
      const focusPath = target.map((e, i) => {
        const { result: oldResult } = oldFocusPath[i].getResult(
          window.performance.now() - oldFocusPathStartedAt,
        );
        return this.props.focusSpring!.calculatePath({
          position: oldResult.position,
          velocity: oldResult.velocity,
          dtMillis: Infinity,
          target: -e,
        });
      });
      console.log("DEBUG focusPath", focusPath);
      return focusPath;
    };

    if (targetRect) {
      const { size } = targetRect;
      const center = targetRect.offset.map((e, i) => size[i] / 2 + e);
      this.setState({
        focusTarget: center,
        focusId: focusedId,
        lastFocusTarget: this.state.focusTarget,
        lastFocusId: this.state.focusId,
        focusPath: calculateFocusPath(center),
        focusPathStartedAt: window.performance.now(),
      });
    } else {
      this.setState({
        focusTarget: this.state.focusTarget,
        focusId: undefined,
        lastFocusTarget: this.state.focusTarget,
        lastFocusId: this.state.focusId,
        focusPath: calculateFocusPath(this.state.focusTarget),
        focusPathStartedAt: window.performance.now(),
      });
    }
  }

  private indirectDoLayoutAnimated = (
    a: DivetreeNode,
    b: DivetreeNode,
  ): DrawRectInterpolator[] => {
    return doLayoutAnimated(a, b, this.props.layoutConfig!, this.layoutCache);
  };

  private getOffset(): number[] {
    const { focusPath, focusPathStartedAt } = this.state;
    let endOfAnimation = true;
    const offset = focusPath.map((p) => {
      const { result, endOfPath } = p.getResult(
        window.performance.now() - focusPathStartedAt,
      );
      if (!endOfPath) {
        endOfAnimation = false;
      }
      return result.position;
    });
    if (!endOfAnimation) {
      this.forceNextUpdate = true;
    }
    return offset;
  }

  private getFocuses(): Focus[] {
    const { focusId, lastFocusId, focusTarget, lastFocusTarget } = this.state;
    const offset = this.getOffset();
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
    const {
      rectInterpolators,
      rectInterpolatorProgress,
      focusTarget,
      lastFocusTarget,
      focusPath,
    } = this.state;

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

    const possiblyVisibleRectInterpolators = rectInterpolators.filter(
      (interpolator) =>
        !interpolator.transitionBound ||
        offsetRectsMayIntersect(
          interpolator.transitionBound,
          viewportTransitionBound,
        ),
    );
    const possiblyVisibleRects = possiblyVisibleRectInterpolators.map(
      (interpolator) =>
        drawRectFromInterpolator(interpolator, rectInterpolatorProgress),
    );

    console.log("DEBUG FocusedTree.render");
    return (
      <Viewport
        width={viewport.width}
        height={viewport.height}
        staticOffset={[viewport.width / 3, viewport.height / 3]}
        offsetPath={focusPath}
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
