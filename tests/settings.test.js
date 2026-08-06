const assert = require("node:assert/strict");

require("../settings.js");
const { normalizeSwitcherLimit } = globalThis.ArcheoSettings;

assert.equal(normalizeSwitcherLimit(undefined), 10, "defaults to ten cards");
assert.equal(normalizeSwitcherLimit("7"), 7, "accepts a configured card count");
assert.equal(normalizeSwitcherLimit(20), 10, "caps the rail at ten cards");
assert.equal(normalizeSwitcherLimit(1), 2, "keeps enough cards for tab switching");

console.log("Switcher settings tests passed");
