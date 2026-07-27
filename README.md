# Archeo

Archeo brings a couple of Arc-inspired interactions to Google Chrome:

- **Copy Link** copies the active page URL and shows a compact confirmation pill.
- **Recent Tabs** opens a visual most-recently-used tab switcher. Keep holding Control and tap Tab to move forward or Shift+Tab to move backward; release Control to switch, or press Escape to cancel.

Archeo is a Manifest V3 extension with no build step, external dependencies, analytics, or network services.

## Install the extension

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder.
5. Open `chrome://extensions/shortcuts` and confirm the internal shortcuts:
   - Copy Link: `Shift+Command+X`
   - Recent Tabs: `Control+Shift+.`
   - Recent Tabs Backward: `Control+Shift+U`
   - Finish Recent Tabs: `Control+Shift+,`

Chrome reserves `Shift+Command+C` for DevTools and `Control+Tab` for native tab navigation. Extensions cannot override those shortcuts directly, so macOS users can install one of the included remapping adapters to get the intended gestures.

## Choose a macOS remapping adapter

| Adapter | Cost | Copy Link | Hold/release MRU | Included config |
| --- | --- | --- | --- | --- |
| Karabiner-Elements | Free, open source | Yes | Yes | [`karabiner/archeo.json`](./karabiner/archeo.json) |
| Hammerspoon | Free, open source | Yes | Yes | [`hammerspoon/archeo.lua`](./hammerspoon/archeo.lua) |
| macOS App Shortcuts | Built in | Menu action only | No | Not applicable |

Enable only one Archeo remapping adapter at a time. Running Karabiner-Elements and Hammerspoon mappings together will send every command twice.

### Karabiner-Elements

The Chrome-only complex modification is included at [`karabiner/archeo.json`](./karabiner/archeo.json). It maps:

- `Shift+Command+C` → Archeo Copy Link
- `Control+Tab` → Archeo Recent Tabs
- `Control+Shift+Tab` → Archeo Recent Tabs backward
- `Command+Option+C` → Chrome's original element inspector

Copy the configuration into Karabiner-Elements:

```sh
mkdir -p ~/.config/karabiner/assets/complex_modifications
cp karabiner/archeo.json ~/.config/karabiner/assets/complex_modifications/archeo.json
```

Then open **Karabiner-Elements → Complex Modifications → Add predefined rule** and enable **Archeo: Arc-style shortcuts in Chrome**.

The mappings apply only to Google Chrome, Chrome Beta/Dev/Canary, and Chromium. Reload Archeo from `chrome://extensions` after changing its files.

The configuration also sends Archeo's private Finish Recent Tabs shortcut when Control is released. This makes closing and committing the selector reliable even when a page intercepts the browser's Control key-up event.

### Hammerspoon

The Hammerspoon adapter provides the same Chrome-only mappings and observes Control release directly:

1. Install [Hammerspoon](https://www.hammerspoon.org/) and grant its requested Accessibility permission.
2. Copy the adapter into your Hammerspoon configuration:

   ```sh
   mkdir -p ~/.hammerspoon
   cp hammerspoon/archeo.lua ~/.hammerspoon/archeo.lua
   ```

3. Add this line to `~/.hammerspoon/init.lua`:

   ```lua
   require("archeo")
   ```

4. Choose **Reload Config** from the Hammerspoon menu.
5. Disable Archeo's Karabiner-Elements rule if it is enabled.

### Built-in macOS options

**System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts** can assign a shortcut to a named Chrome menu command such as **Copy Link**. It is useful for menu actions, but macOS App Shortcuts and the Shortcuts app do not expose the held-key state and modifier-release lifecycle required by Archeo's MRU selector. Use Karabiner-Elements or Hammerspoon for the complete experience.

### Bring your own remapper

Other tools can integrate with Archeo without an extension-specific API. Scope the mappings to Chrome and implement this four-command contract:

1. `Shift+Command+C` sends `Shift+Command+X` for **Copy Link**.
2. Every `Control+Tab` key-down sends `Control+Shift+.` for **Recent Tabs**.
3. Every `Control+Shift+Tab` key-down sends `Control+Shift+U` for **Recent Tabs Backward**.
4. After at least one cycle command, releasing Control sends `Control+Shift+,` once to **Finish Recent Tabs**.

The third step is essential: a normal hotkey-only tool can trigger Copy Link and cycle the selection, but it cannot reliably finish the held-key interaction. BetterTouchTool exposes a key-release action category and is a good candidate for a future preset; contributions for tested adapters are welcome.

## How Recent Tabs works

Archeo tracks tab activation order per Chrome window. On the first `Control+Tab`, it keeps the current page active and highlights the previously used tab. `Control+Shift+Tab` moves in the opposite direction; on the first iteration it wraps to the least-recent tab. Further Tab or Shift+Tab presses only move the highlight; the switch happens when Control is released.

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
