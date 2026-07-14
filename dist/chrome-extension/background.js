const TORNZ_STORAGE = {
  apiKey: 'tornz.apiKey',
  settings: 'tornz.settings',
  stockCloudModel: 'tornz.stockCloudModel'
};

const STOCK_INTEL_DB = {
  name: 'tornz-stock-intelligence-bg',
  version: 1,
  stores: {
    ticks: 'stock_ticks',
    meta: 'stock_meta'
  }
};

const STOCK_INTEL_ALARMS = {
  collect: 'tornz-stock-intel-collect',
  sync: 'tornz-stock-intel-sync'
};

const STOCK_INTEL_DEFAULT_ENDPOINT = 'https://hq.tornz-tools.org/api/stock-sync/v1';
const STOCK_INTEL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const STOCK_INTEL_SYNC_WINDOW_MS = 6 * 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'TORNZ_XHR') {
    if (message && message.type === 'TORNZ_STOCK_INTEL_CONFIG') {
      setupStockIntelAlarms();
      sendResponse({ ok: true });
      return false;
    }
    return false;
  }

  const url = String(message.url || '');
  if (!isAllowedUrl(url)) {
    sendResponse({ ok: false, error: 'URL is not allowed by TORNz Tools extension.' });
    return false;
  }
  const method = String(message.method || 'GET').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    sendResponse({ ok: false, error: 'Request method is not allowed by TORNz Tools extension.' });
    return false;
  }
  const headers = { accept: message.accept || '*/*' };
  const extraHeaders = message.headers && typeof message.headers === 'object' ? message.headers : {};
  Object.keys(extraHeaders).forEach((key) => {
    headers[key] = String(extraHeaders[key]);
  });
  const options = {
    method,
    credentials: 'omit',
    headers
  };
  if (method === 'POST' && message.data !== null && message.data !== undefined) {
    options.body = String(message.data);
  }

  fetch(url, options)
    .then(async (response) => {
      sendResponse({
        ok: true,
        status: response.status,
        responseText: await response.text()
      });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
    });

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TORNZ_OPEN_PROFILE' });
  } catch (error) {
    console.warn("[TORN'z Tools] Could not open Profile from toolbar icon.", error);
  }
});

chrome.runtime.onInstalled.addListener(setupStockIntelAlarms);
chrome.runtime.onStartup.addListener(setupStockIntelAlarms);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm || alarm.name === STOCK_INTEL_ALARMS.collect) collectStockIntelSnapshot();
  if (alarm && alarm.name === STOCK_INTEL_ALARMS.sync) syncStockIntelSnapshot();
});

setupStockIntelAlarms();

function setupStockIntelAlarms() {
  chrome.alarms.create(STOCK_INTEL_ALARMS.collect, { delayInMinutes: 1, periodInMinutes: 2 });
  chrome.alarms.create(STOCK_INTEL_ALARMS.sync, { delayInMinutes: 5, periodInMinutes: 15 });
}

async function readStoredConfig() {
  const stored = await chrome.storage.local.get([TORNZ_STORAGE.apiKey, TORNZ_STORAGE.settings]);
  let settings = {};
  try {
    settings = stored[TORNZ_STORAGE.settings] ? JSON.parse(stored[TORNZ_STORAGE.settings]) : {};
  } catch (error) {
    settings = {};
  }
  return {
    apiKey: String(stored[TORNZ_STORAGE.apiKey] || '').trim(),
    settings
  };
}

function stockIntelEnabled(settings) {
  return settings.stockIntelligenceEnabled !== false;
}

function driveSyncEnabled(settings) {
  return !!(settings.stockDriveSyncEnabled && String(settings.stockSyncToken || '').trim());
}

function stockSyncEndpoint(settings) {
  return String(settings.stockSyncEndpoint || STOCK_INTEL_DEFAULT_ENDPOINT).replace(/\/+$/g, '');
}

function isApiKeyReasonable(key) {
  return key.length >= 8 && key.length <= 256 && !/\s/.test(key);
}

async function collectStockIntelSnapshot() {
  try {
    const { apiKey, settings } = await readStoredConfig();
    if (!stockIntelEnabled(settings) || !isApiKeyReasonable(apiKey)) return;
    const now = Date.now();
    const last = await bgGetMeta('lastCollectAt', 0);
    if (now - Number(last || 0) < 90 * 1000) return;

    const [market, user] = await Promise.all([
      fetchTornApi('torn', 'stocks', apiKey),
      fetchTornApi('user', 'stocks,money,basic', apiKey).catch((error) => ({ warning: error.message }))
    ]);
    const stocks = normalizeMarketStocks(market && market.stocks);
    if (!stocks.length) return;
    await bgPutMany(STOCK_INTEL_DB.stores.ticks, stocks.map((stock) => ({
      id: `${stock.acronym}:${now}`,
      ts: now,
      acronym: stock.acronym,
      stockId: stock.id,
      name: stock.name,
      price: stock.price,
      totalShares: stock.totalShares,
      availableShares: stock.availableShares
    })));
    await bgSetMeta('lastCollectAt', now);
    await bgSetMeta('latestUserContext', sanitizeUserContext(user));
    cleanupBackgroundStockIntel().catch(() => {});
  } catch (error) {
    console.warn("[TORN'z Tools] background stock intelligence snapshot failed:", error);
  }
}

async function syncStockIntelSnapshot() {
  try {
    const { settings } = await readStoredConfig();
    if (!stockIntelEnabled(settings) || !driveSyncEnabled(settings)) return;
    const endpoint = stockSyncEndpoint(settings);
    const token = String(settings.stockSyncToken || '').trim();
    const payload = await buildBackgroundSyncPackage(settings);
    const response = await fetch(`${endpoint}/upload`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, payload })
    });
    const text = await response.text();
    let json = {};
    try { json = JSON.parse(text || '{}'); } catch (error) { json = {}; }
    if (!response.ok || json.ok === false) throw new Error(json.error || `HTTP ${response.status}`);
    const modelResponse = await fetch(`${endpoint}/model/latest`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const modelText = await modelResponse.text();
    let modelJson = {};
    try { modelJson = JSON.parse(modelText || '{}'); } catch (error) { modelJson = {}; }
    if (!modelResponse.ok || modelJson.ok === false) throw new Error(modelJson.error || `model HTTP ${modelResponse.status}`);
    if (modelJson.model) {
      await chrome.storage.local.set({
        [TORNZ_STORAGE.stockCloudModel]: JSON.stringify({
          model: modelJson.model,
          savedAt: Date.now(),
          source: 'chrome-background'
        })
      });
    }
    await bgSetMeta('lastSyncAt', Date.now());
  } catch (error) {
    console.warn("[TORN'z Tools] background stock intelligence sync failed:", error);
  }
}

async function fetchTornApi(section, selections, apiKey) {
  const url = `https://api.torn.com/${encodeURIComponent(section)}/?selections=${encodeURIComponent(selections)}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { credentials: 'omit' });
  const json = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (json && json.error) throw new Error(json.error.error || json.error);
  return json;
}

function normalizeMarketStocks(stocks) {
  if (!stocks || typeof stocks !== 'object') return [];
  return Object.entries(stocks).map(([id, raw]) => ({
    id: String(id),
    acronym: String(raw.acronym || raw.ticker || raw.shortname || id).toUpperCase(),
    name: raw.name || raw.acronym || id,
    price: Number(raw.current_price ?? raw.price ?? raw.market_price ?? raw.value ?? 0),
    totalShares: Math.round(Number(raw.total_shares || 0)),
    availableShares: Math.round(Number(raw.available_shares || 0))
  })).filter((stock) => stock.acronym && stock.price > 0);
}

function sanitizeUserContext(user) {
  if (!user || typeof user !== 'object') return {};
  return {
    xid: String(user.player_id || user.id || user.XID || ''),
    name: String(user.name || user.player_name || ''),
    moneyOnHand: Math.round(Number(user.money_onhand || user.money || 0)),
    portfolio: normalizeUserStockPortfolio(user.stocks),
    updatedAt: Date.now()
  };
}

function normalizeUserStockPortfolio(stocks) {
  if (!stocks || typeof stocks !== 'object') return [];
  return Object.entries(stocks).map(([id, raw]) => ({
    stockId: String(raw.stock_id || raw.id || id),
    acronym: String(raw.acronym || raw.ticker || raw.shortname || '').toUpperCase(),
    shares: Math.round(Number(raw.total_shares || raw.shares || raw.quantity || 0)),
    boughtPrice: Number(raw.bought_price || raw.average_price || raw.price || 0),
    benefit: String(raw.benefit || raw.dividend || '')
  })).filter((row) => row.stockId && row.shares > 0);
}

async function buildBackgroundSyncPackage(settings = {}) {
  const now = Date.now();
  const ticks = await bgGetAll(STOCK_INTEL_DB.stores.ticks);
  const recentTicks = ticks
    .filter((row) => Number(row.ts || 0) >= now - STOCK_INTEL_SYNC_WINDOW_MS)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12000);
  const latestUser = await bgGetMeta('latestUserContext', {});
  const localModel = buildBackgroundModel(ticks);
  return {
    schema: 1,
    app: "TORN'z Tools",
    version: chrome.runtime.getManifest().version,
    source: 'chrome-background',
    exportedAt: now,
    identity: {
      xid: String(latestUser.xid || ''),
      name: String(latestUser.name || '')
    },
    context: {
      cash: Math.round(Number(latestUser.moneyOnHand || 0)),
      portfolio: Array.isArray(latestUser.portfolio) ? latestUser.portfolio : [],
      lockedStocks: Array.isArray(settings.lockedStocks) ? settings.lockedStocks.map(String) : []
    },
    localModel,
    ticks: recentTicks,
    signals: []
  };
}

function buildBackgroundModel(ticks) {
  const grouped = new Map();
  ticks.forEach((tick) => {
    if (!tick || !tick.acronym || !tick.price) return;
    if (!grouped.has(tick.acronym)) grouped.set(tick.acronym, []);
    grouped.get(tick.acronym).push(tick);
  });
  const stocks = {};
  grouped.forEach((rows, acronym) => {
    rows.sort((a, b) => a.ts - b.ts);
    const latest = rows[rows.length - 1];
    const change1h = changeSince(rows, 60 * 60 * 1000);
    const change6h = changeSince(rows, 6 * 60 * 60 * 1000);
    const change24h = changeSince(rows, 24 * 60 * 60 * 1000);
    const expectedMovePct = clamp(((change1h || 0) * 0.5) + ((change6h || 0) * 0.3) + ((change24h || 0) * 0.2), -8, 8);
    const volatility = averageVolatility(rows.slice(-120));
    stocks[acronym] = {
      acronym,
      samples: rows.length,
      latestPrice: latest.price,
      lastTs: latest.ts,
      change1h,
      change6h,
      change24h,
      volatility,
      expectedMovePct,
      confidence: clamp(Math.round(Math.min(50, rows.length) + Math.min(35, Math.abs(expectedMovePct) * 10) - Math.min(20, volatility * 3)), 0, 95)
    };
  });
  return {
    generatedAt: Date.now(),
    source: 'chrome-background',
    stockCount: Object.keys(stocks).length,
    stocks
  };
}

function changeSince(rows, ms) {
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const previous = rows.find((row) => row.ts >= latest.ts - ms) || rows[0];
  return previous && previous.price ? ((latest.price - previous.price) / previous.price) * 100 : null;
}

function averageVolatility(rows) {
  if (rows.length < 4) return 0;
  let total = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1].price;
    const current = rows[index].price;
    if (previous > 0) total += Math.abs(((current - previous) / previous) * 100);
  }
  return total / Math.max(1, rows.length - 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

async function cleanupBackgroundStockIntel() {
  const lastCleanup = Number(await bgGetMeta('lastCleanupAt', 0) || 0);
  const now = Date.now();
  if (now - lastCleanup < 12 * 60 * 60 * 1000) return;
  const cutoff = now - STOCK_INTEL_RETENTION_MS;
  const { db, tx } = await bgTx([STOCK_INTEL_DB.stores.ticks, STOCK_INTEL_DB.stores.meta], 'readwrite');
  try {
    tx.objectStore(STOCK_INTEL_DB.stores.ticks).index('ts').openCursor(IDBKeyRange.upperBound(cutoff)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    tx.objectStore(STOCK_INTEL_DB.stores.meta).put({ key: 'lastCleanupAt', value: now, updatedAt: now });
    await bgTxDone(tx);
  } finally {
    db.close();
  }
}

function bgOpenDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STOCK_INTEL_DB.name, STOCK_INTEL_DB.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.ticks)) {
        const store = db.createObjectStore(STOCK_INTEL_DB.stores.ticks, { keyPath: 'id' });
        store.createIndex('acronym', 'acronym', { unique: false });
        store.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.meta)) db.createObjectStore(STOCK_INTEL_DB.stores.meta, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed.'));
  });
}

async function bgTx(stores, mode = 'readonly') {
  const db = await bgOpenDb();
  return { db, tx: db.transaction(stores, mode) };
}

function bgRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

function bgTxDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
  });
}

async function bgPutMany(storeName, rows) {
  if (!rows || !rows.length) return;
  const { db, tx } = await bgTx([storeName], 'readwrite');
  try {
    const store = tx.objectStore(storeName);
    rows.forEach((row) => store.put(row));
    await bgTxDone(tx);
  } finally {
    db.close();
  }
}

async function bgGetAll(storeName) {
  const { db, tx } = await bgTx([storeName]);
  try {
    return await bgRequest(tx.objectStore(storeName).getAll());
  } finally {
    db.close();
  }
}

async function bgGetMeta(key, fallback = null) {
  const { db, tx } = await bgTx([STOCK_INTEL_DB.stores.meta]);
  try {
    const row = await bgRequest(tx.objectStore(STOCK_INTEL_DB.stores.meta).get(key));
    return row && row.value !== undefined ? row.value : fallback;
  } finally {
    db.close();
  }
}

async function bgSetMeta(key, value) {
  await bgPutMany(STOCK_INTEL_DB.stores.meta, [{ key, value, updatedAt: Date.now() }]);
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return [
      'www.torn.com',
      'torn.com',
      'api.torn.com',
      'tornsy.com',
      'docs.google.com',
      'gitlab.com',
      'weav3r.dev',
      'yata.yt',
      'ffscouter.com',
      'hq.tornz-tools.org'
    ].includes(url.hostname);
  } catch (error) {
    return false;
  }
}
