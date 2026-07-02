# TORN'z Tools Chrome Extension

Chrome/Chromium extension build for TORN'z Tools.

Made by FLUZ [4325064]  
Profile: https://www.torn.com/profiles.php?XID=4325064

## About

This folder contains the static Chrome/Chromium extension files for TORN'z Tools. The built extension lives in `dist/chrome-extension` after running the project build.

The extension is a read-only/manual-assist Torn helper. It does not perform account actions for you.

## Install Locally

1. Open Chrome or another Chromium browser.
2. Go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the generated `dist/chrome-extension` folder.
6. Open Torn.
7. Open the TORN'z Tools Profile/API window.
8. Add your own Torn Limited Access API key.
9. Enable FFScouter in the Profile/API window. This is important for the app to work properly with FFScouter-supported tools.

Tip: clicking the green `Tz` extension icon in the Chrome toolbar opens the full TORN'z Profile/API window on the active Torn tab.

## Sharing / Releases

Share the source repository or official release package. Do not share your own API key, browser storage, screenshots containing keys, or modified builds that claim to be official.

## Privacy / Safety

- This extension does not include any API key or local settings.
- API keys are stored locally in that user's browser with `chrome.storage.local`.
- Torn API calls go to `https://api.torn.com`.
- Optional FFScouter calls only happen when FFScouter is enabled and the user manually presses an FFScouter action.
- No automatic buying, selling, attacking, betting, listing, training, item use, messaging, trading, or other account actions.
- The user still manually reviews and confirms anything inside Torn.

## Permissions

The extension needs access to Torn pages so it can show the helper UI.

It also needs network access to supported helper data sources such as:

- `api.torn.com`
- `tornsy.com`
- `weav3r.dev`
- `yata.yt`
- `docs.google.com`
- `ffscouter.com` when explicitly enabled

## Updating

To update the extension:

1. Run `npm.cmd run build` from the project root.
2. Go to `chrome://extensions`.
3. Click the reload button on TORN'z Tools.
4. Refresh Torn.

Your API key and local settings should remain stored in the browser unless you remove the extension data.

## Troubleshooting

If the panel does not appear:

1. Make sure the extension is enabled in `chrome://extensions`.
2. Click the reload button on the extension.
3. Refresh Torn.
4. Check that you selected the folder containing `manifest.json`.
5. Pin the green `Tz` icon in Chrome and click it while a Torn tab is active.

If API features do not work:

1. Open the Profile/API window.
2. Re-enter your Torn Limited Access API key.
3. Make sure the key is valid and not expired/revoked.

## Copyright

Copyright (c) FLUZ [4325064]. All rights reserved unless a separate license is provided.

TORN'z Tools is a read-only/manual-assist project. Do not reupload, resell, impersonate, or redistribute modified versions as official FLUZ builds without permission.
