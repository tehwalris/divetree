import {
  AnimationQueue,
  doLayout,
  doLayoutAnimated,
  DrawRectInterpolator,
  Id,
  LayoutCache,
  LayoutConfig,
  offsetRectsMayIntersect,
  RootNode as DivetreeNode,
  Spring,
  SpringPath,
  unionOffsetRects,
} from "divetree-core";
import * as React from "react";
import { GetContent, GetStyle, Rects } from "./rects";
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
  queueInterval: QueueInterval;
  queueProgressPath: SpringPath;
  focusTarget: number[];
  lastFocusTarget: number[];
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

interface QueuePoint {
  focusedId: Id | undefined;
  tree: DivetreeNode;
}

interface QueueInterval {
  focusedId: { a: Id | undefined; b: Id | undefined };
  rectInterpolators: DrawRectInterpolator[];
}

export class FocusedTree extends React.Component<Props, State> {
  static defaultProps: Partial<Props> = {
    expansionSpring: DEFAULT_SPRING,
    focusSpring: DEFAULT_SPRING,
    layoutConfig: DEFAULT_LAYOUT_CONFIG,
  };

  state: State = {
    queueInterval: {
      focusedId: { a: undefined, b: undefined },
      rectInterpolators: [],
    },
    queueProgressPath: new SpringPath([{ position: 2, velocity: 0 }], 5),
    focusTarget: [0, 0],
    lastFocusTarget: [0, 0],
    focusPath: [0, 1].map(
      () => new SpringPath([{ position: 0, velocity: 0 }], 5),
    ),
    focusPathStartedAt: 0,
    didUnmount: false,
  };

  private queueLastT = 0;
  private queueTimeoutHandle: number | undefined;
  private forceNextUpdate = true;
  private queue!: AnimationQueue<QueuePoint, QueueInterval>;
  private layoutCache = new LayoutCache();

  componentDidMount() {
    this.queue = new AnimationQueue(
      this.props.expansionSpring!,
      this.indirectDoLayoutAnimated,
      { focusedId: this.props.focusedId, tree: this.props.tree },
    );

    this.tickQueue();
    this.updateRectInterpolatorProgressPath(true);
    this.updateFocusTarget(this.props);
  }

  componentWillUnmount() {
    clearTimeout(this.queueTimeoutHandle);
    this.setState({ didUnmount: true });
  }

  // TODO re-queue on layout config change, otherwise it will be ignored
  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.tree !== this.props.tree ||
      nextProps.focusedId !== this.props.focusedId
    ) {
      const didChange = this.tickQueue();
      this.queue.queueChange({
        focusedId: nextProps.focusedId,
        tree: nextProps.tree,
      });
      this.updateRectInterpolatorProgressPath(didChange);
      this.updateFocusTarget(nextProps);
    }
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
      return focusPath;
    };

    if (targetRect) {
      const { size } = targetRect;
      const center = targetRect.offset.map((e, i) => size[i] / 2 + e);
      this.setState({
        focusTarget: center,
        lastFocusTarget: this.state.focusTarget,
        focusPath: calculateFocusPath(center),
        focusPathStartedAt: window.performance.now(),
      });
    } else {
      this.setState({
        focusTarget: this.state.focusTarget,
        lastFocusTarget: this.state.focusTarget,
        focusPath: calculateFocusPath(this.state.focusTarget),
        focusPathStartedAt: window.performance.now(),
      });
    }
  }

  private tickQueue(): boolean {
    const t = window.performance.now();
    const dt = t - this.queueLastT;
    this.queueLastT = t;
    const { didChange } = this.queue.tick(dt);
    return didChange;
  }

  private updateRectInterpolatorProgressPath(didChange: boolean) {
    const { interval, progressPath, willChange } = this.queue.calculatePath();
    console.log(
      "DEBUG rectInterpolatorProgressPath",
      progressPath.getDurationMillis(),
      willChange,
      didChange,
    );
    if (willChange || didChange || this.forceNextUpdate) {
      this.setState({
        queueInterval: interval,
        queueProgressPath: progressPath,
      });
      this.forceNextUpdate = false;
      clearTimeout(this.queueTimeoutHandle);
      this.queueTimeoutHandle = setTimeout(
        () => this.updateRectInterpolatorProgressPath(this.tickQueue()),
        progressPath.getDurationMillis(),
      );
    }
  }

  private indirectDoLayoutAnimated = (
    a: QueuePoint,
    b: QueuePoint,
  ): QueueInterval => {
    return {
      focusedId: { a: a.focusedId, b: b.focusedId },
      rectInterpolators: doLayoutAnimated(
        a.tree,
        b.tree,
        this.props.layoutConfig!,
        this.layoutCache,
      ),
    };
  };

  render() {
    const {
      queueInterval,
      queueProgressPath,
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

    const possiblyVisibleRectInterpolators =
      queueInterval.rectInterpolators.filter(
        (interpolator) =>
          !interpolator.transitionBound ||
          offsetRectsMayIntersect(
            interpolator.transitionBound,
            viewportTransitionBound,
          ),
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
          rectInterpolators={possiblyVisibleRectInterpolators}
          oldFocusId={queueInterval.focusedId.a}
          newFocusId={queueInterval.focusedId.b}
          getContent={this.props.getContent}
          getStyle={this.props.getStyle}
          progressPath={queueProgressPath}
        />
      </Viewport>
    );
  }
}
