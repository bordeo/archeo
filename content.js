(() => {
if (globalThis.__archeoContentLoaded) return;
globalThis.__archeoContentLoaded = true;

const host = document.createElement("div");
host.id = "archeo-root";
const root = host.attachShadow({ mode: "closed" });
let switcherActive = false;
const CONTROL_RELEASE_EVENT = "__archeo_control_released__";
const { groupAdjacentItems } = globalThis.ArcheoGrouping;

const style = document.createElement("style");
style.textContent = `
  :host { all: initial; }
  .switcher {
    position: fixed;
    z-index: 2147483647;
    left: 50%;
    bottom: 10vh;
    transform: translateX(-50%) translateY(12px) scale(.98);
    display: flex;
    gap: 8px;
    max-width: min(1100px, calc(100vw - 36px));
    padding: 10px;
    overflow: hidden;
    color: #f6f4f0;
    background: rgba(25, 24, 23, .92);
    border: 1px solid rgba(255, 255, 255, .16);
    border-radius: 18px;
    box-shadow: 0 18px 60px rgba(0, 0, 0, .42);
    opacity: 0;
    pointer-events: none;
    backdrop-filter: blur(24px) saturate(130%);
    transition: opacity 100ms ease, transform 100ms ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .switcher.visible { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  .group-cluster {
    --group-color: #9aa0a6;
    position: relative;
    display: flex;
    gap: 8px;
    min-width: 0;
    border-radius: 12px;
    outline: 1px solid color-mix(in srgb, var(--group-color) 68%, transparent);
    background: color-mix(in srgb, var(--group-color) 8%, transparent);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--group-color) 9%, transparent);
  }
  .group-label {
    position: absolute;
    z-index: 2;
    top: -7px;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: calc(100% - 16px);
    height: 16px;
    padding: 0 6px;
    overflow: hidden;
    color: rgba(255, 255, 255, .88);
    background: #373533;
    border: 1px solid color-mix(in srgb, var(--group-color) 45%, #373533);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .group-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--group-color);
  }
  .group-label span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tab {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: minmax(0, 1fr) 24px;
    gap: 8px;
    flex: 1 1 188px;
    width: 188px;
    min-width: 0;
    height: 154px;
    padding: 8px;
    border: 2px solid transparent;
    border-radius: 12px;
    background: rgba(255, 255, 255, .055);
    transform: translateY(0);
    transition: border-color 120ms ease, background-color 120ms ease,
      transform 140ms cubic-bezier(.2, .8, .2, 1);
  }
  .tab.selected {
    border-color: rgba(255, 255, 255, .9);
    background: rgba(255, 255, 255, .16);
    transform: translateY(-2px);
  }
  .preview {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 8px;
    background: linear-gradient(145deg, #4b4845, #2e2c2a);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08);
  }
  .preview-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
  .preview-fallback {
    display: grid;
    place-items: center;
    isolation: isolate;
    position: relative;
    width: 100%;
    height: 100%;
    background: #403d3a;
  }
  .preview-fallback::after {
    position: absolute;
    z-index: -1;
    inset: 0;
    background: rgba(24, 23, 22, .34);
    content: "";
  }
  .preview-backdrop {
    position: absolute;
    z-index: -2;
    inset: -35%;
    width: 170%;
    height: 170%;
    object-fit: cover;
    opacity: .42;
    filter: blur(25px) saturate(1.6);
    transform: scale(1.12);
  }
  .preview-fallback .favicon,
  .preview-fallback .fallback {
    position: relative;
    z-index: 1;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    font-size: 15px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .24);
  }
  .tab-label {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
    height: 24px;
    padding: 0 3px;
  }
  .favicon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    border-radius: 5px;
    background: rgba(255, 255, 255, .08);
  }
  .fallback {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 5px;
    background: #55514e;
    color: white;
    font-size: 11px;
    font-weight: 700;
  }
  .title {
    overflow: hidden;
    color: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .toast {
    position: fixed;
    z-index: 2147483647;
    top: 18px;
    left: 50%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 20px;
    transform: translateX(-50%) translateY(-10px) scale(.96);
    color: #f0faed;
    background: #075c0b;
    border: 1px solid rgba(0, 57, 5, .38);
    border-radius: 999px;
    box-shadow: 0 10px 26px rgba(0, 0, 0, .25), 0 2px 7px rgba(0, 0, 0, .22);
    opacity: 0;
    font: 650 16px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: -.1px;
    pointer-events: none;
    transition: opacity 130ms ease, transform 160ms cubic-bezier(.2, .8, .2, 1);
  }
  .toast.visible { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  .toast-icon {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  @media (prefers-reduced-motion: reduce) {
    .switcher, .tab, .toast { transition: opacity 80ms linear; }
  }
`;
root.append(style);

function mount() {
  if (!host.isConnected) (document.documentElement || document).append(host);
}

function hideSwitcher() {
  switcherActive = false;
  root.querySelector(".switcher")?.classList.remove("visible");
}

function commitSwitcher() {
  if (!switcherActive) return;
  switcherActive = false;
  chrome.runtime.sendMessage({ type: "COMMIT_SWITCHER" });
}

function renderSwitcher(items) {
  mount();
  const firstAppearance = !switcherActive;
  switcherActive = true;
  let switcher = root.querySelector(".switcher");

  if (!switcher) {
    switcher = document.createElement("div");
    switcher.className = "switcher";
    root.append(switcher);
  }

  const currentCards = [...switcher.querySelectorAll(".tab[data-tab-id]")];
  const currentIds = currentCards.map((card) => card.dataset.tabId);
  const nextIds = items.map((item) => String(item.id));
  const layoutSignature = JSON.stringify(items.map((item) => [
    item.id,
    item.groupId,
    item.groupTitle,
    item.groupColor
  ]));
  const sameCards =
    switcher.dataset.layoutSignature === layoutSignature &&
    currentIds.length === nextIds.length &&
    currentIds.every((id, index) => id === nextIds[index]);

  if (sameCards) {
    for (const [index, card] of currentCards.entries()) {
      card.classList.toggle("selected", Boolean(items[index]?.selected));
    }
  } else {
    switcher.replaceChildren(...groupAdjacentItems(items).map(createSegment));
    switcher.dataset.layoutSignature = layoutSignature;
  }

  if (firstAppearance) {
    switcher.classList.remove("visible");
    requestAnimationFrame(() => {
      if (switcherActive) switcher.classList.add("visible");
    });
  }
}

const GROUP_COLORS = {
  grey: "#9aa0a6",
  blue: "#5b9cf6",
  red: "#ef6b73",
  yellow: "#e7b84b",
  green: "#54b978",
  pink: "#df75b6",
  purple: "#a985e8",
  cyan: "#4dbbc8",
  orange: "#e99050"
};

function createSegment(segment) {
  if (segment.groupId === null) return createTabCard(segment.items[0]);

  const cluster = document.createElement("div");
  cluster.className = "group-cluster";
  cluster.style.setProperty(
    "--group-color",
    GROUP_COLORS[segment.groupColor] || GROUP_COLORS.grey
  );
  cluster.style.flexGrow = String(segment.items.length);
  cluster.style.flexBasis = `calc(${segment.items.length} * 188px + ${
    Math.max(0, segment.items.length - 1) * 8
  }px)`;

  const label = document.createElement("div");
  label.className = "group-label";

  const dot = document.createElement("span");
  dot.className = "group-dot";

  const title = document.createElement("span");
  title.textContent = segment.groupTitle;
  label.append(dot, title);
  cluster.append(label, ...segment.items.map(createTabCard));
  return cluster;
}

function createTabCard(item) {
  const card = document.createElement("div");
  card.className = `tab${item.selected ? " selected" : ""}`;
  card.dataset.tabId = String(item.id);

  const preview = document.createElement("div");
  preview.className = "preview";
  if (item.thumbnailUrl) {
    const screenshot = document.createElement("img");
    screenshot.className = "preview-image";
    screenshot.src = item.thumbnailUrl;
    screenshot.alt = "";
    screenshot.addEventListener("error", () => {
      preview.replaceChildren(makePreviewFallback(item));
    });
    preview.append(screenshot);
  } else {
    preview.append(makePreviewFallback(item));
  }
  card.append(preview);

  const label = document.createElement("div");
  label.className = "tab-label";
  label.append(makeFavicon(item));

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title;
  label.append(title);
  card.append(label);
  return card;
}

function makeFavicon(item) {
  if (!item.faviconUrl) return makeFallback(item.title);

  const image = document.createElement("img");
  image.className = "favicon";
  image.src = item.faviconUrl;
  image.alt = "";
  image.addEventListener("error", () => image.replaceWith(makeFallback(item.title)));
  return image;
}

function makePreviewFallback(item) {
  const fallback = document.createElement("div");
  fallback.className = "preview-fallback";
  const icon = makeFavicon(item);

  if (icon.classList.contains("favicon")) {
    const backdrop = icon.cloneNode();
    backdrop.className = "preview-backdrop";
    backdrop.addEventListener("error", () => backdrop.remove());
    fallback.append(backdrop);
  }

  fallback.append(icon);
  return fallback;
}

function makeFallback(title) {
  const fallback = document.createElement("div");
  fallback.className = "fallback";
  fallback.textContent = (title || "?").trim().charAt(0).toUpperCase();
  return fallback;
}

function showToast(text) {
  mount();
  root.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "toast-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");

  const firstLink = document.createElementNS("http://www.w3.org/2000/svg", "path");
  firstLink.setAttribute("d", "M10 13a5 5 0 0 0 7.07 0l2-2A5 5 0 0 0 12 3.93l-1.15 1.15");
  const secondLink = document.createElementNS("http://www.w3.org/2000/svg", "path");
  secondLink.setAttribute("d", "M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.15-1.15");
  icon.append(firstLink, secondLink);

  const label = document.createElement("span");
  label.textContent = text;
  toast.append(icon, label);
  root.append(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => toast.classList.remove("visible"), 1900);
  setTimeout(() => toast.remove(), 2150);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ARCHEO_SWITCHER") renderSwitcher(message.items || []);
  if (message?.type === "ARCHEO_SWITCHER_HIDE") hideSwitcher();
  if (message?.type === "ARCHEO_TOAST") showToast(message.text);
});

window.addEventListener("keyup", (event) => {
  if (switcherActive && (event.key === "Control" || !event.ctrlKey)) {
    commitSwitcher();
  }
}, true);

window.addEventListener(CONTROL_RELEASE_EVENT, commitSwitcher, true);

document.addEventListener("keydown", (event) => {
  if (switcherActive && event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    switcherActive = false;
    chrome.runtime.sendMessage({ type: "CANCEL_SWITCHER" });
  }
}, true);

window.addEventListener("blur", () => {
  commitSwitcher();
});
})();
