const DPR = window.devicePixelRatio;
const DPRI = 1 / DPR;

// Round to actual display pixels
export function roundPixel(v: number): number {
  return Math.round(v * DPR) * DPRI;
}
