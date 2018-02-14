import "jest";
import * as R from "ramda";
import { Node, LooseNode, NodeKind, Split } from "../interfaces/input";
import {
  AnimationKind,
  planAnimation,
  AnimationGroup,
} from "../plan-animation";

describe("planAnimation", () => {
  const templatedTest = (template: string) => () => {
    const testCase = parseCase(template);
    const sort = (l: number[]) => R.sort((a, b) => a - b, l);
    const actual = planAnimation(testCase.trees.before, testCase.trees.after);
    const actualSorted = actual.map(e => ({
      ...e,
      content: sort(e.content as number[]),
    }));
    expect(actual.length).toBe(testCase.assert.length);
    testCase.assert.forEach(assertion => {
      const expectedGroup: AnimationGroup = R.evolve(
        { content: sort },
        assertion,
      );
      expect(actualSorted).toContainEqual(expectedGroup);
    });
  };

  test(
    "simple example",
    templatedTest(`
L1      |L1
 S      | S
  T2    |  T2
  T3    |  T3
        |  T4
  T5    |
2 3
1 <- 4
1 -> 5`),
  );

  test(
    "no change",
    templatedTest(`
L1     |L1
 S     | S
  T2   |  T2
  T3   |  T3
 L4    | L4
  T5   |  T5
  T6   |  T6
  T7   |  T7
2 3 5 6 7`),
  );

  test(
    "type of node changes (across levels)",
    templatedTest(`
L1  |L2
 T2 | T1
1 -> 2
2 <- 1`),
  );

  test(
    "type of node changes (parent node)",
    templatedTest(`
S   |L3
 T1 | T1
 T2 | T2
1 2`),
  );

  test(
    "children reordered",
    templatedTest(`
S    |S
  T2 | T3
  T1 | T2
  T3 | T1
1 2 3`),
  );

  test(
    "children leave/enter with split root",
    templatedTest(`
S    |S
 T1  | T2
 T3  | T3
3
0 -> 1
0 <- 2`),
  );

  test(
    "children change parent",
    templatedTest(`
S     |S
 L1   | L1
  T3  |  T4
 L2   | L2
  T4  |  T3
3 4`),
  );

  test(
    "loose nodes can't leave/enter",
    templatedTest(`
S     |S
 L1   | L2`),
  );

  test(
    "reordering in deep splits",
    templatedTest(`
S     |S
 T1   | T2
 S    | S
  T2  |  T3
  T3  |  T4
      |  T1
 S    |
  T4  |
1 2 3 4`),
  );

  test(
    "flattening splits",
    templatedTest(`
S     |S
 T1   | T1
 S    |
  T2  | T2
  S   |
   T3 | T3
1 2 3`),
  );

  test(
    "move between LooseNode parent and children fields",
    templatedTest(`
L1    |L1
 T2   | T3
 T3   | T2
2 3`),
  );

  test(
    "move between LooseNode parent and children fields (with splits)",
    templatedTest(`
L1    |L1
 S    | S
  T2  |  T3
  T3  |  T4
 S    | S
  T4  |  T2
2 3 4`),
  );

  describe("meta", () => {
    test("parse tree", () => {
      const input = `
L4
 S
  T2

  S
   T1
 T5
      `;
      const expected: NodeTemplate = {
        id: 4,
        kind: "L",
        children: [
          {
            id: 0,
            kind: "S",
            children: [
              {
                id: 2,
                kind: "T",
                children: [],
              },
              {
                id: 0,
                kind: "S",
                children: [
                  {
                    id: 1,
                    kind: "T",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: 5,
            kind: "T",
            children: [],
          },
        ],
      };
      expect(parseTree(input.split("\n"))).toEqual(expected);
    });
  });
});

interface Case {
  title: string;
  trees: TreePair;
  assert: GroupAssertion[];
}

interface TreePair {
  before: Node;
  after: Node;
}

interface NodeTemplate {
  id: number;
  kind: "L" | "S" | "T";
  children: NodeTemplate[];
}

function parseCase(raw: string): Case {
  const r: any = R;
  return r.pipe(
    r.split("\n"),
    r.filter(r.trim),
    r.partition(r.contains("|")),
    r.zipObj(["trees", "assert"]),
    r.evolve({
      trees: r.compose(r.map(nodeFromTemplate), parseTreePair),
      assert: r.map(parseAssertion),
    }),
  )(raw);
}

function parseTreePair(raw: string[]): TreePair {
  const r: any = R;
  return r.pipe(
    r.map(r.split("|")),
    r.transpose,
    r.map(parseTree),
    r.zipObj(["before", "after"]),
  )(raw);
}

function parseTree(raw: string[]): NodeTemplate {
  let last: NodeTemplate | undefined;
  let roots: NodeTemplate[] = [];
  let parents: NodeTemplate[] = [];
  raw.filter(R.trim).forEach(e => {
    const [_line, indentStr, kind, idStr] = e.match(
      /^( *)([LST])([1-9]\d*)? *$/,
    );
    const cur = { id: +(idStr || ""), kind: kind as any, children: [] };
    const indent = indentStr.length;
    if (indent === parents.length + 1) {
      parents.push(last);
    } else if (indent < parents.length) {
      parents = parents.slice(0, indent);
    } else if (indent !== parents.length) {
      throw new Error("indent can't increase by more than 1");
    }
    if (indent) {
      R.last(parents).children.push(cur);
    } else {
      roots.push(cur);
    }
    last = cur;
  });
  if (roots.length !== 1) {
    throw new Error("must have exactly one root");
  }
  return roots[0];
}

function nodeFromTemplate(t: NodeTemplate): Node {
  if ((t.id === 0) !== (t.kind === "S")) {
    throw new Error("only S-nodes can (and must) omit ID");
  }
  switch (t.kind) {
    case "S": {
      return {
        kind: NodeKind.TightSplit,
        split: Split.SideBySide,
        children: t.children.map(e => {
          const convertedChild = nodeFromTemplate(e);
          if (convertedChild.kind === NodeKind.Loose) {
            throw new Error("TightSplitNode must have TightNode children");
          }
          return convertedChild;
        }),
      };
    }
    case "T": {
      if (t.children.length) {
        throw new Error("TightLeafNode can't have children");
      }
      return {
        kind: NodeKind.TightLeaf,
        id: t.id,
        size: [0, 0],
      };
    }
    case "L": {
      if (!t.children.length) {
        throw new Error("missing parent in LooseNode");
      }
      const parent = nodeFromTemplate(t.children[0]);
      if (parent.kind === NodeKind.Loose) {
        throw new Error("LooseNode can't have LooseNode parent");
      }
      return {
        kind: NodeKind.Loose,
        id: t.id,
        parent: parent,
        children: R.tail(t.children).map(nodeFromTemplate),
      };
    }
  }
}

function parseAssertion(s: string): AnimationGroup {
  const enterLeaveMatch = s.match(/^(?:(\d+) (<-|->) )(\d+(?: \d+)*)*$/);
  const strToList = (s: string) => s.split(" ").map(e => +e);
  if (enterLeaveMatch) {
    const [_line, parentStr, arrow, childrenStr] = enterLeaveMatch;
    let parent = +parentStr;
    if (parent === 0) {
      parent = undefined;
    }
    return {
      kind: arrow === "->" ? AnimationKind.Leave : AnimationKind.Enter,
      parent,
      content: strToList(childrenStr),
    };
  }
  if (!s.match(/^[0-9 ]*$/)) {
    throw new Error("invalid assertion line");
  }
  return {
    kind: AnimationKind.Transform,
    content: strToList(s),
  };
}
