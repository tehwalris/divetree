/// <reference path="../typings/kiwi.js.d.ts" />

export * from "./interfaces/input";
export * from "./interfaces/output";

import { _convertAny } from "./tree-to-constraints";

export const convertAny = _convertAny;
