import { Id } from "divetree-core";

export interface Focus {
  id: Id | undefined;
  progress: number; // from 0 (not focused) to 1 (focused)
}
