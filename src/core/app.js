/*
  TORN'z Tools
  Made by FLUZ - https://www.torn.com/profiles.php?XID=4325064

  Safety promise:
  - Share build: no API key or local Tampermonkey data is included in this file.
  - Read-only advice only.
  - No automatic buying, selling, trading, clicking, or account actions.
  - API key is stored locally by the userscript manager.
  - Torn API key is only sent to https://api.torn.com, except the optional
    FFScouter integration which can send the same locally saved key only to
    https://ffscouter.com after the user enables it and presses an action.
*/

(function fluzTornTools() {
  'use strict';

  console.info("[TORN'z Tools] userscript started v0.13.07", window.location.href);

  // ---------------------------------------------------------------------------
  // Constants/config
  // ---------------------------------------------------------------------------

  const APP = {
    id: 'tornz-tools',
    name: "TORN'z Tools",
    stockName: "TORN'z Stock Tool",
    gymName: "TORN'z Gym Tool",
    utilityName: "TORN'z Tools",
    version: '0.13.07',
    profileUrl: 'https://www.torn.com/profiles.php?XID=4325064',
    authorLabel: 'FLUZ [4325064]',
    apiBaseUrl: 'https://api.torn.com',
    stockSyncBaseUrl: 'https://hq.tornz-tools.org/api/stock-sync/v1',
    stockSyncDownloadUrl: 'https://hq.tornz-tools.org/stock-sync/download',
    tornsyBaseUrl: 'https://tornsy.com/api',
    ffscouterBaseUrl: 'https://ffscouter.com/api/v1',
    apiCacheTtlMs: 60 * 1000,
    itemDbCacheTtlMs: 60 * 60 * 1000,
    tornsyCacheTtlMs: 10 * 60 * 1000,
    notificationCooldownMs: 10 * 60 * 1000,
    sellFeePct: 0.1,
    partialBenefitMinPct: 5,
    partialHighTierMinPct: 1
  };
