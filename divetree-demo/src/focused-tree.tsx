import * as React from "react";
import {
  Spring,
  createSpring,
  DrawRect,
  AnimationQueue,
  LooseNode,
  Interpolator,
  LayoutConfig,
  doLayout,
  doLayoutAnimated,
  Id,
} from "divetree-core";
import { Rects } from "./rects";

interface Props {
  expansionSpring?: Spring;
  focusSpring?: Spring;
  layoutConfig?: LayoutConfig;
  tree: LooseNode;
  focusedId: Id | undefined;
}

const DEFAULT_SPRING = createSpring({
  stepMillis: 5,
  precision: 0.01,
  stiffness: 260,
  damping: 24,
});

const DEFAULT_LAYOUT_CONFIG = {
  loose: {
    verticalPadding: 0,
    siblingDistance: 20,
    singleChildDistance: 20,
    multiChildDistance: 40,
  },
};

export class FocusedTree extends React.Component<Props> {
  public static defaultProps: Partial<Props> = {
    expansionSpring: DEFAULT_SPRING,
    focusSpring: DEFAULT_SPRING,
    layoutConfig: DEFAULT_LAYOUT_CONFIG,
  };

  public state: {
    rects: DrawRect[];
    offset: number[];
    offsetVelocity: number[];
    focusTarget: number[];
    isFirstAnimate: boolean;
    didUnmount: boolean;
    lastT: number;
  } = {
    rects: [],
    offset: [0, 0],
    offsetVelocity: [0, 0],
    focusTarget: [0, 0],
    isFirstAnimate: true,
    didUnmount: false,
    lastT: 0,
  };

  private queue: AnimationQueue<LooseNode, Interpolator>;

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
      this.setState({ focusTarget: center });
    }
  }

  private indirectSpring: Spring = args => {
    return this.props.expansionSpring!(args);
  };

  private indirectDoLayoutAnimated = (
    a: LooseNode,
    b: LooseNode,
  ): Interpolator => {
    return doLayoutAnimated(a, b, this.props.layoutConfig!);
  };

  render() {
    const { rects, offset } = this.state;
    return <Rects offset={offset} rects={rects} width={500} height={500} />;
  }
}
