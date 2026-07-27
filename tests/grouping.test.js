const assert = require("node:assert/strict");

require("../grouping.js");
const { groupAdjacentItems } = globalThis.ArcheoGrouping;

const items = [
  { id: 1, groupId: 10, groupTitle: "Work", groupColor: "blue" },
  { id: 2, groupId: 10, groupTitle: "Work", groupColor: "blue" },
  { id: 3, groupId: -1 },
  { id: 4, groupId: -1 },
  { id: 5, groupId: 10, groupTitle: "Work", groupColor: "blue" },
  { id: 6, groupId: 20, groupTitle: "Read", groupColor: "green" },
  { id: 7, groupId: 20, groupTitle: "Read", groupColor: "green" }
];

const segments = groupAdjacentItems(items);

assert.deepEqual(
  segments.map((segment) => segment.items.map((item) => item.id)),
  [[1, 2], [3], [4], [5], [6, 7]],
  "collapses only adjacent tabs belonging to the same group"
);
assert.deepEqual(
  segments.map(({ groupId, groupTitle, groupColor }) => ({
    groupId,
    groupTitle,
    groupColor
  })),
  [
    { groupId: 10, groupTitle: "Work", groupColor: "blue" },
    { groupId: null, groupTitle: "Tab group", groupColor: "grey" },
    { groupId: null, groupTitle: "Tab group", groupColor: "grey" },
    { groupId: 10, groupTitle: "Work", groupColor: "blue" },
    { groupId: 20, groupTitle: "Read", groupColor: "green" }
  ],
  "preserves group labels and colors"
);

console.log("Adjacent tab grouping tests passed");
