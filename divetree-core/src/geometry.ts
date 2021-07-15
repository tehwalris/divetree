interface OffsetRect {
  size: number[];
  offset: number[];
}

export function unionOffsetRects(rects: OffsetRect[]): OffsetRect {
  const size = [];
  const offset = [];
  for (let dim = 0; dim < rects[0].offset.length; dim++) {
    const values = [];
    for (const rect of rects) {
      values.push(rect.offset[dim], rect.offset[dim] + rect.size[dim]);
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    size.push(max - min);
    offset.push(min);
  }
  return { size, offset };
}

// offsetRectsMayIntersect will return false only
// if there is no way the two given rectangles can
// not possibly be intersecting. A very coarse
// heuristic is used.
export function offsetRectsMayIntersect(a: OffsetRect, b: OffsetRect): boolean {
  const centerDist = vectorLength(subtractVectors(getCenter(a), getCenter(b)));
  const boundingCircleRadiuses = [a, b].map(
    (rect) => vectorLength(rect.size) / 2,
  );
  return centerDist <= boundingCircleRadiuses.reduce((a, c) => a + c);
}

export function getCenter(rect: OffsetRect): number[] {
  return [rect.offset[0] + rect.size[0] / 2, rect.offset[1] + rect.size[1] / 2];
}

export function subtractVectors(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

export function vectorLength(vec: number[]): number {
  return Math.sqrt(vec.map((v) => v ** 2).reduce((a, c) => a + c));
}
