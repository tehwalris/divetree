import { NodeKind, Split } from "./interfaces/input";
import { PublicOutputNode } from "./interfaces/output";
import { PureTightNode } from "./interfaces/working";

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

function getAggregationPerDimension(split: Split) {
  return split === Split.Stacked
    ? {
        maxDim: 0,
        sumDim: 1,
      }
    : {
        maxDim: 1,
        sumDim: 0,
      };
}

function calculateMinSize(node: PureTightNode): SizeTree {
  if (node.kind === NodeKind.TightLeaf) {
    return { size: node.size, children: [] };
  }
  const childSizeTrees = node.children.map((c) => calculateMinSize(c));
  const { maxDim, sumDim } = getAggregationPerDimension(node.split);
  const combinedSize = [0, 0];
  combinedSize[maxDim] = childSizeTrees
    .map((c) => c.size[maxDim])
    .reduce((a, c) => Math.max(a, c), 0);
  combinedSize[sumDim] = childSizeTrees
    .map((c) => c.size[sumDim])
    .reduce((a, c) => a + c, 0);
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
  const { sumDim } = getAggregationPerDimension(node.split);
  const extraTotalOnSumDim =
    fillSize[sumDim] -
    minSizeTree.children.map((c) => c.size[sumDim]).reduce((a, c) => a + c, 0);
  const usualExtraPerNodeOnSumDim = node.growLast
    ? 0
    : Math.floor(extraTotalOnSumDim / node.children.length);
  let currentOffset = offset;
  const out = [];
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
}
