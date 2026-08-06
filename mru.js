(function exposeMru(global) {
  function buildMruOrder(activeTabId, tabs, rememberedIds, limit = Infinity) {
    const openTabs = tabs.filter((tab) => Number.isInteger(tab.id));
    const openIds = new Set(openTabs.map((tab) => tab.id));
    const remembered = rememberedIds.filter((id) => openIds.has(id));
    const fallback = openTabs
      .slice()
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
      .map((tab) => tab.id);

    return [...new Set([
      activeTabId,
      ...remembered.filter((id) => id !== activeTabId),
      ...fallback.filter((id) => id !== activeTabId)
    ])].slice(0, Math.max(0, limit));
  }

  function moveMruIndex(index, length, direction) {
    if (length <= 0) return 0;
    const step = direction < 0 ? -1 : 1;
    return (index + step + length) % length;
  }

  function rememberTab(tabId, rememberedIds) {
    return [tabId, ...rememberedIds.filter((id) => id !== tabId)];
  }

  function buildSwitcherEntries(activeTabId, tabs, rememberedIds, limit = Infinity) {
    const tabsById = new Map(
      tabs.filter((tab) => Number.isInteger(tab.id)).map((tab) => [tab.id, tab])
    );
    const order = buildMruOrder(activeTabId, tabs, rememberedIds);
    const entries = [];
    const entriesBySplitViewId = new Map();
    const maximum = Math.max(0, limit);

    for (const tabId of order) {
      const tab = tabsById.get(tabId);
      if (!tab) continue;

      const splitViewId = Number.isInteger(tab.splitViewId) && tab.splitViewId >= 0
        ? tab.splitViewId
        : null;
      const splitEntry = splitViewId === null
        ? undefined
        : entriesBySplitViewId.get(splitViewId);

      if (splitEntry) {
        splitEntry.tabs.push(tab);
        continue;
      }

      if (entries.length >= maximum) continue;

      const entry = { targetId: tab.id, tabs: [tab] };
      entries.push(entry);
      if (splitViewId !== null) entriesBySplitViewId.set(splitViewId, entry);
    }

    return entries;
  }

  global.ArcheoMru = {
    buildMruOrder,
    buildSwitcherEntries,
    moveMruIndex,
    rememberTab
  };
})(globalThis);
