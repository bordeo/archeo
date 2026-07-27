(function exposeGrouping(global) {
  function groupAdjacentItems(items) {
    const segments = [];

    for (const item of items) {
      const groupId = Number.isInteger(item.groupId) && item.groupId >= 0
        ? item.groupId
        : null;
      const previous = segments.at(-1);

      if (groupId !== null && previous?.groupId === groupId) {
        previous.items.push(item);
        continue;
      }

      segments.push({
        groupId,
        groupTitle: item.groupTitle || "Tab group",
        groupColor: item.groupColor || "grey",
        items: [item]
      });
    }

    return segments;
  }

  global.ArcheoGrouping = { groupAdjacentItems };
})(globalThis);
