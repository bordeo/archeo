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

  global.ArcheoMru = { buildMruOrder, moveMruIndex, rememberTab };
})(globalThis);
