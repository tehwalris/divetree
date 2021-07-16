export function unreachable(v: never): never {
  console.error("unreachable", v);
  throw new Error("unreachable");
}
