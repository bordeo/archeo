(function exposeActionQueue(global) {
  function createActionQueue() {
    let tail = Promise.resolve();

    return function enqueue(action) {
      const result = tail.then(action, action);
      tail = result.catch(() => {});
      return result;
    };
  }

  global.ArcheoActionQueue = { createActionQueue };
})(globalThis);
