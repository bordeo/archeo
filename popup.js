document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({
      type: "RUN_COMMAND",
      command: button.dataset.command,
      commitImmediately: button.dataset.command === "switch-recent-tab"
    });
    window.close();
  });
});

document.querySelector("#shortcuts").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

chrome.commands.getAll().then((commands) => {
  for (const command of commands) {
    const label = document.querySelector(`[data-shortcut="${command.name}"]`);
    if (label) label.textContent = formatShortcut(command.shortcut) || "Set shortcut";
  }
});

function formatShortcut(shortcut) {
  if (!shortcut || !navigator.platform.toLowerCase().includes("mac")) return shortcut;

  return shortcut
    .replaceAll("Command", "⌘")
    .replaceAll("MacCtrl", "⌃")
    .replaceAll("Ctrl", "⌃")
    .replaceAll("Alt", "⌥")
    .replaceAll("Option", "⌥")
    .replaceAll("Shift", "⇧")
    .replaceAll("Period", ".")
    .replaceAll("Comma", ",")
    .replaceAll("+", "");
}
