const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const listeners = new Map();
const dispatched = [];

const window = {
  addEventListener(type, listener) {
    const handlers = listeners.get(type) || [];
    handlers.push(listener);
    listeners.set(type, handlers);
  },
  dispatchEvent(event) {
    dispatched.push(event.type);
  }
};

class Event {
  constructor(type) {
    this.type = type;
  }
}

const context = vm.createContext({ window, Event });
context.globalThis = context;
vm.runInContext(fs.readFileSync("key-observer.js", "utf8"), context);

for (const listener of listeners.get("keyup")) listener({ key: "Tab" });
assert.deepEqual(dispatched, [], "ignores unrelated key releases");

for (const listener of listeners.get("keyup")) listener({ key: "Control" });
assert.deepEqual(
  dispatched,
  ["__archeo_control_released__"],
  "signals when Control is released"
);

for (const listener of listeners.get("blur")) listener();
assert.deepEqual(
  dispatched,
  ["__archeo_control_released__", "__archeo_control_released__"],
  "also signals when the page loses focus"
);

console.log("Control release observer tests passed");
