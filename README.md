# Clear Site Data

Chrome extension that wipes data for the site in the active tab. Click the toolbar icon, tick what
to clear, hit **Clear**. Your selection is remembered.

| Option | How it's cleared |
|---|---|
| Cookies | `chrome.browsingData`, scoped to the tab's origin (Chrome clears the whole registrable domain) |
| Local storage, IndexedDB, Cache storage, Service workers, File systems | `chrome.browsingData`, tab origin only |
| HTTP cache | `chrome.browsingData`, tab origin only |
| Session storage | `sessionStorage.clear()` injected into every frame of the tab |
| Reload tab afterwards | Hard reload (bypasses cache) |

## Load it locally

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → pick the `extension/` folder

## Release

Bump `"version"` in `extension/manifest.json` and push to `main`. The `Release` workflow zips
`extension/` and creates a GitHub release `v<version>` with `clear-site-data-<version>.zip`
attached. Upload that zip in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
Pushes that don't change the version are skipped.

Build the zip locally with `./scripts/package.sh` (output in `dist/`).

Regenerate the icons with `node scripts/make-icons.mjs`.

## Web Store permission justifications

- `browsingData`: removes cookies, cache and storage for the current site.
- `activeTab`: reads the current tab's URL to know which site to clear, only when you click the icon.
- `scripting`: clears `sessionStorage` in the current tab (no browsing-data API exists for it).
- `storage`: remembers which checkboxes you selected.

No data is collected or sent anywhere.
