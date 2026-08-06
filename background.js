importScripts("mru.js", "action-queue.js", "settings.js");

const { buildSwitcherEntries, moveMruIndex, rememberTab } = globalThis.ArcheoMru;
const { createActionQueue } = globalThis.ArcheoActionQueue;
const { normalizeSwitcherLimit } = globalThis.ArcheoSettings;
const COPY_DOCUMENT_PATH = "offscreen.html";
const SWITCH_FAILSAFE_MS = 15000;

let mruByWindow = {};
let thumbnailsByTab = {};
let loadStatePromise;
let switchSession = null;
let switchFailsafeTimer;
let lastCopyAt = 0;
const ignoredActivations = new Set();
const captureTimers = new Map();
const enqueueSwitchAction = createActionQueue();

function loadState() {
  if (!loadStatePromise) {
    loadStatePromise = chrome.storage.session
      .get(["mruByWindow", "thumbnailsByTab"])
      .then(({ mruByWindow: storedMru, thumbnailsByTab: storedThumbnails }) => {
        mruByWindow = storedMru || {};
        thumbnailsByTab = storedThumbnails || {};
      });
  }

  return loadStatePromise;
}

function saveState() {
  return chrome.storage.session.set({ mruByWindow });
}

function touchTab(windowId, tabId) {
  const key = String(windowId);
  const order = mruByWindow[key] || [];
  mruByWindow[key] = rememberTab(tabId, order);
  return saveState();
}

async function removeTab(tabId) {
  await loadState();

  for (const key of Object.keys(mruByWindow)) {
    mruByWindow[key] = mruByWindow[key].filter((id) => id !== tabId);
  }

  delete thumbnailsByTab[String(tabId)];

  await Promise.all([
    saveState(),
    chrome.storage.session.set({ thumbnailsByTab })
  ]);
}

async function copyCurrentLink() {
  const now = Date.now();
  if (now - lastCopyAt < 300) return;
  lastCopyAt = now;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "COPY_TEXT",
    text: tab.url
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Could not copy the link");
  }

  const toastShown = await sendToTab(tab.id, {
    type: "ARCHEO_TOAST",
    text: "Link copied"
  });

  if (!toastShown) showBadge("Copied", "#2e7d32");
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(COPY_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (contexts.length) return;

  await chrome.offscreen.createDocument({
    url: COPY_DOCUMENT_PATH,
    reasons: ["CLIPBOARD", "BLOBS"],
    justification: "Copy page links and create small, session-only tab preview thumbnails."
  });
}

async function captureThumbnail(tabId, windowId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active || !tab.url?.match(/^https?:\/\//)) return false;

    const screenshot = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 55
    });
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "MAKE_THUMBNAIL",
      dataUrl: screenshot
    });

    if (!response?.ok || !response.thumbnailUrl) return false;
    thumbnailsByTab[String(tabId)] = response.thumbnailUrl;
    await chrome.storage.session.set({ thumbnailsByTab });
    return true;
  } catch {
    return false;
  }
}

function scheduleThumbnailCapture(tabId, windowId, delay = 450) {
  clearTimeout(captureTimers.get(windowId));
  const timer = setTimeout(() => {
    captureTimers.delete(windowId);
    captureThumbnail(tabId, windowId).catch(() => {});
  }, delay);
  captureTimers.set(windowId, timer);
}

async function switchToRecentTab({ commitImmediately = false, direction = 1 } = {}) {
  await loadState();

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id || activeTab.windowId == null) return;

  const sameSession =
    switchSession &&
    switchSession.windowId === activeTab.windowId &&
    switchSession.sourceTabId === activeTab.id;

  if (!sameSession) {
    clearTimeout(switchFailsafeTimer);
    const [tabs, groupsById] = await Promise.all([
      chrome.tabs.query({ windowId: activeTab.windowId }),
      getGroupsById(activeTab.windowId)
    ]);
    const switcherLimit = await getSwitcherLimit();
    const entries = buildSwitcherEntries(
      activeTab.id,
      tabs,
      mruByWindow[String(activeTab.windowId)] || [],
      switcherLimit
    );
    const order = entries.map((entry) => entry.targetId);

    switchSession = {
      windowId: activeTab.windowId,
      sourceTabId: activeTab.id,
      order,
      index: 0,
      entries,
      groupsById
    };
  }

  if (switchSession.order.length < 2) {
    showBadge("1 tab", "#616161");
    return;
  }

  switchSession.index = moveMruIndex(
    switchSession.index,
    switchSession.order.length,
    direction
  );
  const targetId = switchSession.order[switchSession.index];
  const visibleItems = switchSession.entries
    .map((entry) => {
      const tab = entry.tabs[0];
      const group = switchSession.groupsById.get(tab.groupId);
      const splitTabs = entry.tabs.map((splitTab) => ({
        id: splitTab.id,
        title: splitTab.title || "New tab",
        faviconUrl: safeFaviconUrl(splitTab.url, splitTab.favIconUrl),
        thumbnailUrl: thumbnailsByTab[String(splitTab.id)] || ""
      }));
      return {
        id: entry.targetId,
        title: splitTabs.map((splitTab) => splitTab.title).join(" · "),
        faviconUrl: safeFaviconUrl(tab.url, tab.favIconUrl),
        thumbnailUrl: thumbnailsByTab[String(tab.id)] || "",
        selected: entry.targetId === targetId,
        groupId: group?.id ?? -1,
        groupTitle: group?.title || "",
        groupColor: group?.color || "grey",
        splitTabs
      };
    });

  const switcherShown = await sendToTab(switchSession.sourceTabId, {
    type: "ARCHEO_SWITCHER",
    items: visibleItems
  });

  if (!switcherShown || commitImmediately) {
    await commitRecentTab(switchSession.sourceTabId);
    return;
  }

  clearTimeout(switchFailsafeTimer);
  switchFailsafeTimer = setTimeout(() => {
    commitRecentTab(switchSession?.sourceTabId).catch(console.error);
  }, SWITCH_FAILSAFE_MS);
}

async function getSwitcherLimit() {
  const { switcherLimit } = await chrome.storage.local.get("switcherLimit");
  return normalizeSwitcherLimit(switcherLimit);
}

async function getGroupsById(windowId) {
  try {
    const groups = await chrome.tabGroups.query({ windowId });
    return new Map(groups.map((group) => [group.id, group]));
  } catch {
    return new Map();
  }
}

function safeFaviconUrl(pageUrl, faviconUrl) {
  if (faviconUrl?.startsWith("data:") || faviconUrl?.startsWith("http")) return faviconUrl;
  if (!pageUrl?.startsWith("http")) return "";
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
}

async function commitRecentTab(sourceTabId) {
  if (!switchSession || switchSession.sourceTabId !== sourceTabId) return false;

  const session = switchSession;
  const targetId = session.order[session.index];
  switchSession = null;
  clearTimeout(switchFailsafeTimer);
  await sendToTab(session.sourceTabId, { type: "ARCHEO_SWITCHER_HIDE" }, false);

  if (!targetId || targetId === session.sourceTabId) return true;

  ignoredActivations.add(targetId);
  await chrome.tabs.update(targetId, { active: true });
  await touchTab(session.windowId, targetId);
  scheduleThumbnailCapture(targetId, session.windowId);
  return true;
}

async function cancelRecentTab(sourceTabId) {
  if (!switchSession || switchSession.sourceTabId !== sourceTabId) return false;

  const session = switchSession;
  switchSession = null;
  clearTimeout(switchFailsafeTimer);
  await sendToTab(session.sourceTabId, { type: "ARCHEO_SWITCHER_HIDE" }, false);
  return true;
}

async function activateSwitcherTab(sourceTabId, targetTabId) {
  if (!switchSession || switchSession.sourceTabId !== sourceTabId) return false;

  const targetIndex = switchSession.order.indexOf(targetTabId);
  if (targetIndex < 0) return false;

  switchSession.index = targetIndex;
  return commitRecentTab(sourceTabId);
}

async function moveSwitcherSelection(sourceTabId, direction) {
  if (!switchSession || switchSession.sourceTabId !== sourceTabId) return false;
  await switchToRecentTab({ direction });
  return true;
}

async function sendToTab(tabId, message, injectIfMissing = true) {
  if (!tabId) return false;

  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    if (!injectIfMissing) return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["grouping.js", "content.js"]
    });
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    // Chrome internal pages and the Web Store forbid script injection.
    return false;
  }
}

function showBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1300);
}

async function runCommand(command, options = {}) {
  try {
    if (command === "copy-link") await copyCurrentLink();
    if (command === "switch-recent-tab") await switchToRecentTab(options);
    if (command === "switch-recent-tab-backward") {
      await switchToRecentTab({ ...options, direction: -1 });
    }
    if (command === "commit-recent-tab") {
      await commitRecentTab(switchSession?.sourceTabId);
    }
  } catch (error) {
    console.error(`[Archeo] ${command} failed`, error);
    showBadge("Error", "#b3261e");
  }
}

function isSwitcherCommand(command) {
  return command === "switch-recent-tab" ||
    command === "switch-recent-tab-backward" ||
    command === "commit-recent-tab";
}

function runQueuedCommand(command, options = {}) {
  if (!isSwitcherCommand(command)) return runCommand(command, options);
  return enqueueSwitchAction(() => runCommand(command, options));
}

chrome.commands.onCommand.addListener((command) => {
  void runQueuedCommand(command);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target === "offscreen") return false;

  if (message?.type === "COMMIT_SWITCHER") {
    enqueueSwitchAction(() => commitRecentTab(_sender.tab?.id))
      .then((committed) => sendResponse({ ok: committed }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "CANCEL_SWITCHER") {
    enqueueSwitchAction(() => cancelRecentTab(_sender.tab?.id))
      .then((cancelled) => sendResponse({ ok: cancelled }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "ACTIVATE_SWITCHER_TAB") {
    enqueueSwitchAction(() => activateSwitcherTab(_sender.tab?.id, message.tabId))
      .then((activated) => sendResponse({ ok: activated }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "MOVE_SWITCHER_SELECTION") {
    const direction = message.direction < 0 ? -1 : 1;
    enqueueSwitchAction(() => moveSwitcherSelection(_sender.tab?.id, direction))
      .then((moved) => sendResponse({ ok: moved }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type !== "RUN_COMMAND") return false;

  runQueuedCommand(message.command, {
    commitImmediately: Boolean(message.commitImmediately)
  })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await loadState();

  if (ignoredActivations.delete(tabId)) return;

  if (switchSession) {
    const sourceTabId = switchSession.sourceTabId;
    switchSession = null;
    clearTimeout(switchFailsafeTimer);
    void sendToTab(sourceTabId, { type: "ARCHEO_SWITCHER_HIDE" }, false);
  }

  switchSession = null;
  await touchTab(windowId, tabId);
  void sendToTab(tabId, { type: "ARCHEO_PING" });
  scheduleThumbnailCapture(tabId, windowId);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id == null || tab.windowId == null) return;
  await loadState();
  await touchTab(tab.windowId, tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    scheduleThumbnailCapture(tabId, tab.windowId, 250);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  removeTab(tabId).catch(console.error);
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  await loadState();
  delete mruByWindow[String(windowId)];
  await saveState();
});

chrome.runtime.onInstalled.addListener(async () => {
  await loadState();
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))) {
    if (tab.id != null) await touchTab(tab.windowId, tab.id);
  }

  for (const tab of tabs.filter((candidate) => candidate.active)) {
    if (tab.id != null) scheduleThumbnailCapture(tab.id, tab.windowId, 250);
  }
});
