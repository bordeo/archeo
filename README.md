# Archeo

Archeo brings a couple of Arc-inspired interactions to Google Chrome:

- **Copy Link** copies the active page URL and shows a compact confirmation pill.
- **Recent Tabs** opens a visual most-recently-used tab switcher. Keep holding Control and tap Tab to move the highlight; release Control to switch, or press Escape to cancel.

[Watch the demo](./archeo-demo.mp4)

Archeo is a Manifest V3 extension with no build step, external dependencies, analytics, or network services.

## Install the extension

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder.
5. Open `chrome://extensions/shortcuts` and confirm the internal shortcuts:
   - Copy Link: `Shift+Command+X`
   - Recent Tabs: `Control+Shift+.`
   - Finish Recent Tabs: `Control+Shift+,`

Chrome reserves `Shift+Command+C` for DevTools and `Control+Tab` for native tab navigation. Extensions cannot override those shortcuts directly, so macOS users can install the included Karabiner-Elements configuration to get the intended gestures.

## Install the Karabiner-Elements shortcuts

The Chrome-only complex modification is included at [`karabiner/archeo.json`](./karabiner/archeo.json). It maps:

- `Shift+Command+C` → Archeo Copy Link
- `Control+Tab` → Archeo Recent Tabs
- `Command+Option+C` → Chrome's original element inspector

Copy the configuration into Karabiner-Elements:

```sh
mkdir -p ~/.config/karabiner/assets/complex_modifications
cp karabiner/archeo.json ~/.config/karabiner/assets/complex_modifications/archeo.json
```

Then open **Karabiner-Elements → Complex Modifications → Add predefined rule** and enable **Archeo: Arc-style shortcuts in Chrome**.

The mappings apply only to Google Chrome, Chrome Beta/Dev/Canary, and Chromium. Reload Archeo from `chrome://extensions` after changing its files.

The configuration also sends Archeo's private Finish Recent Tabs shortcut when Control is released. This makes closing and committing the selector reliable even when a page intercepts the browser's Control key-up event.

## How Recent Tabs works

Archeo tracks tab activation order per Chrome window. On the first `Control+Tab`, it keeps the current page active and highlights the previously used tab. Further Tab presses only move the highlight; the switch happens when Control is released.

The overlay shows up to five tabs with locally generated page previews. Chrome does not allow extension UI on protected pages such as `chrome://settings` or the Chrome Web Store, but tab switching still works there.

## Privacy and permissions

Archeo does not send or sell data and contains no analytics. Tab history and compressed previews remain in `chrome.storage.session`; Chrome clears them when the browser session ends, and previews are removed when their tab closes.

The extension requests:

- `tabs` and `favicon` to build the MRU list and display tab metadata.
- `activeTab` and `<all_urls>` to capture local previews and render the overlay on normal web pages.
- `scripting` to restore the overlay after an unpacked-extension reload.
- `storage` for session-only MRU state and previews.
- `clipboardWrite` and `offscreen` to copy the current URL reliably.

## Development

There is no build step. After editing, reload the unpacked extension from `chrome://extensions`.

Run the checks with Node.js:

```sh
node --check background.js
node --check content.js
node --check mru.js
node --check offscreen.js
node --check popup.js
node tests/mru.test.js
```

Contributions and bug reports are welcome. Please keep changes focused and include a test when modifying MRU ordering behavior.

## License

[MIT](./LICENSE)
