const assert = require("node:assert/strict");

require("../mru.js");
const {
  buildMruOrder,
  buildSwitcherEntries,
  moveMruIndex,
  rememberTab
} = globalThis.ArcheoMru;

const tabs = [
  { id: 10, lastAccessed: 100 },
  { id: 20, lastAccessed: 300 },
  { id: 30, lastAccessed: 200 }
];

assert.deepEqual(
  buildMruOrder(20, tabs, [20, 30, 10]),
  [20, 30, 10],
  "keeps the active tab first and preserves remembered recency"
);

assert.deepEqual(
  buildMruOrder(10, tabs, [99, 30]),
  [10, 30, 20],
  "drops closed tabs and fills missing history by lastAccessed"
);

assert.deepEqual(
  buildMruOrder(30, tabs, [20, 20, 10]),
  [30, 20, 10],
  "deduplicates remembered tabs"
);

assert.equal(moveMruIndex(0, 4, 1), 1, "moves forward from the active tab");
assert.equal(moveMruIndex(0, 4, -1), 3, "first backward move selects least recent");
assert.equal(moveMruIndex(3, 4, 1), 0, "wraps forward to the active tab");
assert.equal(moveMruIndex(2, 4, -1), 1, "continues backward through the list");

assert.deepEqual(
  rememberTab(40, [20, 30, 10]),
  [40, 20, 30, 10],
  "records a newly created background tab as the newest candidate"
);

assert.deepEqual(
  buildMruOrder(
    20,
    [...tabs, { id: 40, lastAccessed: 0 }],
    rememberTab(40, [20, 30, 10])
  ),
  [20, 40, 30, 10],
  "places a newly created background tab directly after the active tab"
);

assert.deepEqual(
  buildMruOrder(
    10,
    [
      { id: 10 },
      { id: 20 },
      { id: 30 },
      { id: 40 },
      { id: 50 },
      { id: 60 },
      { id: 70 }
    ],
    [10, 20, 30, 40, 50, 60, 70],
    5
  ),
  [10, 20, 30, 40, 50],
  "limits cycling to the five most-recent tabs"
);

const splitTabs = [
  { id: 10, splitViewId: -1 },
  { id: 20, splitViewId: 7 },
  { id: 30, splitViewId: -1 },
  { id: 40, splitViewId: 7 }
];
const splitEntries = buildSwitcherEntries(
  10,
  splitTabs,
  [10, 20, 30, 40],
  10
);

assert.deepEqual(
  splitEntries.map((entry) => ({
    targetId: entry.targetId,
    tabIds: entry.tabs.map((tab) => tab.id)
  })),
  [
    { targetId: 10, tabIds: [10] },
    { targetId: 20, tabIds: [20, 40] },
    { targetId: 30, tabIds: [30] }
  ],
  "collapses tabs from the same split view into one switcher entry"
);

assert.deepEqual(
  buildSwitcherEntries(40, splitTabs, [10, 20, 30, 40], 10)[0].tabs.map((tab) => tab.id),
  [40, 20],
  "keeps the active pane as the split card activation target"
);

const manyTabs = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
assert.equal(
  buildSwitcherEntries(1, manyTabs, manyTabs.map((tab) => tab.id), 10).length,
  10,
  "limits the rail to ten cards"
);

const splitBeyondLimit = Array.from({ length: 11 }, (_, index) => ({
  id: index + 1,
  splitViewId: index === 1 || index === 10 ? 9 : -1
}));
assert.deepEqual(
  buildSwitcherEntries(1, splitBeyondLimit, splitBeyondLimit.map((tab) => tab.id), 10)
    .find((entry) => entry.targetId === 2)
    .tabs
    .map((tab) => tab.id),
  [2, 11],
  "keeps every pane when a split partner falls beyond the card limit"
);

console.log("MRU ordering tests passed");
