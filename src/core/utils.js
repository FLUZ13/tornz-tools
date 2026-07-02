  function registerMenuCommand(label, callback) {
    try {
      if (GM_API.menu) GM_API.menu(label, callback);
    } catch (error) {
      console.warn('[FLUZ] menu command failed:', label, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Utility functions
  // ---------------------------------------------------------------------------

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value == null) return 0;
    const cleaned = String(value).replace(/[$,\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseCompactNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value || '').trim().toLowerCase().replace(/[$,\s]/g, '');
    if (!text) return 0;
    const match = text.match(/^(-?\d+(?:\.\d+)?)([kmbt])?$/i);
    if (!match) return parseNumber(text);
    const base = Number(match[1]);
    if (!Number.isFinite(base)) return 0;
    const multipliers = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    return base * (multipliers[match[2]] || 1);
  }

  function compactNumber(value) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);
    if (abs >= 1e12) return `${(number / 1e12).toFixed(2)}t`;
    if (abs >= 1e9) return `${(number / 1e9).toFixed(2)}b`;
    if (abs >= 1e6) return `${(number / 1e6).toFixed(2)}m`;
    if (abs >= 1e3) return `${(number / 1e3).toFixed(1)}k`;
    return Math.round(number).toLocaleString();
  }

  function formatMoney(value) {
    const number = Number(value) || 0;
    const sign = number < 0 ? '-' : '';
    return `${sign}$${compactNumber(Math.abs(number))}`;
  }

  function formatFullMoney(value) {
    const number = Math.round(Number(value) || 0);
    return `$${number.toLocaleString()}`;
  }

  function formatPct(value, digits = 1) {
    if (value == null || Number.isNaN(value)) return 'n/a';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(digits)}%`;
  }

  function nowMs() {
    return Date.now();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isTornPda() {
    return typeof window !== 'undefined'
      && (typeof window.PDA_httpGet === 'function' || !!window.flutter_inappwebview);
  }

  function looksLikeStocksPage() {
    try {
      const url = new URL(window.location.href);
      if ((url.searchParams.get('sid') || '').toLowerCase() === 'stocks') return true;
      if (url.pathname.endsWith('/page.php')) return false;
    } catch (error) {
      // Ignore URL parsing issues and fall back to page text detection.
    }
    const titleText = `${document.title || ''} ${document.body ? document.body.textContent.slice(0, 2500) : ''}`;
    return /stock market/i.test(titleText) && /stocks filter|stock name|dividend/i.test(titleText);
  }

  function looksLikeGymPage() {
    try {
      const url = new URL(window.location.href);
      if ((url.searchParams.get('sid') || '').toLowerCase() === 'gym') return true;
      if (/\/gym\.php$/i.test(url.pathname)) return true;
      if (/\/(?:index|profiles|factions|hospitalview|jailview|items|bazaar)\.php$/i.test(url.pathname || '')) return false;
      if (url.pathname.endsWith('/page.php')) return false;
    } catch (error) {
      // Ignore URL parsing issues and fall back to page text detection.
    }
    const titleText = `${document.title || ''} ${document.body ? document.body.textContent.slice(0, 2500) : ''}`;
    return /\bgym\b/i.test(titleText) && /strength|speed|defense|dexterity|train/i.test(titleText);
  }

  function currentUrl() {
    try {
      return new URL(window.location.href);
    } catch (error) {
      return { href: window.location.href, pathname: '', search: '', hash: '', searchParams: new URLSearchParams() };
    }
  }

  function urlSid(url = currentUrl()) {
    return String(url.searchParams && url.searchParams.get ? url.searchParams.get('sid') || '' : '').toLowerCase();
  }

  function isBookiePage() {
    const url = currentUrl();
    return urlSid(url) === 'bookie' || /sid=bookie/i.test(url.href || '');
  }

  function isBlackjackPage() {
    const url = currentUrl();
    return urlSid(url) === 'blackjack' || /sid=blackjack/i.test(url.href || '');
  }

  function isHighLowPage() {
    const url = currentUrl();
    return urlSid(url) === 'highlow' || /sid=highlow/i.test(url.href || '');
  }

  function isHoldemPage() {
    const url = currentUrl();
    return urlSid(url) === 'holdem' || /sid=holdem/i.test(url.href || '');
  }

  function isMeritsPage() {
    const url = currentUrl();
    const sid = urlSid(url);
    const tab = String(url.searchParams && url.searchParams.get ? url.searchParams.get('tab') || '' : '').toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return sid === 'awards' || tab === 'merits' || /(?:sid=awards|tab=merits|awards\.php)/i.test(href);
  }

  function isItemMarketAddListingPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const hash = String(url.hash || '').toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return (sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href)) && /addlisting/.test(hash || href);
  }

  function isItemMarketListingToolPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const hash = String(url.hash || '').toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return (sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href))
      && /(addlisting|viewlisting)/.test(hash || href);
  }

  function currentItemMarketItemId() {
    const hash = String(currentUrl().hash || '');
    const match = hash.match(/(?:[?&#/]|^)itemID=(\d+)/i) || hash.match(/(?:[?&#/]|^)itemid=(\d+)/i);
    return match ? match[1] : '';
  }

  function currentItemMarketCategoryName() {
    const hash = String(currentUrl().hash || '');
    const match = hash.match(/(?:[?&#/]|^)categoryName=([^&#]+)/i);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (error) {
      return match[1].replace(/\+/g, ' ');
    }
  }

  function isItemMarketBrowseItemPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return (sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href))
      && /#\/market/i.test(String(url.hash || ''))
      && !!currentItemMarketItemId();
  }

  function tornCssModuleSelector(localName) {
    const prefix = `${localName}___`;
    return `[class^="${prefix}"], [class*=" ${prefix}"]`;
  }

  function tornUlCssModuleSelector(localName) {
    const prefix = `${localName}___`;
    return `ul[class^="${prefix}"], ul[class*=" ${prefix}"]`;
  }

  function isItemMarketPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href);
  }

  function isProfilePage() {
    const url = currentUrl();
    return /\/profiles\.php$/i.test(url.pathname || '') && (url.searchParams && url.searchParams.get('XID'));
  }

  function detectToolMode() {
    if (looksLikeStocksPage()) return 'stocks';
    if (looksLikeGymPage()) return 'gym';
    if (detectUtilityModule()) return 'utility';
    return '';
  }

  function detectUtilityModule() {
    let url;
    try {
      url = new URL(window.location.href);
    } catch (error) {
      url = { href: window.location.href, pathname: '', search: '' };
    }
    const haystack = `${url.pathname || ''} ${url.search || ''} ${url.hash || ''} ${document.title || ''}`.toLowerCase();
    const modules = Object.values(UTILITY_MODULES);
    const path = `${url.pathname || ''}${url.search || ''}${url.hash || ''}`;
    return modules.find((module) => typeof module.pageCheck === 'function' && module.pageCheck())
      || modules.find((module) => module.pathPatterns.some((pattern) => pattern.test(path)))
      || modules.find((module) => module.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
      || null;
  }

  async function waitForStocksPage() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (looksLikeStocksPage()) return true;
      await sleep(250);
    }
    return false;
  }

  async function waitForSupportedPage() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const mode = detectToolMode();
      if (mode) return mode;
      await sleep(250);
    }
    return '';
  }

  function removeAppUi() {
    clearNativeStockFilter({ silent: true });
    const panel = document.getElementById(APP.id);
    if (panel) panel.remove();
    const modal = document.getElementById(`${APP.id}-modal`);
    if (modal) modal.remove();
    removeNativeSearch();
    removeNativeFilterResetButton();
    state.elements.panel = null;
  }

  function safeUrlForLog(url) {
    return String(url).replace(/([?&]key=)[^&]+/i, '$1[hidden]');
  }

  function getActionMeta(action) {
    return ACTION_META[action] || { group: 'hold', className: 'watch' };
  }

  function getProfile() {
    return INVESTOR_PROFILES[state.settings.investorProfile] || INVESTOR_PROFILES.active;
  }

  function getStrategy() {
    return STRATEGY_METHODS[state.settings.strategyMode] || STRATEGY_METHODS.balanced;
  }

  function getCombo() {
    return STRATEGY_COMBOS[state.settings.strategyCombo] || STRATEGY_COMBOS.daily_swing;
  }

  function comboFromRisk(value) {
    const risk = clamp(parseNumber(value), 0, 100);
    const combos = Object.values(STRATEGY_COMBOS);
    return combos.reduce((best, combo) => (
      Math.abs(combo.risk - risk) < Math.abs(best.risk - risk) ? combo : best
    ), combos[0]);
  }

  function applyCombo(comboKey) {
    const combo = STRATEGY_COMBOS[comboKey] || STRATEGY_COMBOS.daily_swing;
    state.settings.strategyCombo = combo.key;
    state.settings.riskLevel = combo.risk;
    state.settings.strategyMode = combo.strategyMode;
    state.settings.investorProfile = combo.investorProfile;
    state.settings.ignoreBenefits = combo.ignoreBenefits;
  }

  function benefitsAreIgnored() {
    const strategy = getStrategy();
    return !!state.settings.ignoreBenefits || !strategy.allowBenefitAdvice;
  }

  function isApiKeyReasonable(key) {
    const value = String(key || '').trim();
    return value.length >= 8 && value.length <= 256 && !/\s/.test(value);
  }

  function toCacheKey(name) {
    return `${STORAGE.cachePrefix}${name}`;
  }

  async function readJsonStorage(key, fallback) {
    const raw = await storageGet(key, null);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[FLUZ] Bad stored JSON:', key, error);
      return fallback;
    }
  }

  async function writeJsonStorage(key, value) {
    await storageSet(key, JSON.stringify(value));
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  function signalLabelFromMomentum(score) {
    if (score >= 1.5) return 'Going Up';
    if (score >= 0.5) return 'Slightly Up';
    if (score <= -1.5) return 'Going Down';
    if (score <= -0.5) return 'Slightly Down';
    return 'Flat';
  }

  function benefitStatusText(position, benefit) {
    if (!benefit || !benefit.requirement) return 'No tracked block';
    if (!position) return `Need ${compactNumber(benefit.requirement)} shares`;
    if (position.hasBenefit) {
      return position.blockCount > 1 ? `${position.blockCount} active blocks` : 'Benefit active';
    }
    return `${Math.floor(position.benefitProgressPct)}% to block`;
  }

  function payoutStatusText(position) {
    if (!position) return 'Not owned';
    if (position.dividendReady) return 'Ready';
    return position.dividendProgress || 'Waiting';
  }

  function priorityLabel(priority) {
    if (priority >= 90) return 'Urgent';
    if (priority >= 70) return 'High';
    if (priority >= 45) return 'Medium';
    return 'Low';
  }

  // ---------------------------------------------------------------------------
  // Storage module
  // ---------------------------------------------------------------------------

  async function loadSettings() {
    const saved = await readJsonStorage(STORAGE.settings, {});
    state.settings = mergeSettings(DEFAULT_SETTINGS, saved);
    state.apiKey = await storageGet(STORAGE.apiKey, '');
    state.panel = await readJsonStorage(STORAGE.panelState, DEFAULT_PANEL_STATE);
    state.gym = mergeGymState(await readJsonStorage(STORAGE.gymState, DEFAULT_GYM_STATE));
    state.utility = mergeUtilityState(await readJsonStorage(STORAGE.utilityState, DEFAULT_UTILITY_STATE));
    if (state.panel.activeTab === 'settings' || state.panel.activeTab === 'about') {
      state.panel.activeTab = 'signals';
    }
    state.notificationHistory = await readJsonStorage(STORAGE.notificationHistory, {});
    state.priceMemory = await readJsonStorage(STORAGE.priceMemory, {});
    await loadMarketBazaarScanCache();
    const cachedMorale = await readJsonStorage(STORAGE.crimeMorale, null);
    if (cachedMorale && Number.isFinite(parseNumber(cachedMorale.morale))) {
      state.crimeMorale = {
        morale: clamp(parseNumber(cachedMorale.morale), 0, 100),
        demMod: parseNumber(cachedMorale.demMod),
        label: cachedMorale.label || 'Crime 2.0',
        updatedText: cachedMorale.fetchedAt ? `saved ${new Date(cachedMorale.fetchedAt).toLocaleTimeString()}` : 'saved'
      };
    }
  }

  function mergeSettings(defaults, saved) {
    return {
      ...defaults,
      ...saved,
      notifications: {
        ...defaults.notifications,
        ...(saved && saved.notifications ? saved.notifications : {})
      },
      lockedStocks: Array.isArray(saved && saved.lockedStocks) ? saved.lockedStocks : []
    };
  }

  async function saveSettings() {
    await writeJsonStorage(STORAGE.settings, state.settings);
  }

  async function savePanelState() {
    await writeJsonStorage(STORAGE.panelState, state.panel);
  }

  function mergeGymState(saved) {
    const base = JSON.parse(JSON.stringify(DEFAULT_GYM_STATE));
    const merged = { ...base, ...(saved || {}) };
    merged.target = { ...base.target, ...((saved && saved.target) || {}) };
    merged.manualStats = { ...base.manualStats, ...((saved && saved.manualStats) || {}) };
    merged.customBuilds = Array.isArray(saved && saved.customBuilds) ? saved.customBuilds : [];
    merged.availableGyms = Array.isArray(saved && saved.availableGyms) ? saved.availableGyms : [];
    return merged;
  }

  async function saveGymState() {
    await writeJsonStorage(STORAGE.gymState, state.gym);
  }

  function mergeUtilityState(saved) {
    const base = JSON.parse(JSON.stringify(DEFAULT_UTILITY_STATE));
    const merged = { ...base, ...(saved || {}) };
    merged.timers = Array.isArray(saved && saved.timers) ? saved.timers : [];
    merged.ignoredItems = Array.isArray(saved && saved.ignoredItems) ? saved.ignoredItems : [];
    merged.marketHiddenItemIds = Array.isArray(saved && saved.marketHiddenItemIds) ? saved.marketHiddenItemIds : [];
    merged.marketValueHiddenItemIds = Array.isArray(saved && saved.marketValueHiddenItemIds) ? saved.marketValueHiddenItemIds : [];
    merged.marketFilterPresets = normalizeMarketFilterPresets(saved && saved.marketFilterPresets);
    merged.addictionHistory = Array.isArray(saved && saved.addictionHistory) ? saved.addictionHistory.slice(-24) : [];
    merged.bookieSports = { ...base.bookieSports, ...((saved && saved.bookieSports) || {}) };
    merged.itemProfitPcts = { ...base.itemProfitPcts, ...((saved && saved.itemProfitPcts) || {}) };
    merged.travelOwnedItems = { ...base.travelOwnedItems, ...((saved && saved.travelOwnedItems) || {}) };
    merged.targetNoteFilters = Array.isArray(saved && saved.targetNoteFilters)
      ? saved.targetNoteFilters
      : (saved && saved.targetNoteFilter ? [saved.targetNoteFilter] : []);
    merged.targetTreeOpen = { ...base.targetTreeOpen, ...((saved && saved.targetTreeOpen) || {}) };
    merged.targetLists = normalizeTargetLists(saved && saved.targetLists);
    merged.chainFriendlyMembers = normalizeChainFriendlyMembers(saved && saved.chainFriendlyMembers);
    if (saved && saved.chainAlarmEnabled === false) {
      if (saved.chainMessageAlertEnabled === undefined) merged.chainMessageAlertEnabled = false;
      if (saved.chainTargetAlertEnabled === undefined) merged.chainTargetAlertEnabled = false;
      if (saved.chainWarningAlertEnabled === undefined) merged.chainWarningAlertEnabled = false;
    }
    if (saved && saved.chainMessageEnabled === false && saved.chainMessageAlertEnabled === undefined) {
      merged.chainMessageAlertEnabled = false;
    }
    return merged;
  }

  async function saveUtilityState() {
    await writeJsonStorage(STORAGE.utilityState, state.utility);
  }

  async function reloadUtilityStateFromStorage(keepView = true) {
    const previous = state.utility || {};
    const keep = keepView ? {
      activeTab: previous.activeTab,
      activeTargetListId: previous.activeTargetListId,
      targetAddOpen: previous.targetAddOpen,
      targetImportOpen: previous.targetImportOpen,
      factionAddOpen: previous.factionAddOpen
    } : {};
    state.utility = mergeUtilityState(await readJsonStorage(STORAGE.utilityState, DEFAULT_UTILITY_STATE));
    Object.entries(keep).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') state.utility[key] = value;
    });
    return state.utility;
  }

  async function loadMarketBazaarScanCache() {
    const cached = await readJsonStorage(STORAGE.marketBazaarScanCache, null);
    const rows = Array.isArray(cached && cached.rows) ? cached.rows : [];
    const cutoff = nowMs() - ITEM_MARKET_BAZAAR.scanCacheTtlMs;
    state.marketBazaarAllRows = rows
      .filter((row) => parseNumber(row && row.scannedAt) >= cutoff)
      .slice(-1200);
    state.marketBazaarAllScan = cached && cached.scan
      ? { index: Math.max(0, parseNumber(cached.scan.index)), total: Math.max(0, parseNumber(cached.scan.total)) }
      : { index: 0, total: state.marketBazaarAllRows.length };
  }

  async function saveMarketBazaarScanCache(force = false) {
    const now = nowMs();
    if (!force && now - (state.marketBazaarAllLastCacheWriteAt || 0) < ITEM_MARKET_BAZAAR.scanCacheWriteThrottleMs) return;
    state.marketBazaarAllLastCacheWriteAt = now;
    const cutoff = now - ITEM_MARKET_BAZAAR.scanCacheTtlMs;
    const rows = (state.marketBazaarAllRows || [])
      .filter((row) => parseNumber(row && row.scannedAt) >= cutoff)
      .slice(-1200);
    await writeJsonStorage(STORAGE.marketBazaarScanCache, {
      fetchedAt: now,
      rows,
      scan: state.marketBazaarAllScan || { index: 0, total: 0 }
    });
  }

  async function saveApiKey(key) {
    state.apiKey = String(key || '').trim();
    await storageSet(STORAGE.apiKey, state.apiKey);
  }

  async function clearApiKey() {
    state.apiKey = '';
    await storageSet(STORAGE.apiKey, '');
  }

  async function clearLocalData() {
    state.raw = null;
    state.tornsy = {};
    state.data = null;
    state.gymRaw = null;
    state.gymData = null;
    state.analyses = [];
    state.recommendations = [];
    state.notificationHistory = {};
    state.priceMemory = {};
    await writeJsonStorage(STORAGE.notificationHistory, {});
    await writeJsonStorage(STORAGE.priceMemory, {});
    await writeJsonStorage(STORAGE.tornsyCache, {});
    await writeJsonStorage(toCacheKey('market'), {});
    await writeJsonStorage(toCacheKey('user'), {});
    await writeJsonStorage(toCacheKey('bank'), {});
    await writeJsonStorage(toCacheKey('gymUser'), {});
    await writeJsonStorage(toCacheKey('gymItems'), {});
    await writeJsonStorage(toCacheKey('utilityUser'), {});
  }

  // ---------------------------------------------------------------------------
  // API module
  // ---------------------------------------------------------------------------

  function buildTornApiUrl(section, selections) {
    const key = encodeURIComponent(state.apiKey);
    return `${APP.apiBaseUrl}/${section}/?selections=${encodeURIComponent(selections)}&key=${key}`;
  }

  async function cachedHttpGetJson(cacheName, url, ttlMs, force) {
    const cacheKey = toCacheKey(cacheName);
    const cached = await readJsonStorage(cacheKey, null);
    if (state.tornApiBackoffUntil && nowMs() < state.tornApiBackoffUntil) {
      if (cached && cached.data) {
        return {
          data: cached.data,
          fromCache: true,
          stale: true,
          fetchedAt: cached.ts,
          warning: 'Using cached Torn API data during brief rate-limit backoff.'
        };
      }
      throw new Error('Torn API is briefly rate limited. Trying again shortly.');
    }
    if (!force && cached && cached.ts && nowMs() - cached.ts < ttlMs && cached.data) {
      return { data: cached.data, fromCache: true, stale: false, fetchedAt: cached.ts };
    }

    try {
      const data = await httpGetJson(url);
      if (isTornApiRateLimitPayload(data)) {
        state.tornApiBackoffUntil = nowMs() + 65000;
        throw new Error('Torn API 5: Too many requests. Brief backoff active.');
      }
      await writeJsonStorage(cacheKey, { ts: nowMs(), data });
      return { data, fromCache: false, stale: false, fetchedAt: nowMs() };
    } catch (error) {
      if (cached && cached.data) {
        return {
          data: cached.data,
          fromCache: true,
          stale: true,
          fetchedAt: cached.ts,
          warning: error.message
        };
      }
      throw error;
    }
  }

  function isTornApiRateLimitPayload(payload) {
    const code = payload && payload.error && String(payload.error.code || '');
    const message = payload && payload.error && String(payload.error.error || payload.error.message || '');
    return code === '5' || /too many requests/i.test(message);
  }

  function assertTornApiOk(payload, label) {
    if (!payload) throw new Error(`${label} returned no data.`);
    if (payload.error) {
      const code = payload.error.code || '?';
      const message = payload.error.error || payload.error.message || 'Unknown Torn API error';
      if (String(code) === '5') state.tornApiBackoffUntil = nowMs() + 65000;
      throw new Error(`Torn API ${code}: ${message}`);
    }
  }

  function isBriefCacheBackoffWarning(warning) {
    return /cached Torn API data during brief rate-limit backoff/i.test(String(warning || ''));
  }

  function cleanStockWarnings(warnings) {
    const unique = [...new Set((warnings || []).map((warning) => String(warning || '').trim()).filter(Boolean))];
    return unique.filter((warning) => !isBriefCacheBackoffWarning(warning));
  }

  async function fetchTornData(force = false) {
    if (!isApiKeyReasonable(state.apiKey)) {
      throw new Error('Missing or invalid API key. Add a Limited Access Torn API key in Profile.');
    }

    const [marketResult, userResult, bankResult] = await Promise.all([
      cachedHttpGetJson('market', buildTornApiUrl('torn', 'stocks'), APP.apiCacheTtlMs, force),
      cachedHttpGetJson('user', buildTornApiUrl('user', 'stocks,money'), APP.apiCacheTtlMs, force),
      cachedHttpGetJson('bank', buildTornApiUrl('torn', 'bank'), APP.apiCacheTtlMs, force)
        .catch((error) => ({ data: null, warning: error.message, fromCache: false, stale: false }))
    ]);

    assertTornApiOk(marketResult.data, 'Market data');
    assertTornApiOk(userResult.data, 'User data');
    if (bankResult.data) assertTornApiOk(bankResult.data, 'Bank data');

    state.cacheInfo = {
      market: marketResult,
      user: userResult,
      bank: bankResult
    };

    return {
      market: marketResult.data,
      user: userResult.data,
      bank: bankResult.data,
      warnings: cleanStockWarnings([marketResult.warning, userResult.warning, bankResult.warning])
    };
  }

  async function fetchGymData(force = false) {
    if (!isApiKeyReasonable(state.apiKey)) {
      return {
        user: {},
        items: {},
        warnings: ['Add a Limited Access API key for live stats, energy, happy, and item values.']
      };
    }

    const [userResult, itemResult] = await Promise.all([
      cachedHttpGetJson('gymUser', buildTornApiUrl('user', 'battlestats,bars,money,basic'), APP.apiCacheTtlMs, force)
        .catch((error) => ({ data: {}, warning: error.message, fromCache: false, stale: false })),
      cachedHttpGetJson('gymItems', buildTornApiUrl('torn', 'items'), APP.itemDbCacheTtlMs, force)
        .catch((error) => ({ data: {}, warning: error.message, fromCache: false, stale: false }))
    ]);

    const warnings = [];
    if (userResult.warning) warnings.push(`Gym user data: ${userResult.warning}`);
    if (itemResult.warning) warnings.push(`Item values: ${itemResult.warning}`);
    if (userResult.data && userResult.data.error) warnings.push(`Gym user data: ${userResult.data.error.error || 'API error'}`);
    if (itemResult.data && itemResult.data.error) warnings.push(`Item values: ${itemResult.data.error.error || 'API error'}`);

    state.cacheInfo.gymUser = userResult;
    state.cacheInfo.gymItems = itemResult;

    return {
      user: userResult.data && !userResult.data.error ? userResult.data : {},
      items: itemResult.data && !itemResult.data.error ? itemResult.data.items || {} : {},
      warnings
    };
  }

  async function fetchUtilityData(force = false) {
    const warnings = [];
    const cachedItems = await readJsonStorage(toCacheKey('gymItems'), null);
    const output = {
      user: {},
      items: cachedItems && cachedItems.data && !cachedItems.data.error ? cachedItems.data.items || {} : {},
      warnings
    };

    if (!isApiKeyReasonable(state.apiKey)) {
      warnings.push('Add a Limited Access API key for live item values and home stats.');
      return output;
    }

    const [userResult, itemResult] = await Promise.all([
      cachedHttpGetJson('utilityUser', buildTornApiUrl('user', 'battlestats,bars,money,basic,icons,personalstats'), APP.apiCacheTtlMs, force)
        .catch((error) => ({ data: {}, warning: error.message, fromCache: false, stale: false })),
      cachedHttpGetJson('gymItems', buildTornApiUrl('torn', 'items'), APP.itemDbCacheTtlMs, force)
        .catch((error) => ({ data: cachedItems && cachedItems.data ? cachedItems.data : {}, warning: error.message, fromCache: !!cachedItems, stale: !!cachedItems }))
    ]);

    if (userResult.warning) warnings.push(`Home stats: ${userResult.warning}`);
    if (itemResult.warning) warnings.push(`Item values: ${itemResult.warning}`);
    if (userResult.data && userResult.data.error) warnings.push(`Home stats: ${userResult.data.error.error || 'API error'}`);
    if (itemResult.data && itemResult.data.error) warnings.push(`Item values: ${itemResult.data.error.error || 'API error'}`);

    state.cacheInfo.utilityUser = userResult;
    state.cacheInfo.gymItems = itemResult;

    return {
      user: userResult.data && !userResult.data.error ? userResult.data : {},
      items: itemResult.data && !itemResult.data.error ? itemResult.data.items || {} : output.items,
      warnings
    };
  }

  async function fetchTornsyData(stocks, force = false) {
    if (!state.settings.enableTornsy) return {};

    const cache = await readJsonStorage(STORAGE.tornsyCache, {});
    if (!force && cache.ts && nowMs() - cache.ts < APP.tornsyCacheTtlMs && cache.data) {
      state.cacheInfo.tornsy = { fromCache: true, stale: false, fetchedAt: cache.ts };
      return cache.data;
    }

    const output = {};
    const acronyms = stocks.map((stock) => stock.acronym).filter(Boolean);
    try {
      for (let index = 0; index < acronyms.length; index += 5) {
        const batch = acronyms.slice(index, index + 5);
        const results = await Promise.all(batch.map((acronym) => fetchTornsyForStock(acronym)));
        batch.forEach((acronym, offset) => {
          output[acronym] = results[offset];
        });
        if (index + 5 < acronyms.length) await sleep(150);
      }
      await writeJsonStorage(STORAGE.tornsyCache, { ts: nowMs(), data: output });
      state.cacheInfo.tornsy = { fromCache: false, stale: false, fetchedAt: nowMs() };
      return output;
    } catch (error) {
      if (cache && cache.data) {
        state.cacheInfo.tornsy = { fromCache: true, stale: true, fetchedAt: cache.ts, warning: error.message };
        return cache.data;
      }
      state.cacheInfo.tornsy = { fromCache: false, stale: false, warning: error.message };
      return {};
    }
  }

  async function fetchTornsyForStock(acronym) {
    const url = `${APP.tornsyBaseUrl}/${encodeURIComponent(acronym)}?interval=h1`;
    try {
      const payload = await httpGetJson(url);
      const data = payload && Array.isArray(payload.data) ? payload.data : payload;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('[FLUZ] Tornsy unavailable for', acronym, error.message);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Data normalization module
  // ---------------------------------------------------------------------------

  function normalizeAll(raw, tornsyData) {
    const marketStocks = normalizeMarketStocks(raw.market && raw.market.stocks);
    const userStocks = normalizeUserStocks(raw.user && raw.user.stocks);
    const userCash = normalizeUserCash(raw.user || {});
    const bank = normalizeBank(raw.bank || {}, raw.user || {});
    recordPriceMemory(marketStocks);

    const analyses = marketStocks.map((stock) => analyzeStock(stock, userStocks.get(String(stock.id)), userCash, bank, tornsyData));
    analyses.sort((a, b) => a.acronym.localeCompare(b.acronym));

    return { marketStocks, userStocks, userCash, bank, analyses, warnings: raw.warnings || [] };
  }

  function recordPriceMemory(stocks) {
    if (!state.settings.enableLocalMemory || !Array.isArray(stocks)) return;
    const ts = nowMs();
    const next = { ...(state.priceMemory || {}) };
    stocks.forEach((stock) => {
      if (!stock || !stock.acronym || !stock.price) return;
      const key = stock.acronym;
      const history = Array.isArray(next[key]) ? next[key].slice() : [];
      const last = history[history.length - 1];
      if (!last || Math.abs(last.price - stock.price) > 0.0001 || ts - last.ts > 30 * 60 * 1000) {
        history.push({ ts, price: stock.price });
      }
      const cutoff = ts - 45 * 24 * 60 * 60 * 1000;
      next[key] = history.filter((point) => point.ts >= cutoff).slice(-720);
    });
    state.priceMemory = next;
    writeJsonStorage(STORAGE.priceMemory, next);
  }

  function getObservedMemory(acronym) {
    const history = state.priceMemory && state.priceMemory[acronym];
    if (!Array.isArray(history) || history.length < 2) {
      return { samples: history ? history.length : 0, change1d: null, change7d: null, change30d: null, slope: 0 };
    }
    const latest = history[history.length - 1];
    return {
      samples: history.length,
      change1d: observedChangeSince(history, latest.ts - 24 * 60 * 60 * 1000),
      change7d: observedChangeSince(history, latest.ts - 7 * 24 * 60 * 60 * 1000),
      change30d: observedChangeSince(history, latest.ts - 30 * 24 * 60 * 60 * 1000),
      slope: observedSlope(history)
    };
  }

  function observedChangeSince(history, cutoffTs) {
    const latest = history[history.length - 1];
    const point = history.find((entry) => entry.ts >= cutoffTs) || history[0];
    return point && point.price ? percentChange(point.price, latest.price) : null;
  }

  function observedSlope(history) {
    const slice = history.slice(-Math.min(20, history.length));
    if (slice.length < 2) return 0;
    let up = 0;
    let down = 0;
    for (let index = 1; index < slice.length; index += 1) {
      const diff = slice[index].price - slice[index - 1].price;
      if (diff > 0) up += 1;
      if (diff < 0) down += 1;
    }
    return (up - down) / Math.max(1, slice.length - 1);
  }

  function normalizeMarketStocks(stocks) {
    if (!stocks || typeof stocks !== 'object') return [];
    return Object.entries(stocks).map(([id, raw]) => {
      const acronym = String(raw.acronym || raw.ticker || raw.shortname || id).toUpperCase();
      const fallback = BENEFIT_DATABASE[acronym] || {};
      const price = parseNumber(raw.current_price ?? raw.price ?? raw.market_price ?? raw.value);
      const benefit = normalizeBenefit(raw.benefit, fallback, price);
      return {
        id: String(id),
        name: raw.name || fallback.name || acronym,
        acronym,
        price,
        totalShares: parseNumber(raw.total_shares),
        availableShares: parseNumber(raw.available_shares),
        forecast: raw.forecast || raw.forecast_text || '',
        demand: raw.demand || raw.demand_text || '',
        raw,
        benefit
      };
    }).filter((stock) => stock.price > 0 || stock.acronym);
  }

  function normalizeBenefit(rawBenefit, fallback, price) {
    if (!rawBenefit && !fallback) return null;
    const requirement = parseNumber(rawBenefit && (rawBenefit.requirement ?? rawBenefit.required_shares));
    const frequency = parseNumber(rawBenefit && (rawBenefit.frequency ?? rawBenefit.frequency_days)) || null;
    const annualValue = parseNumber(fallback && fallback.annualValue);
    const blockCost = requirement > 0 && price > 0 ? requirement * price : 0;
    return {
      type: (rawBenefit && rawBenefit.type) || (annualValue > 0 ? 'active' : 'passive'),
      requirement,
      frequencyDays: frequency,
      description: (rawBenefit && (rawBenefit.description || rawBenefit.name)) || '',
      annualValue,
      note: (fallback && fallback.note) || '',
      tier: (fallback && fallback.tier) || '',
      blockCost,
      annualRoi: annualValue > 0 && blockCost > 0 ? (annualValue / blockCost) * 100 : 0
    };
  }

  function normalizeUserStocks(stocks) {
    const map = new Map();
    if (!stocks || typeof stocks !== 'object') return map;
    Object.entries(stocks).forEach(([id, holding]) => {
      map.set(String(id), holding || {});
    });
    return map;
  }

  function normalizeUserCash(user) {
    const wallet = parseNumber(user.money_onhand ?? user.money);
    const vault = parseNumber(user.vault_amount ?? user.vault);
    const company = parseNumber(user.company_funds ?? user.company_balance);
    const cayman = parseNumber(user.cayman_bank);
    return {
      wallet,
      vault,
      company,
      cayman,
      immediate: Math.max(0, wallet) + Math.max(0, vault) + Math.max(0, company),
      totalIncludingCayman: Math.max(0, wallet) + Math.max(0, vault) + Math.max(0, company) + Math.max(0, cayman)
    };
  }

  function normalizeBank(bankPayload, userPayload) {
    const table = extractBankAprTable(bankPayload && bankPayload.bank);
    const bonus = parseNumber(state.settings.bankBonusPct);
    const withBonus = {};
    BANK_TERMS.forEach((term) => {
      withBonus[term.days] = table[term.days] > 0 ? table[term.days] + bonus : 0;
    });

    const cityBank = userPayload.city_bank || {};
    const amount = parseNumber(cityBank.amount);
    const timeLeft = parseNumber(cityBank.time_left ?? cityBank.timeLeft);
    return {
      aprByDays: withBonus,
      baseAprByDays: table,
      bonusPct: bonus,
      activeInvestment: amount > 0 && timeLeft > 0,
      investmentAmount: amount,
      investmentTimeLeft: timeLeft
    };
  }

  function extractBankAprTable(bank) {
    const table = { 7: 0, 14: 0, 31: 0, 62: 0, 93: 0 };
    if (!bank || typeof bank !== 'object') return table;
    BANK_TERMS.forEach((term) => {
      const candidates = [
        bank[term.days],
        bank[String(term.days)],
        bank[term.label],
        bank[`term_${term.days}`],
        bank[`${term.days}_days`]
      ];
      const match = candidates.find((value) => value !== undefined && value !== null);
      if (typeof match === 'number' || typeof match === 'string') {
        table[term.days] = parseNumber(match);
      } else if (match && typeof match === 'object') {
        table[term.days] = parseNumber(match.apr ?? match.interest ?? match.rate);
      }
    });
    return table;
  }

  // ---------------------------------------------------------------------------
  // Technical analysis module
  // ---------------------------------------------------------------------------

  function calculateSma(values, period) {
    if (!values || values.length < period) return null;
    const slice = values.slice(values.length - period);
    return slice.reduce((sum, value) => sum + value, 0) / period;
  }

  function calculateRsi(values, period) {
    if (!values || values.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let index = values.length - period; index < values.length; index += 1) {
      const change = values[index] - values[index - 1];
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    if (losses === 0) return 100;
    const relativeStrength = (gains / period) / (losses / period);
    return 100 - (100 / (1 + relativeStrength));
  }

  function analyzeTechnicals(candles, rsiPeriod) {
    const normalized = normalizeCandles(candles);
    if (normalized.length < 20) return null;
    const closes = normalized.map((candle) => candle.close).filter((value) => value > 0);
    if (closes.length < 20) return null;

    const current = closes[closes.length - 1];
    const sma7 = calculateSma(closes, 7);
    const sma20 = calculateSma(closes, 20);
    const sma50 = calculateSma(closes, 50);
    const rsi = calculateRsi(closes, Math.min(rsiPeriod, Math.max(2, closes.length - 1)));
    const change7d = closes.length >= 168 ? percentChange(closes[closes.length - 168], current) : null;
    const change30d = closes.length >= 720 ? percentChange(closes[closes.length - 720], current) : null;
    const rangeSlice = closes.slice(-Math.min(720, closes.length));
    const high30 = Math.max(...rangeSlice);
    const low30 = Math.min(...rangeSlice);
    const rangePosition = high30 > low30 ? ((current - low30) / (high30 - low30)) * 100 : 50;

    let momentumScore = 0;
    if (rsi != null) {
      if (rsi < 30) momentumScore += 1.5;
      else if (rsi < 40) momentumScore += 0.75;
      else if (rsi > 75) momentumScore -= 1.5;
      else if (rsi > 65) momentumScore -= 0.75;
    }
    if (sma7 && current > sma7) momentumScore += 0.4;
    if (sma20 && current > sma20) momentumScore += 0.6;
    if (change7d != null) {
      if (change7d > 4) momentumScore += 0.5;
      if (change7d < -4) momentumScore -= 0.5;
    }
    momentumScore = clamp(momentumScore, -3, 3);

    return {
      sma7,
      sma20,
      sma50,
      rsi,
      change7d,
      change30d,
      rangePosition,
      momentumScore,
      signal: signalLabelFromMomentum(momentumScore)
    };
  }

  function normalizeCandles(candles) {
    if (!Array.isArray(candles)) return [];
    return candles.map((item) => {
      if (Array.isArray(item)) {
        return {
          time: parseNumber(item[0]),
          open: parseNumber(item[1]),
          high: parseNumber(item[2]),
          low: parseNumber(item[3]),
          close: parseNumber(item[4])
        };
      }
      return {
        time: parseNumber(item.t ?? item.time ?? item.timestamp),
        open: parseNumber(item.o ?? item.open),
        high: parseNumber(item.h ?? item.high),
        low: parseNumber(item.l ?? item.low),
        close: parseNumber(item.c ?? item.close)
      };
    }).filter((candle) => candle.close > 0);
  }

  function percentChange(oldValue, newValue) {
    if (!oldValue) return null;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  // ---------------------------------------------------------------------------
  // Benefit analysis module
  // ---------------------------------------------------------------------------

  function computeBenefitProgress(totalShares, benefit) {
    if (!benefit || benefit.requirement <= 0) {
      return { blockCount: 0, sharesAboveBlock: 0, sharesToNextBlock: 0, progressPct: 0 };
    }

    const requirement = benefit.requirement;
    if (benefit.type === 'active' && totalShares >= requirement) {
      const blockCount = Math.floor(Math.log2((totalShares / requirement) + 1));
      const sharesForBlocks = requirement * ((2 ** blockCount) - 1);
      const sharesAboveBlock = Math.max(0, totalShares - sharesForBlocks);
      const sharesToNextBlock = requirement * (2 ** blockCount) - sharesAboveBlock;
      return {
        blockCount,
        sharesAboveBlock,
        sharesToNextBlock,
        progressPct: 100
      };
    }

    const active = totalShares >= requirement;
    return {
      blockCount: active ? 1 : 0,
      sharesAboveBlock: active ? Math.max(0, totalShares - requirement) : 0,
      sharesToNextBlock: active ? 0 : Math.max(0, requirement - totalShares),
      progressPct: requirement > 0 ? clamp((totalShares / requirement) * 100, 0, 100) : 0
    };
  }

  function getComparableBankApr(benefit, bank) {
    if (!benefit || !bank) return null;
    const frequency = benefit.frequencyDays || 31;
    const term = BANK_TERMS.find((entry) => entry.days >= frequency) || BANK_TERMS[BANK_TERMS.length - 1];
    const apr = bank.aprByDays[term.days] || 0;
    return {
      termDays: term.days,
      termLabel: term.label,
      apr,
      beatsBenefit: benefit.annualRoi > 0 && apr > benefit.annualRoi,
      actionable: benefit.annualRoi > 0 && apr > benefit.annualRoi && !bank.activeInvestment
    };
  }

  function enrichBenefit(stock, bank) {
    if (!stock.benefit) return null;
    const benefit = { ...stock.benefit };
    benefit.blockCost = benefit.requirement > 0 && stock.price > 0 ? benefit.requirement * stock.price : 0;
    benefit.annualRoi = benefit.annualValue > 0 && benefit.blockCost > 0 ? (benefit.annualValue / benefit.blockCost) * 100 : 0;
    benefit.bankComparison = getComparableBankApr(benefit, bank);
    return benefit;
  }

  // ---------------------------------------------------------------------------
  // Portfolio analysis module
  // ---------------------------------------------------------------------------

  function analyzeStock(stock, holding, userCash, bank, tornsyData) {
    const benefit = enrichBenefit(stock, bank);
    const position = holding ? analyzePosition(stock, holding, benefit) : null;
    const technicals = analyzeTechnicals(tornsyData[stock.acronym], getProfile().rsiPeriod);
    const memory = getObservedMemory(stock.acronym);
    const topUp = analyzeTopUp(stock, position, benefit, userCash);

    return {
      ...stock,
      benefit,
      position,
      technicals,
      memory,
      topUp,
      locked: isStockLocked(stock.id),
      bank,
      userCash
    };
  }

  function analyzePosition(stock, holding, benefit) {
    const transactions = holding.transactions && typeof holding.transactions === 'object'
      ? Object.values(holding.transactions)
      : [];
    let transactionShares = 0;
    let transactionCost = 0;
    transactions.forEach((transaction) => {
      const shares = parseNumber(transaction.shares);
      const price = parseNumber(transaction.bought_price ?? transaction.price);
      transactionShares += shares;
      transactionCost += shares * price;
    });

    const apiShares = parseNumber(holding.total_shares ?? holding.shares ?? holding.quantity);
    const totalShares = apiShares > 0 ? apiShares : transactionShares;
    let costBasis = transactionCost;
    if (transactionShares > totalShares && transactionShares > 0) {
      costBasis *= totalShares / transactionShares;
    }
    if (costBasis <= 0 && parseNumber(holding.average_price) > 0) {
      costBasis = totalShares * parseNumber(holding.average_price);
    }

    const averageBuyPrice = totalShares > 0 ? costBasis / totalShares : 0;
    const currentValue = totalShares * stock.price;
    const sellFee = currentValue * (APP.sellFeePct / 100);
    const sellProceeds = Math.max(0, currentValue - sellFee);
    const grossProfitLoss = currentValue - costBasis;
    const profitLoss = sellProceeds - costBasis;
    const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
    const progress = computeBenefitProgress(totalShares, benefit);
    const dividend = holding.dividend || {};
    const dividendReady = parseNumber(dividend.ready) > 0 || dividend.ready === true;
    const dividendProgress = dividend.progress != null && dividend.frequency != null
      ? `${dividend.progress}/${dividend.frequency}d`
      : '';
    const highTier = benefit && (benefit.tier === 'S' || benefit.tier === 'A');
    const partialThreshold = highTier ? APP.partialHighTierMinPct : APP.partialBenefitMinPct;
    const isPartialBenefit = !!benefit
      && benefit.requirement > 0
      && totalShares > 0
      && totalShares < benefit.requirement
      && progress.progressPct >= partialThreshold;

    return {
      totalShares,
      averageBuyPrice,
      currentValue,
      sellFee,
      sellProceeds,
      costBasis,
      grossProfitLoss,
      profitLoss,
      profitLossPct,
      hasBenefit: progress.blockCount > 0,
      blockCount: progress.blockCount,
      sharesAboveBlock: progress.sharesAboveBlock,
      sharesToNextBlock: progress.sharesToNextBlock,
      benefitProgressPct: progress.progressPct,
      isPartialBenefit,
      dividendReady,
      dividendProgress
    };
  }

  // ---------------------------------------------------------------------------
  // Gym analysis module
  // ---------------------------------------------------------------------------

  function normalizeGymData(raw) {
    const user = raw && raw.user ? raw.user : {};
    const stats = normalizeBattleStats(user);
    const bars = normalizeBars(user);
    const items = normalizeBoostItems(raw && raw.items ? raw.items : {});
    const build = getGymBuild();
    const currentGym = getSelectedGym();
    const recommendation = buildGymRecommendation(stats, build.target, currentGym, bars);
    return {
      stats,
      bars,
      items,
      build,
      currentGym,
      recommendation,
      warnings: raw.warnings || []
    };
  }

  function normalizeBattleStats(user) {
    const manual = state.gym.manualStats || {};
    const apiStats = {
      strength: parseNumber(user.strength ?? (user.battlestats && user.battlestats.strength)),
      speed: parseNumber(user.speed ?? (user.battlestats && user.battlestats.speed)),
      defense: parseNumber(user.defense ?? (user.battlestats && user.battlestats.defense)),
      dexterity: parseNumber(user.dexterity ?? (user.battlestats && user.battlestats.dexterity))
    };
    const output = {};
    GYM_STATS.forEach((stat) => {
      output[stat] = apiStats[stat] > 0 ? apiStats[stat] : parseNumber(manual[stat]);
    });
    return output;
  }

  function normalizeBars(user) {
    const energy = user.energy || {};
    const nerve = user.nerve || {};
    const happy = user.happy || {};
    return {
      energy: {
        current: parseNumber(energy.current ?? energy.now),
        maximum: parseNumber(energy.maximum ?? energy.max)
      },
      nerve: {
        current: parseNumber(nerve.current ?? nerve.now),
        maximum: parseNumber(nerve.maximum ?? nerve.max)
      },
      happy: {
        current: parseNumber(happy.current ?? happy.now),
        maximum: parseNumber(happy.maximum ?? happy.max)
      },
      money: parseNumber(user.money_onhand ?? user.money)
    };
  }

  function normalizeBoostItems(items) {
    const allItems = Object.values(items || {});
    return GYM_BOOST_ITEMS.map((boost) => {
      const match = allItems.find((item) => String(item.name || '').toLowerCase() === boost.name.toLowerCase())
        || allItems.find((item) => String(item.name || '').toLowerCase().includes(boost.name.toLowerCase()));
      return {
        ...boost,
        name: match && match.name ? String(match.name) : boost.name,
        value: match ? parseNumber(match.market_value ?? match.value ?? match.price) : 0
      };
    });
  }

  function getGymBuild() {
    if (String(state.gym.buildKey || '').startsWith('saved:')) {
      const id = String(state.gym.buildKey).slice(6);
      const saved = (state.gym.customBuilds || []).find((build) => build.id === id);
      if (saved) {
        return {
          key: `saved:${saved.id}`,
          label: saved.name || 'Saved build',
          target: normalizeGymTarget(saved.target),
          note: 'Your saved custom build.'
        };
      }
    }
    if (state.gym.buildKey === 'custom') {
      return {
        key: 'custom',
        label: state.gym.customBuildName || 'Custom',
        target: normalizeGymTarget(state.gym.target),
        note: 'Your custom saved build target.'
      };
    }
    return GYM_BUILDS[state.gym.buildKey] || GYM_BUILDS.balanced;
  }

  function normalizeGymTarget(target) {
    const cleaned = {};
    let total = 0;
    GYM_STATS.forEach((stat) => {
      cleaned[stat] = Math.max(0, parseNumber(target && target[stat]));
      total += cleaned[stat];
    });
    if (total <= 0) return { ...DEFAULT_GYM_STATE.target };
    GYM_STATS.forEach((stat) => {
      cleaned[stat] = Math.round((cleaned[stat] / total) * 100);
    });
    return cleaned;
  }

  function getSelectedGym() {
    return GYM_DATABASE.find((gym) => gym.name === state.gym.selectedGym) || GYM_DATABASE.find((gym) => gym.name === "George's") || GYM_DATABASE[0];
  }

  function buildGymRecommendation(stats, target, gym, bars) {
    const total = GYM_STATS.reduce((sum, stat) => sum + Math.max(0, stats[stat]), 0);
    const gaps = GYM_STATS.map((stat) => {
      const actualPct = total > 0 ? (stats[stat] / total) * 100 : 0;
      const targetPct = parseNumber(target[stat]);
      const gap = targetPct - actualPct;
      const gymGain = gym && gym.gains ? gym.gains[stat] || 0 : 0;
      return { stat, actualPct, targetPct, gap, gymGain };
    }).sort((a, b) => b.gap - a.gap || b.gymGain - a.gymGain);

    const bestNeed = gaps[0];
    const bestGym = bestGymForStat(bestNeed.stat);
    const bestAvailableGym = bestAvailableGymForStat(bestNeed.stat);
    const trainsNow = gym && gym.energy > 0 ? Math.floor((bars.energy.current || 0) / gym.energy) : 0;
    return {
      stat: bestNeed.stat,
      gap: bestNeed.gap,
      actualPct: bestNeed.actualPct,
      targetPct: bestNeed.targetPct,
      currentGymGain: bestNeed.gymGain,
      bestGym,
      bestAvailableGym,
      trainsNow,
      message: `${statLabel(bestNeed.stat)} is furthest below target (${bestNeed.actualPct.toFixed(1)}% now vs ${bestNeed.targetPct.toFixed(0)}% target).`
    };
  }

  function bestGymForStat(stat) {
    return GYM_DATABASE
      .filter((gym) => gym.gains[stat] > 0)
      .slice()
      .sort((a, b) => b.gains[stat] - a.gains[stat] || a.energy - b.energy)[0];
  }

  function getAvailableGymNames() {
    return Array.isArray(state.gym.availableGyms) ? state.gym.availableGyms : [];
  }

  function isGymMarkedAvailable(gymName) {
    const names = getAvailableGymNames();
    return !names.length || names.includes(gymName);
  }

  function bestAvailableGymForStat(stat) {
    const marked = getAvailableGymNames();
    const pool = marked.length
      ? GYM_DATABASE.filter((gym) => marked.includes(gym.name))
      : GYM_DATABASE;
    return pool
      .filter((gym) => gym.gains[stat] > 0)
      .slice()
      .sort((a, b) => b.gains[stat] - a.gains[stat] || a.energy - b.energy)[0] || bestGymForStat(stat);
  }

  function statLabel(stat) {
    return {
      strength: 'Strength',
      speed: 'Speed',
      defense: 'Defense',
      dexterity: 'Dexterity'
    }[stat] || stat;
  }

  function totalBattleStats(stats) {
    return GYM_STATS.reduce((sum, stat) => sum + Math.max(0, parseNumber(stats && stats[stat])), 0);
  }

  function getKnownItemRecords() {
    const rawItems = (state.utilityData && state.utilityData.items)
      || (state.gymRaw && state.gymRaw.items)
      || {};
    const rows = Object.entries(rawItems || {}).map(([id, item]) => ({
      id,
      name: String(item && item.name ? item.name : '').trim(),
      category: String(item && (item.type || item.category || item.item_type || item.itemType || item.kind) ? (item.type || item.category || item.item_type || item.itemType || item.kind) : 'Other').trim() || 'Other',
      value: parseNumber(item && (item.market_value ?? item.marketValue ?? item.value ?? item.sell_price ?? item.buy_price))
    })).filter((item) => item.name);
    const names = new Set(rows.map((item) => item.name.toLowerCase()));
    LOCAL_ITEM_RECORDS.forEach((item) => {
      if (!names.has(item.name.toLowerCase())) rows.push({ ...item });
    });
    return rows;
  }

  function scanVisibleInventoryStacks() {
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    if (!document.body) return [];
    const rows = Array.from(document.querySelectorAll('li, tr, [class*="row"], [class*="item"], [class*="inventory"]'))
      .filter((node) => !node.closest(`#${APP.id}, #${APP.id}-modal, script, style, noscript`))
      .filter((node) => {
        const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
        return !rect || (rect.width > 20 && rect.height > 8);
      })
      .map((node) => normalizeInventoryRowText(node))
      .filter((text) => text.length >= 4 && text.length <= 320 && /\$|x\s*[\d,]+|[\d,]+\s*x/i.test(text));
    const uniqueRows = Array.from(new Set(rows)).slice(0, 700);
    const grouped = new Map();

    uniqueRows.forEach((text) => {
      const lower = text.toLowerCase();
      const item = known.find((candidate) => lower.includes(candidate.name.toLowerCase())) || inferInventoryItemFromRow(text);
      if (!item || !item.name) return;
      const quantity = extractQuantityNearItem(text, item.name);
      const value = parseNumber(item.value) || extractInventoryEachValue(text, quantity);
      if (!value) return;
      const current = grouped.get(item.name);
      const nextQuantity = Math.max(quantity, current ? current.quantity : 0);
      grouped.set(item.name, {
        name: item.name,
        quantity: nextQuantity || 1,
        value,
        total: (nextQuantity || 1) * value
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }

  function normalizeInventoryRowText(node) {
    return (node.innerText || node.textContent || '')
      .replace(/\b(send|trade|use|delete|trash|bazaar|market|favorite|equip|unequip)\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inferInventoryItemFromRow(text) {
    if (!/\$/.test(text)) return null;
    const beforeMoney = text.split('$')[0]
      .replace(/\b\d+\s*[HhNn]\b/g, ' ')
      .replace(/\bx\s*[\d,]+/ig, ' ')
      .replace(/\b[\d,]+\s*x\b/ig, ' ')
      .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
      .replace(/[|=•]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = beforeMoney.split(' ').filter(Boolean);
    if (!words.length || words.length > 6) return null;
    const name = words.join(' ');
    const value = extractInventoryEachValue(text, extractQuantityNearItem(text, name));
    return value ? { name, value } : null;
  }

  function extractInventoryEachValue(text, quantity = 1) {
    const prices = Array.from(String(text || '').matchAll(/\$([\d,.]+[kmbt]?)/gi)).map((match) => parseMoneyText(match[1])).filter((value) => value > 0);
    if (!prices.length) return 0;
    const qty = Math.max(1, parseNumber(quantity));
    const totalMatch = String(text || '').match(/([\d,]+)\s*x\s*=\s*\$([\d,.]+[kmbt]?)/i);
    if (totalMatch) {
      const totalQty = Math.max(1, parseNumber(totalMatch[1]));
      const total = parseMoneyText(totalMatch[2]);
      if (total > 0) return Math.round(total / totalQty);
    }
    if (prices.length > 1 && qty > 1) return Math.min(...prices);
    return prices[0];
  }

  function getIgnoredItemSet() {
    return new Set((state.utility.ignoredItems || []).map((name) => String(name).toLowerCase()));
  }

  function sortRows(rows, key, dir, fallbackKey = 'name') {
    const direction = dir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const numeric = typeof av === 'number' || typeof bv === 'number';
      if (numeric) {
        const diff = (parseNumber(av) - parseNumber(bv)) * direction;
        if (diff) return diff;
      } else {
        const diff = String(av || '').localeCompare(String(bv || '')) * direction;
        if (diff) return diff;
      }
      return String(a[fallbackKey] || '').localeCompare(String(b[fallbackKey] || ''));
    });
  }

  function sortHeader(label, table, key) {
    const currentKey = table === 'inventory' ? state.utility.inventorySortKey : state.utility.citySortKey;
    const currentDir = table === 'inventory' ? state.utility.inventorySortDir : state.utility.citySortDir;
    const marker = currentKey === key ? (currentDir === 'asc' ? ' ^' : ' v') : '';
    return `<button class="fluz-sort-head" data-action="sort-utility-table" data-sort-table="${escapeHtml(table)}" data-sort-key="${escapeHtml(key)}">${escapeHtml(label)}${marker}</button>`;
  }

  function itemProfitKey(itemName) {
    return String(itemName || '').trim().toLowerCase();
  }

  function getItemProfitPct(itemName, fallback = 0) {
    const key = itemProfitKey(itemName);
    const stored = state.utility.itemProfitPcts && Object.prototype.hasOwnProperty.call(state.utility.itemProfitPcts, key)
      ? state.utility.itemProfitPcts[key]
      : fallback;
    return parseNumber(stored);
  }

  function extractQuantityNearItem(text, itemName) {
    const itemPattern = escapeRegExp(itemName);
    const patterns = [
      new RegExp(`(?:x|qty|quantity|amount|owned)\\s*:?\\s*([\\d,]+)`, 'i'),
      new RegExp(`([\\d,]+)\\s*(?:x|pcs|units)\\b`, 'i'),
      new RegExp(`${itemPattern}.{0,80}?([\\d,]+)\\s*(?:x|pcs|units)\\b`, 'i'),
      new RegExp(`([\\d,]+)\\s*(?:x|pcs|units)?.{0,80}?${itemPattern}`, 'i')
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && parseNumber(match[1]) > 0 && parseNumber(match[1]) < 100000000) return parseNumber(match[1]);
    }
    return 1;
  }

  function extractVisibleLabelNumber(label) {
    const text = (document.body && document.body.innerText ? document.body.innerText : '').replace(/\s+/g, ' ');
    const pattern = new RegExp(`${escapeRegExp(label)}\\s*:?\\s*\\$?([\\d,.]+[kmbt]?)`, 'i');
    const match = text.match(pattern);
    return match ? parseMoneyText(match[1]) : 0;
  }

  function itemMarketUrl(itemName) {
    const name = cleanBookieText(itemName);
    const known = itemIdForName(name);
    if (known) return `https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${encodeURIComponent(String(known))}`;
    return `https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&keyword=${encodeURIComponent(name)}`;
  }

  function itemIdForName(itemName) {
    const key = cleanBookieText(itemName).toLowerCase();
    if (!key) return 0;
    if (COMMON_ITEM_IDS[key]) return COMMON_ITEM_IDS[key];
    const travel = TRAVEL_ITEM_CATALOG.find((item) => item.name.toLowerCase() === key);
    if (travel && travel.id) return travel.id;
    const known = getKnownItemRecords().find((item) => String(item.name || '').toLowerCase() === key);
    return known && known.id ? known.id : 0;
  }

  function analyzeTopUp(stock, position, benefit, userCash) {
    if (!position || !benefit || !position.isPartialBenefit) return null;
    const sharesNeeded = position.sharesToNextBlock;
    const cost = sharesNeeded * stock.price;
    return {
      sharesNeeded,
      cost,
      affordable: userCash.immediate >= cost,
      affordableWithCayman: userCash.totalIncludingCayman >= cost,
      shortfall: Math.max(0, cost - userCash.immediate)
    };
  }

  function isStockLocked(stockId) {
    return state.settings.lockedStocks.includes(String(stockId));
  }

  async function toggleStockLock(stockId) {
    const id = String(stockId);
    const set = new Set(state.settings.lockedStocks.map(String));
    if (set.has(id)) set.delete(id);
    else set.add(id);
    state.settings.lockedStocks = Array.from(set);
    await saveSettings();
    await refreshAnalysisOnly();
  }

  // ---------------------------------------------------------------------------
  // Recommendation engine
  // ---------------------------------------------------------------------------

  function buildRecommendations(analyses, data) {
    const profile = getProfile();
    const strategy = getStrategy();
    const recommendations = [];
    const ignoreBenefits = benefitsAreIgnored();
    const rebalanceTargets = ignoreBenefits ? [] : findRebalanceTargets(analyses, data.userCash, profile);

    analyses.forEach((stock) => {
      recommendations.push(...recommendHeldStockSignals(stock, profile, strategy, ignoreBenefits));
      if (!ignoreBenefits) recommendations.push(...recommendBenefitSignals(stock, data.userCash, profile, strategy, rebalanceTargets));
      recommendations.push(...recommendTechnicalSignals(stock, profile, strategy, ignoreBenefits));
    });

    recommendations.push(...rebalanceTargets.map((target) => createRecommendation({
      action: 'REBALANCE',
      stock: target.stock,
      priority: 62 + target.priorityBoost + profile.rebalanceBoost,
      reason: `Selling weaker unlocked holdings could raise ${formatMoney(target.shortfall)} and unlock ${target.stock.acronym}'s ${target.benefitLabel}. Review manually before moving money.`,
      details: target.sellIdeas.map((idea) => `${idea.acronym} ${formatMoney(idea.value)}`).join(', ')
    })));

    recommendations.push(...buildBestNextBuyRecommendation(analyses, data, profile, strategy, ignoreBenefits));
    recommendations.push(...buildHeldStockCoverageRecommendations(analyses, recommendations, ignoreBenefits));

    return dedupeRecommendations(recommendations)
      .sort((a, b) => b.priority - a.priority || actionUrgency(b.action) - actionUrgency(a.action) || a.stock.acronym.localeCompare(b.stock.acronym));
  }

  function actionUrgency(action) {
    const weights = {
      'SELL NOW': 100,
      CLAIM: 95,
      SELL: 90,
      'SELL SOON': 82,
      'SELL EXTRA': 78,
      REBALANCE: 72,
      'TOP UP': 68,
      'BEST BUY': 64,
      'BUY MORE': 62,
      BUY: 60,
      'BUY DIP': 56,
      'MAYBE BUY': 46,
      DECIDE: 42,
      CHECK: 38,
      'SAVE TOWARD': 30,
      WAIT: 22,
      HOLD: 12,
      KEEP: 10,
      WATCH: 8
    };
    return weights[action] || 0;
  }

  function buildBestNextBuyRecommendation(analyses, data, profile, strategy, ignoreBenefits) {
    if (!analyses.length) return [];
    const candidates = analyses
      .map((stock) => scoreNextBuyCandidate(stock, data, profile, strategy, ignoreBenefits))
      .filter((candidate) => candidate.score >= 34)
      .sort((a, b) => b.score - a.score || a.stock.acronym.localeCompare(b.stock.acronym));

    const best = candidates[0];
    if (!best) return [];

    const cash = data.userCash ? data.userCash.immediate : 0;
    const sharesNow = best.stock.price > 0 ? Math.floor(cash / best.stock.price) : 0;
    const alreadyHeld = !!best.stock.position;
    const action = alreadyHeld
      ? (best.score >= 68 ? 'BUY MORE' : 'MAYBE BUY')
      : (best.score >= 68 ? 'BEST BUY' : 'MAYBE BUY');
    const buyingPhrase = sharesNow > 0
      ? `Your current buying power can ${alreadyHeld ? 'add' : 'buy'} about ${compactNumber(sharesNow)} shares.`
      : `If you add cash now, this is the strongest ${alreadyHeld ? 'add-more' : 'next'} target by the current settings.`;

    return [createRecommendation({
      action,
      stock: best.stock,
      priority: Math.round(clamp(best.score, 45, 92)),
      reason: `${buyingPhrase} ${best.reason}`,
      details: best.details.join(' | ')
    })];
  }

  function scoreNextBuyCandidate(stock, data, profile, strategy, ignoreBenefits) {
    const cash = data.userCash ? data.userCash.immediate : 0;
    const portfolioValue = analysesPortfolioValue(data.analyses);
    const positionValue = stock.position ? stock.position.currentValue : 0;
    const concentration = portfolioValue > 0 ? positionValue / portfolioValue : 0;
    const technicals = stock.technicals;
    const memory = stock.memory || {};
    const momentum = technicals ? technicals.momentumScore : memory.slope || 0;
    const rsi = technicals ? technicals.rsi : null;
    const change7d = technicals && technicals.change7d != null ? technicals.change7d : memory.change7d;
    const change30d = technicals && technicals.change30d != null ? technicals.change30d : memory.change30d;
    const heldCount = data.analyses.filter((item) => item.position).length;
    const maxComfortableHoldings = strategy.key === 'trader' || state.settings.riskLevel >= 70 ? 12 : state.settings.riskLevel <= 35 ? 5 : 8;
    const reasons = [];
    const details = [];
    let score = 36;

    if (stock.price > 0 && cash >= stock.price) {
      score += 7;
      details.push(`${compactNumber(Math.floor(cash / stock.price))} shares affordable`);
    } else if (cash > 0) {
      score -= 4;
      details.push(`needs ${formatMoney(Math.max(0, stock.price - cash))} for 1 share`);
    }

    if (technicals) {
      score += momentum * 14 * strategy.technicalWeight;
      reasons.push(`momentum is ${technicals.signal}`);
      if (rsi != null) {
        if (rsi <= 30) { score += 14; details.push(`RSI ${Math.round(rsi)} cheap`); }
        else if (rsi <= 42) { score += 8; details.push(`RSI ${Math.round(rsi)}`); }
        else if (rsi >= 78) { score -= 18; details.push(`RSI ${Math.round(rsi)} hot`); }
        else if (rsi >= 68) { score -= 8; details.push(`RSI ${Math.round(rsi)} high`); }
      }
      if (change7d != null && change7d < 0 && momentum > 0.4) {
        score += 10;
        details.push('dip recovery');
      }
      if (change7d != null && change7d < -4 && momentum < -0.4) {
        score -= 12;
        details.push('falling week');
      }
      if (change30d != null && change30d > 0 && momentum >= 0) score += 4;
    } else if (memory.samples >= 3) {
      score += clamp(memory.slope || 0, -2, 2) * 8;
      reasons.push('local price memory is being used');
      details.push(`${memory.samples} memory points`);
    } else {
      score -= 10;
      reasons.push('technical data is thin');
    }

    if (!ignoreBenefits && stock.benefit) {
      const benefitStillMarginal = !stock.position
        || !stock.position.hasBenefit
        || (stock.benefit.type === 'active' && stock.position.sharesToNextBlock > 0);
      if (stock.benefit.annualRoi > 0) {
        if (benefitStillMarginal) {
          const roiBoost = Math.min(18, stock.benefit.annualRoi) * strategy.benefitWeight;
          score += roiBoost;
          details.push(`${formatPct(stock.benefit.annualRoi)} benefit ROI`);
        } else {
          details.push('benefit already active');
        }
      }
      if (benefitStillMarginal && stock.benefit.tier === 'S') { score += 8 * strategy.benefitWeight; details.push('S-tier benefit'); }
      if (benefitStillMarginal && stock.benefit.tier === 'A') { score += 5 * strategy.benefitWeight; details.push('A-tier benefit'); }
    }

    if (stock.position) {
      details.push(`held ${compactNumber(stock.position.totalShares)} shares`);
      if (stock.position.profitLossPct < -1 && momentum <= 0) score -= 12;
      if (stock.position.profitLossPct > 0 && momentum > 0.5) score += 4;
      if (concentration > 0.4) score -= state.settings.riskLevel >= 75 ? 10 : 22;
      else if (concentration > 0.25) score -= state.settings.riskLevel >= 75 ? 4 : 12;
      else if (concentration > 0.15) score -= state.settings.riskLevel >= 75 ? 0 : 4;
      else { score += 3; details.push('room to add'); }
    } else {
      score += heldCount >= maxComfortableHoldings ? -6 : 5;
      details.push('new position');
    }

    if (stock.locked) score -= 3;
    score += (state.settings.riskLevel - 50) / 10;

    if (!reasons.length) reasons.push('it has the best combined score right now');
    return {
      stock,
      score,
      reason: `Best next-money score: ${reasons.join(', ')}.`,
      details
    };
  }

  function analysesPortfolioValue(analyses) {
    return (analyses || []).reduce((sum, stock) => sum + (stock.position ? stock.position.currentValue : 0), 0);
  }

  function buildHeldStockCoverageRecommendations(analyses, recommendations, ignoreBenefits) {
    const coveredIds = new Set(recommendations.map((recommendation) => String(recommendation.stock.id)));
    return analyses
      .filter((stock) => stock.position)
      .filter((stock) => !coveredIds.has(String(stock.id)))
      .map((stock) => createRecommendation({
        action: 'HOLD',
        stock,
        priority: 18,
        reason: heldStockCoverageReason(stock, ignoreBenefits)
      }));
  }

  function heldStockCoverageReason(stock, ignoreBenefits) {
    const position = stock.position;
    const parts = [`Currently held. Net P/L after ${APP.sellFeePct}% sell fee is ${formatPct(position.profitLossPct)}.`];
    if (!ignoreBenefits && position.hasBenefit) {
      parts.push(`Benefit is active: ${payoutStatusText(position)}.`);
    } else if (!ignoreBenefits && position.isPartialBenefit) {
      parts.push(`Partial benefit progress is ${Math.floor(position.benefitProgressPct)}%.`);
    } else if (stock.technicals) {
      parts.push(`Momentum is ${stock.technicals.signal}.`);
    } else if (stock.memory && stock.memory.samples >= 3) {
      parts.push('Using local price memory until stronger technical data is available.');
    } else {
      parts.push('No urgent buy/sell trigger right now.');
    }
    if (stock.locked) parts.push('Locked stock: sell/rebalance advice is protected.');
    return parts.join(' ');
  }

  function recommendHeldStockSignals(stock, profile, strategy, ignoreBenefits) {
    const recs = [];
    const position = stock.position;
    if (!position) return recs;

    const committedToBenefit = !ignoreBenefits && (position.hasBenefit || position.isPartialBenefit);
    const locked = stock.locked;
    const momentum = stock.technicals ? stock.technicals.momentumScore : 0;

    if (!ignoreBenefits && position.dividendReady) {
      recs.push(createRecommendation({
        action: 'CLAIM',
        stock,
        priority: 100,
        reason: 'A stock benefit payout appears ready. Claim it manually on Torn.'
      }));
    }

    if (!ignoreBenefits && !locked && position.hasBenefit && position.sharesAboveBlock > 0 && position.profitLossPct > 1) {
      recs.push(createRecommendation({
        action: 'SELL EXTRA',
        stock,
        priority: 58 + Math.min(25, position.profitLossPct),
        reason: `Net after ${APP.sellFeePct}% sell fee, you are up ${formatPct(position.profitLossPct)} and hold ${compactNumber(position.sharesAboveBlock)} extra shares above the completed block.`
      }));
    }

    if (!locked && !committedToBenefit && position.profitLossPct >= profile.sellProfitPct) {
      recs.push(createRecommendation({
        action: 'SELL',
        stock,
        priority: 50 + Math.min(30, position.profitLossPct) + strategy.profitTargetBoost,
        reason: `Net after ${APP.sellFeePct}% sell fee, you are up ${formatPct(position.profitLossPct)} with no active benefit commitment. Consider taking profit manually.`
      }));
    }

    if (!locked && !committedToBenefit && position.profitLossPct <= profile.sellLossPct && momentum <= -0.5) {
      recs.push(createRecommendation({
        action: 'SELL NOW',
        stock,
        priority: 72 + Math.min(20, Math.abs(position.profitLossPct)) + strategy.lossCutBoost,
        reason: `Net after ${APP.sellFeePct}% sell fee, you are down ${formatPct(Math.abs(position.profitLossPct))} and momentum is ${stock.technicals ? stock.technicals.signal : 'weak'}. Consider cutting the loss.`
      }));
    }

    if (!locked && !committedToBenefit && position.profitLossPct <= profile.checkLossPct && momentum > -0.5) {
      recs.push(createRecommendation({
        action: 'CHECK',
        stock,
        priority: 38,
        reason: `This holding is down ${formatPct(Math.abs(position.profitLossPct))} after sell fee. Review whether it still fits your plan.`
      }));
    }

    if (!ignoreBenefits && position.hasBenefit && position.profitLossPct >= profile.keepLossFloorPct) {
      let reason = `Benefit is active. Net P/L after sell fee is ${formatPct(position.profitLossPct)} and payout status is ${payoutStatusText(position)}.`;
      if (stock.benefit && stock.benefit.bankComparison && stock.benefit.bankComparison.beatsBenefit) {
        const bank = stock.benefit.bankComparison;
        reason += stock.bank.activeInvestment
          ? ` Bank ${bank.termLabel} APR (${bank.apr.toFixed(1)}%) beats the estimated benefit ROI, but your bank investment is locked.`
          : ` Bank ${bank.termLabel} APR (${bank.apr.toFixed(1)}%) beats the estimated benefit ROI, so compare before adding more.`;
      }
      recs.push(createRecommendation({
        action: 'KEEP',
        stock,
        priority: 12,
        reason
      }));
    }

    if (locked && !position.dividendReady) {
      recs.push(createRecommendation({
        action: 'KEEP',
        stock,
        priority: 8,
        reason: 'This stock is locked in FLUZ settings, so sell and rebalance advice is suppressed.'
      }));
    }

    return recs;
  }

  function recommendBenefitSignals(stock, userCash, profile, strategy, rebalanceTargets) {
    const recs = [];
    const benefit = stock.benefit;
    if (!benefit || benefit.requirement <= 0) return recs;

    const position = stock.position;
    const tier = benefit.tier;
    const highTier = tier === 'S' || tier === 'A';
    const bankBeats = benefit.bankComparison && benefit.bankComparison.actionable;
    const hasRebalancePath = rebalanceTargets.some((target) => target.stock.id === stock.id);

    if (position && position.isPartialBenefit && stock.topUp) {
      const progress = Math.floor(position.benefitProgressPct);
      const label = benefitLabel(stock);
      if (stock.topUp.affordable) {
        recs.push(createRecommendation({
          action: 'TOP UP',
          stock,
          priority: 66 + (benefitPriorityBoost(stock, profile) * strategy.benefitWeight),
          reason: `You have ${progress}% of ${label}. Add ${compactNumber(stock.topUp.sharesNeeded)} shares for ${formatMoney(stock.topUp.cost)} to complete it.`
        }));
      } else {
        const action = position.profitLossPct > profile.sellProfitPct ? 'DECIDE' : 'WAIT';
        recs.push(createRecommendation({
          action,
          stock,
          priority: action === 'DECIDE' ? 48 : 32,
          reason: `Partial block is not earning yet. Top up costs ${formatMoney(stock.topUp.cost)}, short ${formatMoney(stock.topUp.shortfall)}. ${stock.topUp.affordableWithCayman ? 'Cayman funds may cover it after delay.' : 'Save toward it or rethink the position.'}`
        }));
      }
      return recs;
    }

    const ownedEnough = position && position.hasBenefit;
    if (ownedEnough) return recs;

    const sharesNeeded = position ? Math.max(0, benefit.requirement - position.totalShares) : benefit.requirement;
    const buyCost = sharesNeeded * stock.price;
    const affordable = buyCost <= userCash.immediate || userCash.immediate <= 0;
    const roiGood = benefit.annualRoi >= 15;
    const roiDecent = benefit.annualRoi >= 5;
    const priorityBoost = benefitPriorityBoost(stock, profile);

    if (bankBeats && !highTier) {
      recs.push(createRecommendation({
        action: 'WATCH',
        stock,
        priority: 18,
        reason: `Estimated benefit ROI is ${formatPct(benefit.annualRoi)}, but bank APR currently looks better.`
      }));
      return recs;
    }

    if ((highTier || roiGood) && affordable) {
      recs.push(createRecommendation({
        action: 'BUY',
        stock,
        priority: 58 + (priorityBoost * strategy.benefitWeight),
        reason: `${benefitLabel(stock)} looks strong. Need ${compactNumber(sharesNeeded)} shares, around ${formatMoney(buyCost)}.`
      }));
    } else if (roiDecent && affordable) {
      recs.push(createRecommendation({
        action: 'MAYBE BUY',
        stock,
        priority: 34 + Math.min(20, benefit.annualRoi * strategy.benefitWeight),
        reason: `Decent estimated ROI at ${formatPct(benefit.annualRoi)}. Compare against your bank and goals before buying.`
      }));
    } else if ((highTier || roiGood) && !hasRebalancePath) {
      const closeEnough = buyCost <= Math.max(userCash.immediate * 1.5, userCash.totalIncludingCayman);
      if (closeEnough || highTier) {
        recs.push(createRecommendation({
          action: 'SAVE TOWARD',
          stock,
          priority: 28 + (highTier ? 15 : 0),
          reason: `${benefitLabel(stock)} is worth tracking, but the block costs about ${formatMoney(buyCost)}.`
        }));
      }
    }

    return recs;
  }

  function recommendTechnicalSignals(stock, profile, strategy, ignoreBenefits) {
    const recs = [];
    const technicals = stock.technicals;
    const memory = stock.memory || {};
    if (!technicals && (!memory.samples || memory.samples < 3)) return recs;

    const position = stock.position;
    const committed = position && !ignoreBenefits && (position.hasBenefit || position.isPartialBenefit);
    const momentum = technicals ? technicals.momentumScore : memory.slope;
    const rsi = technicals ? technicals.rsi : null;
    const signal = technicals ? technicals.signal : memory.slope > 0.25 ? 'Observed Up' : memory.slope < -0.25 ? 'Observed Down' : 'Observed Flat';
    const rangePosition = technicals ? technicals.rangePosition : 50;
    const change7d = technicals && technicals.change7d != null ? technicals.change7d : memory.change7d;
    const change30d = technicals && technicals.change30d != null ? technicals.change30d : memory.change30d;

    if (profile.buyDip && !position && momentum >= strategy.buyDipMinMomentum && (rsi == null || rsi < 45)) {
      recs.push(createRecommendation({
        action: 'BUY DIP',
        stock,
        priority: 44 + (momentum * 6 * strategy.technicalWeight) + profile.buyDipBoost,
        reason: rsi == null
          ? `Observed local price memory is turning up (${signal}). This may be a trade entry, but confirm manually.`
          : `Momentum is ${signal}, RSI is ${rsi.toFixed(0)}, and the price may be recovering from a dip.`
      }));
    }

    if (profile.sellSoon && position && !committed && !stock.locked && position.profitLossPct > 0.5 && rangePosition > 75 && momentum <= 0.5) {
      recs.push(createRecommendation({
        action: 'SELL SOON',
        stock,
        priority: 48 + profile.sellSoonBoost + strategy.profitTargetBoost,
        reason: `Net after ${APP.sellFeePct}% sell fee, you are up ${formatPct(position.profitLossPct)} and price is high in its 30-day range. Momentum may be fading.`
      }));
    }

    if (position && !committed && !stock.locked && rsi != null && rsi > 75 && position.profitLossPct >= 1) {
      recs.push(createRecommendation({
        action: 'SELL SOON',
        stock,
        priority: 46 + profile.sellSoonBoost + strategy.profitTargetBoost,
        reason: `RSI is ${rsi.toFixed(0)} and you are net profitable after sell fee. Watch for a pullback.`
      }));
    }

    if (position && !committed && !stock.locked && position.profitLossPct > 0 && change30d != null && change30d > 8 && change7d != null && change7d < 1) {
      recs.push(createRecommendation({
        action: 'WATCH',
        stock,
        priority: 31,
        reason: `The 30-day move is ${formatPct(change30d)}, but the last 7 days slowed to ${formatPct(change7d)}.`
      }));
    }

    return recs;
  }

  function findRebalanceTargets(analyses, userCash, profile) {
    if (!profile.rebalance) return [];

    const sellIdeas = analyses
      .filter((stock) => stock.position && !stock.locked)
      .filter((stock) => !stock.position.hasBenefit && !stock.position.isPartialBenefit)
      .filter((stock) => stock.position.profitLossPct > profile.sellProfitPct || (stock.technicals && stock.technicals.momentumScore < -0.5))
      .map((stock) => ({
        id: stock.id,
        acronym: stock.acronym,
        value: stock.position.sellProceeds,
        score: stock.position.profitLossPct + (stock.technicals ? -stock.technicals.momentumScore : 0)
      }))
      .sort((a, b) => b.score - a.score);

    const availableSellValue = sellIdeas.reduce((sum, idea) => sum + idea.value, 0);
    if (availableSellValue <= 0) return [];

    return analyses
      .filter((stock) => stock.benefit && !stock.position)
      .filter((stock) => stock.benefit.tier === 'S' || stock.benefit.tier === 'A' || stock.benefit.annualRoi >= 20)
      .map((stock) => {
        const cost = stock.benefit.requirement * stock.price;
        const shortfall = Math.max(0, cost - userCash.immediate);
        return {
          stock,
          cost,
          shortfall,
          sellIdeas,
          priorityBoost: benefitPriorityBoost(stock, profile),
          benefitLabel: benefitLabel(stock)
        };
      })
      .filter((target) => target.shortfall > 0 && target.shortfall <= availableSellValue)
      .slice(0, 3);
  }

  function benefitPriorityBoost(stock, profile) {
    const benefit = stock.benefit || {};
    let boost = profile.benefitFocusBoost;
    if (benefit.tier === 'S') boost += 30;
    else if (benefit.tier === 'A') boost += 20;
    else boost += Math.min(25, benefit.annualRoi || 0);
    return boost;
  }

  function benefitLabel(stock) {
    const benefit = stock.benefit || {};
    if (benefit.tier === 'S') return `S-tier benefit (${benefit.note || benefit.description || stock.acronym})`;
    if (benefit.tier === 'A') return `A-tier benefit (${benefit.note || benefit.description || stock.acronym})`;
    if (benefit.annualRoi > 0) return `estimated ${formatPct(benefit.annualRoi)} yearly benefit`;
    return benefit.note || benefit.description || 'benefit block';
  }

  function createRecommendation({ action, stock, priority, reason, details = '' }) {
    return {
      id: `${action}:${stock.id}`,
      action,
      stock,
      priority: Math.round(priority),
      reason,
      details,
      meta: getActionMeta(action),
      createdAt: nowMs()
    };
  }

  function dedupeRecommendations(recommendations) {
    const best = new Map();
    recommendations.forEach((recommendation) => {
      const key = `${recommendation.action}:${recommendation.stock.id}`;
      const current = best.get(key);
      if (!current || recommendation.priority > current.priority) best.set(key, recommendation);
    });
    return Array.from(best.values());
  }

  // ---------------------------------------------------------------------------
  // Notification module
  // ---------------------------------------------------------------------------

  async function notifyIfNeeded(recommendation) {
    if (!shouldNotify(recommendation)) return;
    const sent = await sendBrowserNotification(recommendation);
    if (!sent) sendInPageNotification(recommendation);
    await rememberNotification(recommendation);
  }

  function shouldNotify(recommendation) {
    const settings = state.settings.notifications;
    if (!settings.enabled) return false;
    if (!recommendation || recommendation.priority < parseNumber(settings.minPriority)) return false;

    const group = recommendation.meta.group;
    if (group === 'buy' && !settings.buy) return false;
    if (group === 'sell' && !settings.sell) return false;
    if (group === 'claim' && !settings.claim) return false;
    if (group === 'topup' && !settings.topup) return false;
    if (group === 'rebalance' && !settings.rebalance) return false;
    if (!['buy', 'sell', 'claim', 'topup', 'rebalance'].includes(group)) return false;

    const cooldown = Math.max(1, parseNumber(settings.cooldownMinutes)) * 60 * 1000;
    const key = notificationKey(recommendation);
    const last = parseNumber(state.notificationHistory[key]);
    return !last || nowMs() - last >= cooldown;
  }

  async function sendBrowserNotification(recommendation) {
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      const notification = new Notification(`${APP.name}: ${recommendation.action} ${recommendation.stock.acronym}`, {
        body: `${recommendation.reason} Price: ${formatFullMoney(recommendation.stock.price)}. Priority: ${recommendation.priority}.`,
        tag: notificationKey(recommendation),
        requireInteraction: recommendation.priority >= 90
      });
      notification.onclick = () => {
        window.focus();
        findStockOnPage(recommendation.stock.acronym);
        notification.close();
      };
      return true;
    } catch (error) {
      console.warn('[FLUZ] Browser notification failed:', error);
      return false;
    }
  }

  function sendInPageNotification(recommendation) {
    state.inPageAlerts.unshift({
      id: `${notificationKey(recommendation)}:${nowMs()}`,
      recommendation,
      ts: nowMs()
    });
    state.inPageAlerts = state.inPageAlerts.slice(0, 5);
    renderPanel();
  }

  async function rememberNotification(recommendation) {
    state.notificationHistory[notificationKey(recommendation)] = nowMs();
    await writeJsonStorage(STORAGE.notificationHistory, state.notificationHistory);
  }

  async function clearNotificationHistory() {
    state.notificationHistory = {};
    await writeJsonStorage(STORAGE.notificationHistory, {});
    showFlash('Notification history cleared.');
  }

  function notificationKey(recommendation) {
    return `${recommendation.action}:${recommendation.stock.acronym}`;
  }

  async function requestNotificationPermissionIfNeeded() {
    if (!('Notification' in window)) {
      showFlash('Browser notifications are not available here. FLUZ will use in-page alerts.');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      showFlash('Browser notifications are blocked. FLUZ will use in-page alerts.');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showFlash('Notification permission was not granted. FLUZ will use in-page alerts.');
      return false;
    }
    return true;
  }

  function playAlertTone() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return false;
      const tone = String(state.utility.timerAlertTone || 'standard');
      const volume = clamp(parseNumber(state.utility.timerAlertVolume || 55), 0, 100) / 100;
      const pattern = tone === 'soft'
        ? { type: 'sine', freqs: [660, 880], step: 0.2, length: 0.16, duration: 0.62, gain: 0.22 }
        : tone === 'urgent'
          ? { type: 'square', freqs: [740, 980, 1240, 980], step: 0.18, length: 0.16, duration: 1.08, gain: 0.42 }
          : { type: 'triangle', freqs: [720, 960, 720], step: 0.2, length: 0.17, duration: 0.85, gain: 0.32 };
      const context = new AudioContextCtor();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.01, pattern.gain * volume), context.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + pattern.duration);
      gain.connect(context.destination);
      pattern.freqs.forEach((frequency, index) => {
        const osc = context.createOscillator();
        osc.type = pattern.type;
        osc.frequency.value = frequency;
        osc.connect(gain);
        osc.start(context.currentTime + index * pattern.step);
        osc.stop(context.currentTime + pattern.length + index * pattern.step);
      });
      setTimeout(() => context.close && context.close(), 1400);
      return true;
    } catch (error) {
      console.warn('[FLUZ] Alert tone failed:', error);
      return false;
    }
  }

  async function sendUtilityAlert({ title, body, tag, url, sound = true, desktop = true }) {
    if (sound) playAlertTone();
    let sent = false;
    if (desktop && 'Notification' in window) {
      if (Notification.permission !== 'granted') await requestNotificationPermissionIfNeeded();
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            tag: tag || `${APP.id}-utility-${nowMs()}`,
            requireInteraction: true
          });
          notification.onclick = () => {
            window.focus();
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
            notification.close();
          };
          sent = true;
        } catch (error) {
          console.warn('[FLUZ] Utility notification failed:', error);
        }
      }
    }
    if (!sent) showFlash(`${title}: ${body}`);
    return sent;
  }

  async function runNotificationScan() {
    for (const recommendation of state.recommendations) {
      await notifyIfNeeded(recommendation);
    }
  }

  // ---------------------------------------------------------------------------
