# TORN'z Tools

Read-only/manual-assist helper tools for Torn.

Made by FLUZ [4325064]  
Profile: https://www.torn.com/profiles.php?XID=4325064

## What It Does

TORN'z Tools adds a compact Torn-style helper panel with tools for stocks, item market checks, bazaar comparisons, travel planning, hospital/addiction estimates, merits, missions, crimes, factions, and other manual workflows.

The project is designed to help with calculations, reminders, comparisons, and planning while leaving all Torn actions under the user's manual control.

## Safety

- No automatic buying, selling, attacking, betting, listing, training, item use, messaging, or account actions.
- Torn API keys are stored locally in the user's browser or userscript manager.
- Torn API requests go to `api.torn.com`.
- Optional FFScouter features only run when enabled and manually used.
- Optional Stock Intelligence Drive sync only runs when enabled and configured with a private TORN'z sync token.
- Users still review and confirm everything inside Torn.

## Files

- `src/` - structured source files used for development.
- `chrome-extension/` - Chrome/Chromium extension static files.
- `dist/TORN'z Tools.user.js` - generated Tampermonkey/Greasemonkey userscript.
- `dist/chrome-extension/` - generated Chrome/Chromium extension package folder.
- `cloudflare/stock-sync-worker/` - optional private Worker gateway for Stock Intelligence Drive sync.

## Development

Edit files in `src/`, then run the build:

```powershell
npm.cmd run build
```

On shells where `npm` is not blocked by PowerShell script policy, `npm run build` also works.

The build combines the source fragments into:

- `dist/TORN'z Tools.user.js`
- `dist/chrome-extension/content/tornz-tools.js`

## Chrome Extension

The Chrome extension stores settings locally with `chrome.storage.local`. It does not include any API key or local user settings.

To load locally:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/chrome-extension` folder.
5. Open Torn and add your own Limited Access Torn API key in the Profile/API window.

## Optional Stock Intelligence

Stock Intelligence uses IndexedDB as a local browser database. In the Chrome extension, a background task records stock snapshots while Chrome is running. In the userscript, snapshots are recorded only while Torn is open.

Drive sync is optional:

- It uploads stock intelligence packages to a private Cloudflare Worker gateway.
- The Worker writes JSON files into your private Google Drive folder through a Google service account.
- The extension never receives Google credentials.
- Torn API keys are never uploaded.
- Recommendations remain manual-assist only and are not guaranteed profit.

Worker setup notes live in `cloudflare/stock-sync-worker/README.md`.

Default sync routes:

- Upload/status API: `https://hq.tornz-tools.org/api/stock-sync/v1`
- Private model download page: `https://hq.tornz-tools.org/stock-sync/download`

## License

Copyright (c) FLUZ [4325064]. All rights reserved unless a separate license is provided.
