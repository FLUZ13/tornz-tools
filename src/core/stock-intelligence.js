  const STOCK_INTEL_DB = {
    name: 'tornz-stock-intelligence',
    version: 1,
    stores: {
      ticks: 'stock_ticks',
      signals: 'stock_signals',
      outcomes: 'stock_outcomes',
      meta: 'stock_meta',
      cloud: 'stock_cloud_models'
    }
  };

  const STOCK_INTEL_RETENTION = {
    rawMs: 30 * 24 * 60 * 60 * 1000,
    syncWindowMs: 6 * 60 * 60 * 1000,
    maxExportTicks: 12000,
    maxSignals: 1200
  };

  function stockIntelEmptyState(status = 'not loaded', warning = '') {
    return {
      ready: false,
      status,
      local: null,
      cloud: null,
      lastSnapshotAt: 0,
      lastSyncAt: 0,
      lastModelAt: 0,
      warning
    };
  }

  function stockIntelEnabled() {
    return !!(state.settings && state.settings.stockIntelligenceEnabled);
  }

  function stockSyncEndpoint() {
    return String((state.settings && state.settings.stockSyncEndpoint) || APP.stockSyncBaseUrl || '').replace(/\/+$/g, '');
  }

  function stockSyncToken() {
    return String((state.settings && state.settings.stockSyncToken) || '').trim();
  }

  function stockDriveSyncEnabled() {
    return !!(state.settings && state.settings.stockDriveSyncEnabled && stockSyncToken() && stockSyncEndpoint());
  }

  function stockIntelAgeText(ts) {
    const age = Math.max(0, nowMs() - parseNumber(ts));
    const seconds = Math.round(age / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  function stockIntelOpenDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable in this browser context.'));
        return;
      }
      const request = indexedDB.open(STOCK_INTEL_DB.name, STOCK_INTEL_DB.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.ticks)) {
          const store = db.createObjectStore(STOCK_INTEL_DB.stores.ticks, { keyPath: 'id' });
          store.createIndex('acronym', 'acronym', { unique: false });
          store.createIndex('ts', 'ts', { unique: false });
        }
        if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.signals)) {
          const store = db.createObjectStore(STOCK_INTEL_DB.stores.signals, { keyPath: 'id' });
          store.createIndex('acronym', 'acronym', { unique: false });
          store.createIndex('ts', 'ts', { unique: false });
        }
        if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.outcomes)) {
          const store = db.createObjectStore(STOCK_INTEL_DB.stores.outcomes, { keyPath: 'id' });
          store.createIndex('signalId', 'signalId', { unique: false });
          store.createIndex('ts', 'ts', { unique: false });
        }
        if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.meta)) db.createObjectStore(STOCK_INTEL_DB.stores.meta, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STOCK_INTEL_DB.stores.cloud)) db.createObjectStore(STOCK_INTEL_DB.stores.cloud, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed.'));
    });
  }

  function stockIntelTx(storeNames, mode = 'readonly') {
    return stockIntelOpenDb().then((db) => ({ db, tx: db.transaction(storeNames, mode) }));
  }

  function stockIntelRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
    });
  }

  function stockIntelTxDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
    });
  }

  async function stockIntelPutMany(storeName, rows) {
    if (!rows || !rows.length) return;
    const { db, tx } = await stockIntelTx([storeName], 'readwrite');
    try {
      const store = tx.objectStore(storeName);
      rows.forEach((row) => store.put(row));
      await stockIntelTxDone(tx);
    } finally {
      db.close();
    }
  }

  async function stockIntelGetAll(storeName) {
    const { db, tx } = await stockIntelTx([storeName]);
    try {
      return await stockIntelRequest(tx.objectStore(storeName).getAll());
    } finally {
      db.close();
    }
  }

  async function stockIntelGetMeta(key, fallback = null) {
    const { db, tx } = await stockIntelTx([STOCK_INTEL_DB.stores.meta]);
    try {
      const row = await stockIntelRequest(tx.objectStore(STOCK_INTEL_DB.stores.meta).get(key));
      return row && row.value !== undefined ? row.value : fallback;
    } finally {
      db.close();
    }
  }

  async function stockIntelSetMeta(key, value) {
    await stockIntelPutMany(STOCK_INTEL_DB.stores.meta, [{ key, value, updatedAt: nowMs() }]);
  }

  function stockIntelUserIdentity(data) {
    const user = data && data.rawUser ? data.rawUser : (state.raw && state.raw.user) || {};
    return {
      xid: String(user.player_id || user.id || user.XID || ''),
      name: String(user.name || user.player_name || '')
    };
  }

  function stockIntelPortfolioSnapshot(data) {
    return (data && data.analyses ? data.analyses : [])
      .filter((stock) => stock.position)
      .map((stock) => ({
        acronym: stock.acronym,
        stockId: String(stock.id),
        shares: Math.round(stock.position.totalShares || 0),
        value: Math.round(stock.position.currentValue || 0),
        pnlPct: Number((stock.position.profitLossPct || 0).toFixed(3)),
        locked: !!stock.locked,
        hasBenefit: !!stock.position.hasBenefit
      }));
  }

  function stockIntelTickRows(stocks, ts) {
    return (stocks || [])
      .filter((stock) => stock && stock.acronym && stock.price > 0)
      .map((stock) => ({
        id: `${stock.acronym}:${ts}`,
        ts,
        stockId: String(stock.id),
        acronym: stock.acronym,
        name: stock.name || stock.acronym,
        price: Number(stock.price),
        totalShares: Math.round(stock.totalShares || 0),
        availableShares: Math.round(stock.availableShares || 0)
      }));
  }

  function stockIntelSignalRows(recommendations, data, ts) {
    const identity = stockIntelUserIdentity({ rawUser: state.raw && state.raw.user });
    return (recommendations || []).slice(0, 40).map((rec) => ({
      id: `${ts}:${rec.stock.acronym}:${String(rec.action || '').replace(/\s+/g, '_')}`,
      ts,
      acronym: rec.stock.acronym,
      stockId: String(rec.stock.id),
      action: rec.action,
      priority: Math.round(rec.priority || 0),
      price: Number(rec.stock.price || 0),
      reason: String(rec.reason || '').slice(0, 240),
      details: String(rec.details || '').slice(0, 240),
      portfolio: rec.stock.position ? {
        shares: Math.round(rec.stock.position.totalShares || 0),
        pnlPct: Number((rec.stock.position.profitLossPct || 0).toFixed(3)),
        locked: !!rec.stock.locked
      } : null,
      identity
    }));
  }

  async function stockIntelRecordRefresh(raw, data, recommendations) {
    if (!stockIntelEnabled() || !data || !Array.isArray(data.marketStocks)) return;
    const ts = nowMs();
    try {
      await stockIntelPutMany(STOCK_INTEL_DB.stores.ticks, stockIntelTickRows(data.marketStocks, ts));
      await stockIntelPutMany(STOCK_INTEL_DB.stores.signals, stockIntelSignalRows(recommendations, data, ts));
      await stockIntelSetMeta('lastSnapshotAt', ts);
      await stockIntelCleanup();
      state.stockIntel = {
        ...state.stockIntel,
        ready: true,
        status: 'local tracking',
        lastSnapshotAt: ts,
        warning: ''
      };
      await stockIntelRefreshModel();
    } catch (error) {
      state.stockIntel = {
        ...stockIntelEmptyState('local tracking unavailable', friendlyError(error)),
        cloud: state.stockIntel && state.stockIntel.cloud
      };
    }
  }

  async function stockIntelCleanup() {
    const lastCleanup = await stockIntelGetMeta('lastCleanupAt', 0);
    const now = nowMs();
    if (now - parseNumber(lastCleanup) < 12 * 60 * 60 * 1000) return;
    const cutoff = now - STOCK_INTEL_RETENTION.rawMs;
    const { db, tx } = await stockIntelTx([STOCK_INTEL_DB.stores.ticks, STOCK_INTEL_DB.stores.signals, STOCK_INTEL_DB.stores.meta], 'readwrite');
    try {
      const stores = [tx.objectStore(STOCK_INTEL_DB.stores.ticks), tx.objectStore(STOCK_INTEL_DB.stores.signals)];
      stores.forEach((store) => {
        store.index('ts').openCursor(IDBKeyRange.upperBound(cutoff)).onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return;
          cursor.delete();
          cursor.continue();
        };
      });
      tx.objectStore(STOCK_INTEL_DB.stores.meta).put({ key: 'lastCleanupAt', value: now, updatedAt: now });
      await stockIntelTxDone(tx);
    } finally {
      db.close();
    }
  }

  function stockIntelChange(rows, ms) {
    if (!rows.length) return null;
    const latest = rows[rows.length - 1];
    const targetTs = latest.ts - ms;
    const previous = rows.find((row) => row.ts >= targetTs) || rows[0];
    return previous && previous.price ? percentChange(previous.price, latest.price) : null;
  }

  function stockIntelVolatility(rows) {
    if (rows.length < 4) return 0;
    const changes = [];
    for (let index = 1; index < rows.length; index += 1) {
      changes.push(Math.abs(percentChange(rows[index - 1].price, rows[index].price) || 0));
    }
    return changes.reduce((sum, value) => sum + value, 0) / Math.max(1, changes.length);
  }

  async function stockIntelBuildLocalModel() {
    const ticks = await stockIntelGetAll(STOCK_INTEL_DB.stores.ticks);
    const grouped = new Map();
    ticks.forEach((tick) => {
      if (!grouped.has(tick.acronym)) grouped.set(tick.acronym, []);
      grouped.get(tick.acronym).push(tick);
    });
    const stocks = {};
    grouped.forEach((rows, acronym) => {
      rows.sort((a, b) => a.ts - b.ts);
      const latest = rows[rows.length - 1];
      const change1h = stockIntelChange(rows, 60 * 60 * 1000);
      const change6h = stockIntelChange(rows, 6 * 60 * 60 * 1000);
      const change24h = stockIntelChange(rows, 24 * 60 * 60 * 1000);
      const volatility = stockIntelVolatility(rows.slice(-120));
      const expectedMovePct = clamp(((change1h || 0) * 0.5) + ((change6h || 0) * 0.3) + ((change24h || 0) * 0.2), -8, 8);
      const confidence = clamp(Math.round(Math.min(50, rows.length) + Math.min(35, Math.abs(expectedMovePct) * 10) - Math.min(20, volatility * 3)), 0, 95);
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
        confidence
      };
    });
    return {
      generatedAt: nowMs(),
      stockCount: Object.keys(stocks).length,
      source: 'local',
      stocks
    };
  }

  async function stockIntelRefreshModel() {
    if (!stockIntelEnabled()) {
      state.stockIntel = stockIntelEmptyState('disabled');
      return null;
    }
    const local = await stockIntelBuildLocalModel();
    const cloud = await stockIntelLoadCloudModel();
    state.stockIntel = {
      ...(state.stockIntel || {}),
      ready: true,
      status: local.stockCount ? 'local intelligence ready' : 'collecting history',
      local,
      cloud,
      lastSnapshotAt: parseNumber(await stockIntelGetMeta('lastSnapshotAt', 0)),
      lastSyncAt: parseNumber(await stockIntelGetMeta('lastSyncAt', 0)),
      lastModelAt: cloud && cloud.generatedAt ? parseNumber(cloud.generatedAt) : parseNumber(await stockIntelGetMeta('lastModelAt', 0)),
      warning: ''
    };
    return state.stockIntel;
  }

  function stockIntelForAcronym(acronym) {
    const key = String(acronym || '').toUpperCase();
    const local = state.stockIntel && state.stockIntel.local && state.stockIntel.local.stocks
      ? state.stockIntel.local.stocks[key]
      : null;
    const cloud = state.stockIntel && state.stockIntel.cloud && state.stockIntel.cloud.stocks
      ? state.stockIntel.cloud.stocks[key]
      : null;
    if (!local && !cloud) return null;
    const localWeight = local ? Math.max(1, Math.min(3, (local.samples || 0) / 20)) : 0;
    const cloudWeight = cloud ? 2 : 0;
    const totalWeight = Math.max(1, localWeight + cloudWeight);
    const expectedMovePct = (((local && local.expectedMovePct) || 0) * localWeight + ((cloud && cloud.expectedMovePct) || 0) * cloudWeight) / totalWeight;
    const confidence = clamp(Math.round((((local && local.confidence) || 0) * localWeight + ((cloud && cloud.confidence) || 0) * cloudWeight) / totalWeight), 0, 98);
    return {
      local,
      cloud,
      expectedMovePct,
      confidence,
      hitRate: cloud && cloud.hitRate != null ? cloud.hitRate : null,
      samples: (local && local.samples) || 0
    };
  }

  function stockIntelEnhanceAnalyses(analyses) {
    if (!stockIntelEnabled()) return analyses || [];
    return (analyses || []).map((stock) => ({
      ...stock,
      intel: stockIntelForAcronym(stock.acronym)
    }));
  }

  async function stockIntelLoadCloudModel() {
    try {
      const rows = await stockIntelGetAll(STOCK_INTEL_DB.stores.cloud);
      const model = rows.find((row) => row.key === 'latest');
      return model ? model.value : null;
    } catch (error) {
      return null;
    }
  }

  async function stockIntelSaveCloudModel(model) {
    if (!model || typeof model !== 'object') throw new Error('Downloaded model was empty.');
    await stockIntelPutMany(STOCK_INTEL_DB.stores.cloud, [{ key: 'latest', value: model, updatedAt: nowMs() }]);
    await stockIntelSetMeta('lastModelAt', parseNumber(model.generatedAt || nowMs()));
    await stockIntelRefreshModel();
  }

  async function stockIntelBuildSyncPackage() {
    const now = nowMs();
    const since = now - STOCK_INTEL_RETENTION.syncWindowMs;
    const [ticks, signals] = await Promise.all([
      stockIntelGetAll(STOCK_INTEL_DB.stores.ticks),
      stockIntelGetAll(STOCK_INTEL_DB.stores.signals)
    ]);
    const recentTicks = ticks
      .filter((row) => parseNumber(row.ts) >= since)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, STOCK_INTEL_RETENTION.maxExportTicks);
    const recentSignals = signals
      .filter((row) => parseNumber(row.ts) >= since)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, STOCK_INTEL_RETENTION.maxSignals);
    const identity = stockIntelUserIdentity({ rawUser: state.raw && state.raw.user });
    const data = state.data || {};
    return {
      schema: 1,
      app: APP.name,
      version: APP.version,
      exportedAt: now,
      identity,
      context: {
        cash: data.userCash ? Math.round(data.userCash.immediate || 0) : 0,
        portfolio: stockIntelPortfolioSnapshot(data),
        lockedStocks: Array.isArray(state.settings.lockedStocks) ? state.settings.lockedStocks : []
      },
      localModel: state.stockIntel && state.stockIntel.local ? state.stockIntel.local : await stockIntelBuildLocalModel(),
      ticks: recentTicks,
      signals: recentSignals
    };
  }

  async function stockIntelSyncNow() {
    if (!stockDriveSyncEnabled()) throw new Error('Drive sync is disabled or missing a sync token.');
    const payload = await stockIntelBuildSyncPackage();
    const response = await httpPostJson(`${stockSyncEndpoint()}/upload`, {
      token: stockSyncToken(),
      payload
    });
    if (!response || response.ok === false) throw new Error(response && response.error ? response.error : 'Stock sync failed.');
    await stockIntelSetMeta('lastSyncAt', nowMs());
    state.stockIntel.lastSyncAt = nowMs();
    await stockIntelDownloadLatestModel().catch(() => null);
    return response;
  }

  async function stockIntelDownloadLatestModel() {
    if (!stockSyncToken()) throw new Error('Add a TORNz sync token first.');
    const response = await httpPostJson(`${stockSyncEndpoint()}/model/latest`, { token: stockSyncToken() });
    const model = response && response.model ? response.model : response;
    await stockIntelSaveCloudModel(model);
    return model;
  }

  async function stockIntelExportLocalDatabase() {
    const payload = await stockIntelBuildSyncPackage();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tornz-stock-intelligence-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function stockIntelResetLocalDatabase() {
    const db = await stockIntelOpenDb();
    db.close();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(STOCK_INTEL_DB.name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Could not delete stock intelligence database.'));
      request.onblocked = () => reject(new Error('Close other Torn tabs before resetting the stock intelligence database.'));
    });
    state.stockIntel = stockIntelEmptyState('reset complete');
  }

  function stockIntelStatusText() {
    const info = state.stockIntel || stockIntelEmptyState();
    const parts = [info.status || 'not loaded'];
    if (info.local && info.local.stockCount) parts.push(`${info.local.stockCount} stocks`);
    if (info.lastSnapshotAt) parts.push(`local ${stockIntelAgeText(info.lastSnapshotAt)}`);
    if (info.lastSyncAt) parts.push(`sync ${stockIntelAgeText(info.lastSyncAt)}`);
    if (info.lastModelAt) parts.push(`model ${stockIntelAgeText(info.lastModelAt)}`);
    if (info.warning) parts.push(info.warning);
    return parts.join(' - ');
  }
