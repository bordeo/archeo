(() => {
if (globalThis.__archeoContentLoaded) return;
globalThis.__archeoContentLoaded = true;

const host = document.createElement("div");
host.id = "archeo-root";
const root = host.attachShadow({ mode: "closed" });
let switcherActive = false;

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
    max-width: min(1010px, calc(100vw - 36px));
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
  .tab {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 188px;
    min-width: 0;
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
    aspect-ratio: 16 / 10;
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
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 40%, rgba(255,255,255,.11), transparent 55%);
  }
  .preview-fallback .favicon,
  .preview-fallback .fallback {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    font-size: 20px;
  }
  .tab-label {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0 3px 2px;
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

  const currentIds = [...switcher.children].map((card) => card.dataset.tabId);
  const nextIds = items.map((item) => String(item.id));
  const sameCards =
    currentIds.length === nextIds.length &&
    currentIds.every((id, index) => id === nextIds[index]);

  if (sameCards) {
    for (const [index, card] of [...switcher.children].entries()) {
      card.classList.toggle("selected", Boolean(items[index]?.selected));
    }
  } else {
    switcher.replaceChildren(...items.map(createTabCard));
  }

  if (firstAppearance) {
    switcher.classList.remove("visible");
    requestAnimationFrame(() => {
      if (switcherActive) switcher.classList.add("visible");
    });
  }
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
  fallback.append(makeFavicon(item));
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
    switcherActive = false;
    chrome.runtime.sendMessage({ type: "COMMIT_SWITCHER" });
  }
}, true);

document.addEventListener("keydown", (event) => {
  if (switcherActive && event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    switcherActive = false;
    chrome.runtime.sendMessage({ type: "CANCEL_SWITCHER" });
  }
}, true);

window.addEventListener("blur", () => {
  if (!switcherActive) return;
  switcherActive = false;
  chrome.runtime.sendMessage({ type: "COMMIT_SWITCHER" });
});
})();
