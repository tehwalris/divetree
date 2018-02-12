import { Id } from "./input";

export interface OutputNode {
  id: Id | undefined;
  size: number[];
  offset: number[];
}
