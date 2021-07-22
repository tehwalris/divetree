import { NodeKind, Split } from "./interfaces/input";
import { PublicOutputNode } from "./interfaces/output";
import { PureTightNode } from "./interfaces/working";
import { unreachable } from "./unreachable";

type SizeTree = {
  size: number[];
  children: SizeTree[];
};

export function layoutTight(node: PureTightNode): {
  layout: PublicOutputNode[];
  size: number[];
} {
  const minSizeTree = calculateMinSize(node);
  return {
    layout: layoutTightSplitToFill(node, minSizeTree, minSizeTree.size, [0, 0]),
    size: minSizeTree.size,
  };
}

function getAggregationPerDimension(split: Split): {
  maxDims: number[];
  sumDims: [] | [number];
} {
  switch (split) {
    case Split.Stacked:
      return {
        maxDims: [0],
        sumDims: [1],
      };
    case Split.SideBySide:
      return {
        maxDims: [1],
        sumDims: [0],
      };
    case Split.Overlaid:
      return {
        maxDims: [0, 1],
        sumDims: [],
      };
    default:
      return unreachable(split);
  }
}

function calculateMinSize(node: PureTightNode): SizeTree {
  if (node.kind === NodeKind.TightLeaf) {
    return { size: node.size, children: [] };
  }
  const childSizeTrees = node.children.map((c) => calculateMinSize(c));
  const { maxDims, sumDims } = getAggregationPerDimension(node.split);
  const combinedSize = [0, 0];
  for (const dim of maxDims) {
    combinedSize[dim] = childSizeTrees
      .map((c) => c.size[dim])
      .reduce((a, c) => Math.max(a, c), 0);
  }
  for (const dim of sumDims) {
    combinedSize[dim] = childSizeTrees
      .map((c) => c.size[dim])
      .reduce((a, c) => a + c, 0);
  }
  return { size: combinedSize, children: childSizeTrees };
}

function layoutTightSplitToFill(
  node: PureTightNode,
  minSizeTree: SizeTree,
  fillSize: number[],
  offset: number[],
): PublicOutputNode[] {
  if (node.kind === NodeKind.TightLeaf) {
    return [
      {
        id: node.id,
        visible: true,
        size: fillSize,
        offset,
      },
    ];
  }

  const { sumDims } = getAggregationPerDimension(node.split);
  if (sumDims.length === 0) {
    const out: PublicOutputNode[] = [];
    for (let i = 0; i < node.children.length; i++) {
      out.push(
        ...layoutTightSplitToFill(
          node.children[i],
          minSizeTree.children[i],
          fillSize,
          offset,
        ),
      );
    }
    return out;
  } else if (sumDims.length === 1) {
    const sumDim = sumDims[0];
    const extraTotalOnSumDim =
      fillSize[sumDim] -
      minSizeTree.children
        .map((c) => c.size[sumDim])
        .reduce((a, c) => a + c, 0);
    const usualExtraPerNodeOnSumDim = node.growLast
      ? 0
      : Math.floor(extraTotalOnSumDim / node.children.length);
    let currentOffset = offset;
    const out: PublicOutputNode[] = [];
    for (let i = 0; i < node.children.length; i++) {
      const childFillSize = [...fillSize];
      childFillSize[sumDim] = minSizeTree.children[i].size[sumDim];
      childFillSize[sumDim] += usualExtraPerNodeOnSumDim;
      if (i + 1 === node.children.length) {
        childFillSize[sumDim] +=
          extraTotalOnSumDim - usualExtraPerNodeOnSumDim * node.children.length;
      }
      out.push(
        ...layoutTightSplitToFill(
          node.children[i],
          minSizeTree.children[i],
          childFillSize,
          currentOffset,
        ),
      );
      currentOffset = [...currentOffset];
      currentOffset[sumDim] += childFillSize[sumDim];
    }
    return out;
  } else {
    throw new Error("only 0 or 1 sumDims are supported");
  }
}
