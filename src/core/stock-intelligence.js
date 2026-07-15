  const STOCK_INTEL_MODEL_KEY = 'tornz.stockCloudModel';
  const STOCK_INTEL_TORNSY_TTL_MS = 10 * 60 * 1000;
  const STOCK_INTEL_INTERVALS = ['m30', 'h1', 'h6', 'd1', 'w1'];

  function stockIntelEmptyState(status = 'not loaded', warning = '') {
    return {
      ready: false,
      status,
      local: null,
      cloud: null,
      background: null,
      lastSnapshotAt: 0,
      lastSyncAt: 0,
      lastModelAt: 0,
      warning
    };
  }

  function stockIntelEnabled() {
    return !!(state.settings && ultimateTraderUnlocked() && state.settings.stockIntelligenceEnabled);
  }

  function stockCloudSyncReady() {
    return !!(state.settings
      && state.settings.stockDriveSyncEnabled
      && stockSyncEndpoint()
      && stockSyncToken());
  }

  function stockSyncEndpoint() {
    return String((state.settings && state.settings.stockSyncEndpoint) || APP.stockSyncBaseUrl || '').replace(/\/+$/g, '');
  }

  function stockSyncToken() {
    return String((state.settings && state.settings.stockSyncToken) || '').trim();
  }

  function stockSyncDownloadUrl() {
    return APP.stockSyncDownloadUrl || 'https://hq.tornz-tools.org/stock-sync/download';
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

  async function stockIntelRecordRefresh() {
    // Tornsy already records the stock history. TORN'z Tools no longer stores user snapshot ticks.
  }

  async function stockIntelRefreshModel(options = {}) {
    if (!stockIntelEnabled()) {
      state.stockIntel = stockIntelEmptyState('disabled');
      return null;
    }
    try {
      const model = await stockIntelLoadTornsyModel({ force: !!options.force });
      const usesCloud = String(model.source || '').includes('archive');
      state.stockIntel = {
        ready: true,
        status: model.stockCount ? (usesCloud ? 'archive intelligence ready' : 'Tornsy intelligence ready') : 'stock model empty',
        local: model,
        cloud: usesCloud ? model : null,
        background: null,
        lastSnapshotAt: 0,
        lastSyncAt: 0,
        lastModelAt: parseNumber(model.generatedAt),
        warning: model.warning || ''
      };
      return state.stockIntel;
    } catch (error) {
      const cached = await stockIntelLoadCachedModel();
      state.stockIntel = {
        ready: !!cached,
        status: cached ? 'Tornsy cache' : 'Tornsy unavailable',
        local: cached,
        cloud: null,
        background: null,
        lastSnapshotAt: 0,
        lastSyncAt: 0,
        lastModelAt: cached ? parseNumber(cached.generatedAt) : 0,
        warning: friendlyError(error)
      };
      return state.stockIntel;
    }
  }

  async function stockIntelLoadTornsyModel(options = {}) {
    const cached = await stockIntelLoadCachedModel();
    if (!options.force && cached && nowMs() - parseNumber(cached.generatedAt) < STOCK_INTEL_TORNSY_TTL_MS) return cached;
    if (state.stockIntelTornsyFetchPromise) return state.stockIntelTornsyFetchPromise;
    state.stockIntelTornsyFetchPromise = stockIntelFetchPreferredModel()
      .then(async (model) => {
        await stockIntelSaveModel(model);
        return model;
      })
      .finally(() => {
        state.stockIntelTornsyFetchPromise = null;
      });
    return state.stockIntelTornsyFetchPromise;
  }

  async function stockIntelFetchPreferredModel() {
    if (stockCloudSyncReady()) {
      try {
        return await stockIntelFetchCloudArchiveModel();
      } catch (error) {
        const fallback = await stockIntelFetchTornsyModel();
        fallback.warning = `Archive model unavailable, using Tornsy direct: ${friendlyError(error)}`;
        return fallback;
      }
    }
    return stockIntelFetchTornsyModel();
  }

  async function stockIntelLoadCachedModel() {
    try {
      const raw = await storageGet(STOCK_INTEL_MODEL_KEY, '');
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const model = parsed && parsed.model ? parsed.model : parsed;
      return model && model.stocks ? model : null;
    } catch (error) {
      return null;
    }
  }

  async function stockIntelSaveModel(model) {
    if (!model || !model.stocks) throw new Error('Tornsy model was empty.');
    await storageSet(STOCK_INTEL_MODEL_KEY, JSON.stringify({ model, savedAt: nowMs(), source: model.source || 'stock-intelligence' }));
  }

  async function stockIntelFetchCloudArchiveModel() {
    const endpoint = stockSyncEndpoint();
    const token = stockSyncToken();
    if (!endpoint || !token) throw new Error('Private archive token is missing.');
    const response = await httpPostJson(`${endpoint}/model/latest`, { token });
    const model = response && response.model ? response.model : null;
    if (!model || !model.stocks || !Object.keys(model.stocks).length) throw new Error('Private archive model is empty.');
    return model;
  }

  async function stockIntelFetchTornsyModel() {
    const url = `${APP.tornsyBaseUrl}/stocks?interval=${encodeURIComponent(STOCK_INTEL_INTERVALS.join(','))}`;
    const response = await httpGetJson(url);
    const rows = Array.isArray(response && response.data) ? response.data : [];
    const timestamp = parseNumber(response && response.timestamp) * 1000 || nowMs();
    const stocks = {};
    rows.forEach((row) => {
      const model = stockIntelModelFromTornsyRow(row, timestamp);
      if (model && model.acronym) stocks[model.acronym] = model;
    });
    return {
      schema: 2,
      source: 'tornsy',
      generatedAt: timestamp,
      stockCount: Object.keys(stocks).length,
      uploadCount: 0,
      note: 'Built from Tornsy public stock intervals. No TORNz user snapshots or API keys are uploaded.',
      stocks
    };
  }

  function stockIntelModelFromTornsyRow(row, timestamp) {
    const acronym = String(row && (row.stock || row.acronym || row.ticker) || '').toUpperCase();
    const currentPrice = parseNumber(row && row.price);
    if (!acronym || currentPrice <= 0) return null;
    const interval = row.interval && typeof row.interval === 'object' ? row.interval : {};
    const change30m = stockIntelIntervalChange(currentPrice, interval.m30);
    const change1h = stockIntelIntervalChange(currentPrice, interval.h1);
    const change6h = stockIntelIntervalChange(currentPrice, interval.h6);
    const change24h = stockIntelIntervalChange(currentPrice, interval.d1);
    const change7d = stockIntelIntervalChange(currentPrice, interval.w1);
    const changes = [change30m, change1h, change6h, change24h, change7d].filter((value) => Number.isFinite(value));
    const shortTrend = averageNumbers([change30m, change1h]);
    const midTrend = averageNumbers([change6h, change24h]);
    const longTrend = Number.isFinite(change7d) ? change7d : midTrend;
    const volatility = stockIntelVolatility(changes);
    const expectedMovePct = clamp(
      ((Number.isFinite(shortTrend) ? shortTrend : 0) * 0.45)
      + ((Number.isFinite(midTrend) ? midTrend : 0) * 0.35)
      + ((Number.isFinite(longTrend) ? longTrend : 0) * 0.20),
      -8,
      8
    );
    const aligned = stockIntelTrendAlignment(changes);
    const confidence = clamp(Math.round((changes.length * 12) + (aligned * 18) + Math.min(18, Math.abs(expectedMovePct) * 4) - Math.min(24, volatility * 8)), 0, 95);
    return {
      acronym,
      name: String(row.name || acronym),
      samples: changes.length,
      latestPrice: currentPrice,
      lastTs: timestamp,
      change30m,
      change1h,
      change6h,
      change24h,
      change7d,
      volatility,
      expectedMovePct,
      confidence,
      provider: 'Tornsy'
    };
  }

  function stockIntelIntervalChange(currentPrice, intervalValue) {
    const price = parseNumber(intervalValue && intervalValue.price);
    if (price <= 0 || currentPrice <= 0) return null;
    return percentChange(price, currentPrice);
  }

  function stockIntelVolatility(values) {
    const rows = values.filter((value) => Number.isFinite(value));
    if (rows.length < 2) return 0;
    const avg = averageNumbers(rows);
    return rows.reduce((sum, value) => sum + Math.abs(value - avg), 0) / rows.length;
  }

  function stockIntelTrendAlignment(values) {
    const rows = values.filter((value) => Number.isFinite(value) && Math.abs(value) >= 0.01);
    if (!rows.length) return 0;
    const positive = rows.filter((value) => value > 0).length;
    const negative = rows.filter((value) => value < 0).length;
    return Math.max(positive, negative) / rows.length;
  }

  function averageNumbers(values) {
    const rows = values.filter((value) => Number.isFinite(value));
    if (!rows.length) return null;
    return rows.reduce((sum, value) => sum + value, 0) / rows.length;
  }

  function stockIntelForAcronym(acronym) {
    const key = String(acronym || '').toUpperCase();
    const local = state.stockIntel && state.stockIntel.local && state.stockIntel.local.stocks
      ? state.stockIntel.local.stocks[key]
      : null;
    if (!local) return null;
    return {
      local,
      cloud: null,
      expectedMovePct: parseNumber(local.expectedMovePct),
      confidence: clamp(Math.round(parseNumber(local.confidence)), 0, 98),
      hitRate: null,
      samples: parseNumber(local.samples)
    };
  }

  function stockIntelEnhanceAnalyses(analyses) {
    if (!stockIntelEnabled()) return analyses || [];
    return (analyses || []).map((stock) => ({
      ...stock,
      intel: stockIntelForAcronym(stock.acronym)
    }));
  }

  async function stockIntelSyncNow() {
    const model = await stockIntelLoadTornsyModel({ force: true });
    await stockIntelRefreshModel();
    return { ok: true, model };
  }

  async function stockIntelDownloadLatestModel() {
    return stockIntelSyncNow();
  }

  async function stockIntelExportLocalDatabase() {
    const model = await stockIntelLoadTornsyModel({ force: false });
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tornz-tornsy-stock-model-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function stockIntelResetLocalDatabase() {
    await storageSet(STOCK_INTEL_MODEL_KEY, '');
    state.stockIntel = stockIntelEmptyState('Tornsy cache reset');
  }

  function stockIntelStatusText() {
    const info = state.stockIntel || stockIntelEmptyState();
    const parts = [info.status || 'not loaded'];
    if (info.local && info.local.stockCount) parts.push(`${info.local.stockCount} stocks`);
    if (info.lastModelAt) parts.push(`${info.cloud ? 'archive' : 'Tornsy'} ${stockIntelAgeText(info.lastModelAt)}`);
    if (info.warning) parts.push(info.warning);
    return parts.join(' - ');
  }
