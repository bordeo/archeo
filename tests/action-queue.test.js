const assert = require("node:assert/strict");

require("../action-queue.js");
const { createActionQueue } = globalThis.ArcheoActionQueue;

async function run() {
  const enqueue = createActionQueue();
  const order = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = enqueue(async () => {
    order.push("switch-start");
    await firstGate;
    order.push("switch-finish");
  });
  const second = enqueue(() => order.push("commit"));

  await Promise.resolve();
  assert.deepEqual(order, ["switch-start"], "waits for an in-flight switch");

  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(
    order,
    ["switch-start", "switch-finish", "commit"],
    "runs the release commit after the switch session exists"
  );

  await assert.rejects(enqueue(() => Promise.reject(new Error("expected"))));
  await enqueue(() => order.push("recovered"));
  assert.equal(order.at(-1), "recovered", "continues after a failed action");

  console.log("Switcher action queue tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
