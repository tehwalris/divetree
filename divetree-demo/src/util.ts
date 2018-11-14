export function unreachable(v: never): never {
  // tslint:disable-next-line:no-console
  console.error("unreachable", v);
  throw new Error("unreachable");
}
