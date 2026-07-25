const assert = require("node:assert/strict");

require("../mru.js");
const { buildMruOrder } = globalThis.ArcheoMru;

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

console.log("MRU ordering tests passed");
