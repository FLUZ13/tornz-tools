const API_PREFIX = '/api/stock-sync/v1';
const DASHBOARD_PREFIX = '/stock-sync/dashboard';
const DOWNLOAD_PATH = '/stock-sync/download';
const MODEL_FILE_NAME = 'model/latest.json';
const RAW_PREFIX = 'raw/';
const BACKUP_PREFIX = 'backup/';
const ARCHIVE_PREFIX = 'archive/';
const ARCHIVE_OHLC_PREFIX = `${ARCHIVE_PREFIX}ohlc/h1/`;
const ARCHIVE_STATUS_FILE = `${ARCHIVE_PREFIX}status.json`;
const ARCHIVE_CURSOR_FILE = `${ARCHIVE_PREFIX}cursor.json`;
const DASHBOARD_SESSION_COOKIE = 'tornz_dashboard_session';
const DASHBOARD_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_REBUILD_UPLOADS = 1500;
const TORNSY_MODEL_TTL_MS = 10 * 60 * 1000;
const ARCHIVE_MODEL_TTL_MS = 60 * 60 * 1000;
const ARCHIVE_BATCH_SIZE = 16;
const ARCHIVE_LIMIT = 2000;
const ARCHIVE_INTERVAL = 'h1';
const ARCHIVE_GOAL_START_TS = Date.UTC(2021, 3, 6) / 1000;
const ARCHIVE_REFRESH_COMPLETE_AFTER_MS = 6 * 60 * 60 * 1000;
const ARCHIVE_MIN_RUN_GAP_MS = 12 * 60 * 1000;
const ARCHIVE_CRON_MINUTES = 15;
const TORNSY_INTERVALS = ['m30', 'h1', 'h6', 'd1', 'w1'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return corsResponse(null, 204);
    if (url.pathname.startsWith(DASHBOARD_PREFIX)) return handleDashboardRequest(request, env, url);
    if (url.pathname === DOWNLOAD_PATH) return handleDownloadPage(request, env);
    if (!url.pathname.startsWith(API_PREFIX)) return corsResponse({ ok: false, error: 'Not found' }, 404);

    try {
      if (url.pathname === `${API_PREFIX}/status`) {
        await requireToken(request, env);
        return corsResponse({ ok: true, service: 'tornz-stock-sync', configured: isConfigured(env), ts: Date.now() });
      }
      if (url.pathname === `${API_PREFIX}/upload` && request.method === 'POST') {
        return await handleUpload(request, env);
      }
      if (url.pathname === `${API_PREFIX}/model/latest`) {
        return await handleLatestModel(request, env);
      }
      if (url.pathname === `${API_PREFIX}/archive/status`) {
        await requireToken(request, env);
        return corsResponse({ ok: true, archive: await readArchiveStatus(env) });
      }
      if (url.pathname === `${API_PREFIX}/archive/run` && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        validateToken(body.token || bearerToken(request), env);
        const archive = await runTornsyArchiveCollector(env, { trigger: 'api' });
        return corsResponse({ ok: true, archive });
      }
      return corsResponse({ ok: false, error: 'Unsupported endpoint' }, 404);
    } catch (error) {
      const status = error && error.status ? error.status : 500;
      return corsResponse({ ok: false, error: error && error.message ? error.message : 'Worker error' }, status);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runTornsyArchiveCollector(env, {
      trigger: 'cron',
      scheduledTime: event && event.scheduledTime ? event.scheduledTime : Date.now()
    }));
  }
};

async function handleUpload(request, env) {
  const body = await request.json().catch(() => ({}));
  validateToken(body.token, env);
  return corsResponse({
    ok: false,
    disabled: true,
    error: 'User snapshot uploads are disabled. TORNz Stock Intelligence now uses Tornsy public stock history.'
  }, 410);
}

async function handleLatestModel(request, env) {
  let token = '';
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    token = body.token || '';
  } else {
    token = bearerToken(request);
  }
  validateToken(token, env);
  const model = await readLatestModel(env);
  return corsResponse({ ok: true, model });
}

async function handleDownloadPage(request, env) {
  try {
    if (request.method === 'GET') {
      const token = bearerToken(request);
      if (!token) return htmlResponse(renderDownloadPage({ configured: isConfigured(env) }));
      validateToken(token, env);
      const model = await readLatestModel(env);
      return htmlResponse(renderDownloadPage({ configured: isConfigured(env), model }));
    }

    if (request.method !== 'POST') return htmlResponse(renderDownloadPage({ error: 'Unsupported method.' }), 405);

    const body = await readDownloadBody(request);
    validateToken(body.token, env);
    const model = await readLatestModel(env);
    if (body.format === 'json') return jsonDownloadResponse(model);
    if (wantsJson(request)) return corsResponse({ ok: true, model });
    return htmlResponse(renderDownloadPage({ configured: isConfigured(env), model }));
  } catch (error) {
    const status = error && error.status ? error.status : 500;
    if (wantsJson(request)) return corsResponse({ ok: false, error: error.message || 'Download failed' }, status);
    return htmlResponse(renderDownloadPage({ configured: isConfigured(env), error: error.message || 'Download failed' }), status);
  }
}

async function handleDashboardRequest(request, env, url) {
  try {
    if (url.pathname === `${DASHBOARD_PREFIX}/login`) {
      if (request.method === 'GET') return htmlResponse(renderDashboardLogin({ configured: isDashboardConfigured(env), error: url.searchParams.get('error') || '' }));
      if (request.method === 'POST') return handleDashboardLogin(request, env);
      return htmlResponse(renderDashboardLogin({ configured: isDashboardConfigured(env), error: 'Unsupported method.' }), 405);
    }

    if (url.pathname === `${DASHBOARD_PREFIX}/logout` && request.method === 'POST') {
      return redirectResponse(`${DASHBOARD_PREFIX}/login`, { clearCookie: true });
    }

    const session = await requireDashboardSession(request, env);

    if (url.pathname === DASHBOARD_PREFIX || url.pathname === `${DASHBOARD_PREFIX}/`) {
      const data = await buildDashboardData(env);
      return htmlResponse(renderDashboardPage({ data, session, notice: url.searchParams.get('notice') || '', error: url.searchParams.get('error') || '' }));
    }

    if (url.pathname === `${DASHBOARD_PREFIX}/health.json`) {
      const data = await buildDashboardData(env);
      return dashboardJsonResponse({ ok: true, health: data.health, storage: data.storage, activity: data.activity, archive: data.archiveStatus, model: data.modelSummary });
    }

    if (url.pathname === `${DASHBOARD_PREFIX}/actions/clear-smoke-test` && request.method === 'POST') {
      await requireActionConfirm(request, 'clear');
      const result = await clearSmokeTestData(env);
      return redirectResponse(`${DASHBOARD_PREFIX}?notice=${encodeURIComponent(`Smoke test cleanup done: ${result.modelChanged ? 'model updated' : 'model unchanged'}, ${result.rawDeleted} raw upload(s) deleted`)}`);
    }

    if (url.pathname === `${DASHBOARD_PREFIX}/actions/rebuild-model` && request.method === 'POST') {
      await requireActionConfirm(request, 'rebuild');
      const result = await rebuildModelFromRaw(env);
      return redirectResponse(`${DASHBOARD_PREFIX}?notice=${encodeURIComponent(`Model rebuilt from ${result.uploadsMerged} raw upload(s); ${result.stockCount} stock(s)`)}`);
    }

    if (url.pathname === `${DASHBOARD_PREFIX}/actions/run-archive` && request.method === 'POST') {
      await requireActionConfirm(request, 'collect');
      const result = await runTornsyArchiveCollector(env, { trigger: 'dashboard' });
      return redirectResponse(`${DASHBOARD_PREFIX}?notice=${encodeURIComponent(`Archive collector finished: ${result.updatedCount || 0} stock file(s), ${result.stockCount || 0} model stock(s), next cursor ${result.nextIndex || 0}`)}`);
    }

    if (url.pathname === `${DASHBOARD_PREFIX}/actions/purge-raw` && request.method === 'POST') {
      const form = await request.formData();
      if (String(form.get('confirm') || '').trim().toLowerCase() !== 'purge') throw httpError(400, 'Type purge to confirm raw upload deletion.');
      const days = clamp(Math.round(Number(form.get('days') || 90)), 1, 3650);
      const result = await purgeRawOlderThan(env, days);
      return redirectResponse(`${DASHBOARD_PREFIX}?notice=${encodeURIComponent(`Purged ${result.deleted} raw upload(s) older than ${days} day(s)`)}`);
    }

    return htmlResponse(renderDashboardLogin({ configured: isDashboardConfigured(env), error: 'Dashboard endpoint not found.' }), 404);
  } catch (error) {
    const status = error && error.status ? error.status : 500;
    if (status === 401) return redirectResponse(`${DASHBOARD_PREFIX}/login`);
    if (wantsJson(request) || url.pathname.endsWith('.json')) return dashboardJsonResponse({ ok: false, error: error.message || 'Dashboard error' }, status);
    const safeMessage = encodeURIComponent(error.message || 'Dashboard error');
    return redirectResponse(`${DASHBOARD_PREFIX}?error=${safeMessage}`);
  }
}

async function handleDashboardLogin(request, env) {
  if (!isDashboardConfigured(env)) return htmlResponse(renderDashboardLogin({ configured: false, error: 'Dashboard secrets are not configured.' }), 500);
  const form = await request.formData().catch(() => null);
  const username = String(form && form.get('username') || '').trim();
  const password = String(form && form.get('password') || '');
  if (username !== String(env.DASHBOARD_ADMIN_USER || '') || password !== String(env.DASHBOARD_ADMIN_PASSWORD || '')) {
    return htmlResponse(renderDashboardLogin({ configured: true, error: 'Invalid dashboard login.' }), 401);
  }
  const cookieValue = await createDashboardSession(username, env);
  return redirectResponse(DASHBOARD_PREFIX, { setCookie: sessionCookieHeader(cookieValue) });
}

async function buildDashboardData(env) {
  const started = Date.now();
  const health = {
    workerConfigured: isConfigured(env),
    dashboardConfigured: isDashboardConfigured(env),
    r2Connected: false,
    syncTokenConfigured: !!String(env.TORNZ_SYNC_TOKENS || '').trim(),
    workerTime: new Date().toISOString(),
    lastSuccessfulModelRead: '',
    lastSuccessfulUpload: '',
    lastError: '',
    modelJsonValid: false,
    defaultPasswordActive: String(env.DASHBOARD_ADMIN_PASSWORD || '') === 'admin1234'
  };

  let objects = [];
  let rawObjects = [];
  let archiveObjects = [];
  let modelObjects = [];
  let backupObjects = [];
  let model = await readStoredModel(env).catch((error) => {
    health.lastError = error.message || 'Model read failed';
    return null;
  });

  try {
    [rawObjects, archiveObjects, modelObjects, backupObjects] = await Promise.all([
      listR2ObjectsPage(env, RAW_PREFIX, 25),
      listR2ObjectsPage(env, ARCHIVE_OHLC_PREFIX, 50),
      listR2ObjectsPage(env, 'model/', 10),
      listR2ObjectsPage(env, BACKUP_PREFIX, 10)
    ]);
    objects = [...rawObjects, ...archiveObjects, ...modelObjects, ...backupObjects];
    health.r2Connected = true;
  } catch (error) {
    health.r2Connected = false;
    health.lastError = health.lastError || (error.message || 'R2 list failed');
  }

  if (model) {
    health.modelJsonValid = true;
    health.lastSuccessfulModelRead = new Date().toISOString();
    health.lastSuccessfulUpload = model.lastUploadAt ? new Date(model.lastUploadAt).toISOString() : '';
  }

  const archiveStatus = await readArchiveStatus(env).catch(() => null);
  const recentUploads = await readRecentRawUploads(env, rawObjects, 8);
  const storage = buildStorageSummary(objects, rawObjects, archiveObjects, model, archiveStatus);
  const activity = buildActivitySummary(model, rawObjects, recentUploads);
  const modelSummary = buildModelSummary(model);
  const archiveGoal = buildArchiveGoalSummary(model, archiveStatus, archiveObjects);
  const endpoints = await buildEndpointStatus(env, health, started);

  return {
    generatedAt: Date.now(),
    health,
    storage,
    activity,
    archiveStatus,
    archiveGoal,
    modelSummary,
    recentUploads,
    endpoints
  };
}

async function buildEndpointStatus(env, health, started) {
  const checks = [];
  checks.push({ name: '/api/stock-sync/v1/status', ok: isConfigured(env), ms: Date.now() - started, detail: isConfigured(env) ? 'token-gated and configured' : 'missing sync token or R2 binding' });
  const modelStart = Date.now();
  try {
    await readStoredModel(env);
    checks.push({ name: 'R2 model read', ok: true, ms: Date.now() - modelStart, detail: 'model/latest.json readable' });
  } catch (error) {
    checks.push({ name: 'R2 model read', ok: false, ms: Date.now() - modelStart, detail: error.message || 'failed' });
  }
  checks.push({ name: 'dashboard auth', ok: isDashboardConfigured(env), ms: 0, detail: isDashboardConfigured(env) ? 'admin session enabled' : 'missing dashboard secrets' });
  checks.push({ name: '/stock-sync/download', ok: true, ms: 0, detail: 'page route active' });
  checks.push({ name: 'R2 list', ok: health.r2Connected, ms: 0, detail: health.r2Connected ? 'bucket list reachable' : 'bucket list failed' });
  checks.push({ name: 'Tornsy archive cron', ok: !!env.STOCK_SYNC_BUCKET, ms: 0, detail: `gentle R2 collector, ${ARCHIVE_BATCH_SIZE} stocks per scheduled run` });
  return checks;
}

function buildStorageSummary(objects, rawObjects, archiveObjects = [], model = null, archiveStatus = null) {
  const now = Date.now();
  const rawBytes = rawObjects.reduce((sum, object) => sum + Number(object.size || 0), 0);
  const archiveBytes = Number(model && model.archiveBytes || archiveStatus && archiveStatus.archiveBytes || 0)
    || archiveObjects.reduce((sum, object) => sum + Number(object.size || 0), 0);
  const knownObjectBytes = objects
    .filter((object) => !object.key.startsWith(ARCHIVE_OHLC_PREFIX) && !object.key.startsWith(RAW_PREFIX))
    .reduce((sum, object) => sum + Number(object.size || 0), 0);
  const totalBytes = rawBytes + archiveBytes + knownObjectBytes;
  const rawWithDates = rawObjects.map((object) => ({ ...object, uploadedMs: object.uploaded ? new Date(object.uploaded).getTime() : 0 })).filter((object) => object.uploadedMs);
  const newest = rawWithDates.slice().sort((a, b) => b.uploadedMs - a.uploadedMs)[0] || null;
  const oldest = rawWithDates.slice().sort((a, b) => a.uploadedMs - b.uploadedMs)[0] || null;
  const largest = rawObjects.slice().sort((a, b) => Number(b.size || 0) - Number(a.size || 0))[0] || null;
  const last24h = rawWithDates.filter((object) => now - object.uploadedMs <= 24 * 60 * 60 * 1000);
  const last7d = rawWithDates.filter((object) => now - object.uploadedMs <= 7 * 24 * 60 * 60 * 1000);
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = rawWithDates.filter((object) => new Date(object.uploadedMs).toISOString().slice(0, 10) === todayKey);
  const last24hBytes = last24h.reduce((sum, object) => sum + Number(object.size || 0), 0);
  const last7dBytes = last7d.reduce((sum, object) => sum + Number(object.size || 0), 0);
  const dailyBytes = last24hBytes || (last7dBytes ? Math.round(last7dBytes / 7) : 0);
  return {
    totalObjects: objects.length,
    rawObjects: rawObjects.length,
    archiveObjects: Number(archiveStatus && archiveStatus.stockCount || model && model.stockCount || 0) || archiveObjects.length,
    modelObjects: objects.filter((object) => object.key.startsWith('model/')).length,
    backupObjects: objects.filter((object) => object.key.startsWith(BACKUP_PREFIX)).length,
    totalBytes,
    rawBytes,
    totalHuman: formatBytes(totalBytes),
    rawHuman: formatBytes(rawBytes),
    largestRaw: largest ? summarizeObject(largest) : null,
    oldestRaw: oldest ? summarizeObject(oldest) : null,
    newestRaw: newest ? summarizeObject(newest) : null,
    averageRawSize: rawObjects.length ? Math.round(rawBytes / rawObjects.length) : 0,
    averageRawHuman: rawObjects.length ? formatBytes(Math.round(rawBytes / rawObjects.length)) : '-',
    rawToday: today.length,
    rawLast24h: last24h.length,
    rawLast7d: last7d.length,
    dailyGrowthBytes: dailyBytes,
    monthlyGrowthBytes: dailyBytes ? dailyBytes * 30 : 0,
    yearlyGrowthBytes: dailyBytes ? dailyBytes * 365 : 0,
    dailyGrowthHuman: dailyBytes ? formatBytes(dailyBytes) : 'needs more history',
    monthlyGrowthHuman: dailyBytes ? formatBytes(dailyBytes * 30) : 'needs more history',
    yearlyGrowthHuman: dailyBytes ? formatBytes(dailyBytes * 365) : 'needs more history',
    timeTo1gb: estimateTimeToLimit(totalBytes, dailyBytes, 1024 ** 3),
    timeTo10gb: estimateTimeToLimit(totalBytes, dailyBytes, 10 * 1024 ** 3)
  };
}

function buildActivitySummary(model, rawObjects, recentUploads) {
  const identities = new Set();
  recentUploads.forEach((upload) => {
    const label = [upload.xid, upload.name].filter(Boolean).join(' / ');
    if (label) identities.add(label);
  });
  const now = Date.now();
  const rawWithDates = rawObjects.map((object) => ({ ...object, uploadedMs: object.uploaded ? new Date(object.uploaded).getTime() : 0 })).filter((object) => object.uploadedMs);
  return {
    uploadCount: Number(model && model.uploadCount || 0),
    lastUploadAt: model && model.lastUploadAt ? new Date(model.lastUploadAt).toISOString() : '',
    rawToday: rawWithDates.filter((object) => new Date(object.uploadedMs).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    rawLast24h: rawWithDates.filter((object) => now - object.uploadedMs <= 24 * 60 * 60 * 1000).length,
    rawLast7d: rawWithDates.filter((object) => now - object.uploadedMs <= 7 * 24 * 60 * 60 * 1000).length,
    uniqueIdentityCount: identities.size,
    identities: Array.from(identities).slice(0, 20)
  };
}

function buildModelSummary(model) {
  const stocks = model && model.stocks ? model.stocks : {};
  const stockRows = Object.values(stocks)
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, 20);
  const keys = Object.keys(stocks);
  return {
    exists: !!model,
    generatedAt: model && model.generatedAt ? new Date(model.generatedAt).toISOString() : '',
    age: model && model.generatedAt ? formatAge(Date.now() - Number(model.generatedAt || 0)) : '-',
    uploadCount: Number(model && model.uploadCount || 0),
    stockCount: keys.length,
    onlyTst: keys.length === 1 && keys[0] === 'TST',
    source: model && model.source ? String(model.source) : '',
    rows: stockRows
  };
}

function buildArchiveGoalSummary(model, archiveStatus, archiveObjects) {
  const knownStocks = Math.max(
    1,
    Number(archiveStatus && archiveStatus.knownStocks || 0),
    Number(model && model.stockCount || 0),
    36
  );
  const archivedRows = Math.max(0, Number(model && model.archivedRows || 0));
  const archiveBytes = Number(model && model.archiveBytes || archiveStatus && archiveStatus.archiveBytes || 0)
    || archiveObjects.reduce((sum, object) => sum + Number(object.size || 0), 0);
  const rowsPerStockGoal = Math.ceil((Date.now() - ARCHIVE_GOAL_START_TS * 1000) / (60 * 60 * 1000));
  const totalGoalRows = knownStocks * rowsPerStockGoal;
  const bytesPerRow = archivedRows > 0 && archiveBytes > 0 ? archiveBytes / archivedRows : 120;
  const totalGoalBytes = totalGoalRows * bytesPerRow;
  const rowsPerRun = ARCHIVE_BATCH_SIZE * ARCHIVE_LIMIT;
  const runsPerHour = 60 / ARCHIVE_CRON_MINUTES;
  const runsForFirstPass = Math.ceil(knownStocks / ARCHIVE_BATCH_SIZE);
  const minutesForFirstPass = runsForFirstPass * ARCHIVE_CRON_MINUTES;
  const windowsPerStockForFullHistory = Math.ceil(rowsPerStockGoal / ARCHIVE_LIMIT);
  const fullHistoryFetchWindows = knownStocks * windowsPerStockForFullHistory;
  const remainingRows = Math.max(0, totalGoalRows - archivedRows);
  const remainingRunsAtCurrentPace = Math.ceil((remainingRows / ARCHIVE_LIMIT) / ARCHIVE_BATCH_SIZE);
  const remainingMinutesAtCurrentPace = remainingRunsAtCurrentPace * ARCHIVE_CRON_MINUTES;
  return {
    goalStartTs: ARCHIVE_GOAL_START_TS * 1000,
    knownStocks,
    interval: ARCHIVE_INTERVAL,
    rowsPerStockGoal,
    totalGoalRows,
    archivedRows,
    progressPct: totalGoalRows ? clamp((archivedRows / totalGoalRows) * 100, 0, 100) : 0,
    archiveBytes,
    bytesPerRow,
    totalGoalBytes,
    totalGoalHuman: formatBytes(totalGoalBytes),
    archiveHuman: formatBytes(archiveBytes),
    rowsPerRun,
    requestsPerRun: ARCHIVE_BATCH_SIZE + 1,
    rowsPerHour: rowsPerRun * runsPerHour,
    requestsPerHour: (ARCHIVE_BATCH_SIZE + 1) * runsPerHour,
    firstPassTime: formatDuration(minutesForFirstPass * 60 * 1000),
    fullHistoryBackfillTime: formatDuration(remainingMinutesAtCurrentPace * 60 * 1000),
    windowsPerStockForFullHistory,
    fullHistoryFetchWindows,
    remainingRows,
    remainingRunsAtCurrentPace
  };
}

async function readRecentRawUploads(env, rawObjects, limit) {
  const sorted = rawObjects.slice()
    .sort((a, b) => new Date(b.uploaded || 0).getTime() - new Date(a.uploaded || 0).getTime())
    .slice(0, limit);
  const rows = [];
  for (const object of sorted) {
    const payload = await r2ReadJson(env, object.key).catch(() => null);
    rows.push({
      key: object.key,
      uploaded: object.uploaded ? new Date(object.uploaded).toISOString() : '',
      size: Number(object.size || 0),
      sizeHuman: formatBytes(Number(object.size || 0)),
      source: payload ? String(payload.source || '') : 'unreadable',
      version: payload ? String(payload.version || '') : '',
      xid: payload && payload.identity ? String(payload.identity.xid || '') : '',
      name: payload && payload.identity ? String(payload.identity.name || '') : '',
      tickCount: payload && Array.isArray(payload.ticks) ? payload.ticks.length : 0,
      signalCount: payload && Array.isArray(payload.signals) ? payload.signals.length : 0,
      localStockCount: payload && payload.localModel && payload.localModel.stocks ? Object.keys(payload.localModel.stocks).length : 0
    });
  }
  return rows;
}

async function clearSmokeTestData(env) {
  const model = await readLatestModel(env);
  let modelChanged = false;
  if (model && model.stocks && model.stocks.TST) {
    await backupModel(env, model);
    delete model.stocks.TST;
    model.generatedAt = Date.now();
    model.source = 'r2-worker';
    await r2PutJson(env, MODEL_FILE_NAME, model);
    modelChanged = true;
  }

  const rawObjects = (await listAllR2Objects(env, RAW_PREFIX)).filter((object) => object.key.startsWith(RAW_PREFIX));
  const deleteKeys = [];
  for (const object of rawObjects) {
    const payload = await r2ReadJson(env, object.key).catch(() => null);
    if (isSmokeTestPayload(payload)) deleteKeys.push(object.key);
  }
  await deleteR2Keys(env, deleteKeys);
  return { modelChanged, rawDeleted: deleteKeys.length };
}

async function rebuildModelFromRaw(env) {
  const existing = await readLatestModel(env).catch(() => null);
  if (existing) await backupModel(env, existing);

  const rawObjects = (await listAllR2Objects(env, RAW_PREFIX))
    .filter((object) => object.key.startsWith(RAW_PREFIX))
    .sort((a, b) => new Date(a.uploaded || 0).getTime() - new Date(b.uploaded || 0).getTime())
    .slice(-MAX_REBUILD_UPLOADS);

  let model = { schema: 1, source: 'r2-worker', generatedAt: Date.now(), uploadCount: 0, stocks: {} };
  let uploadsMerged = 0;
  for (const object of rawObjects) {
    const payload = await r2ReadJson(env, object.key).catch(() => null);
    if (!payload || isSmokeTestPayload(payload)) continue;
    model = mergeModel(model, payload);
    uploadsMerged += 1;
  }
  model.generatedAt = Date.now();
  model.rebuiltAt = Date.now();
  model.rebuildCappedAt = MAX_REBUILD_UPLOADS;
  await r2PutJson(env, MODEL_FILE_NAME, model);
  return { uploadsMerged, stockCount: Object.keys(model.stocks || {}).length };
}

async function purgeRawOlderThan(env, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const rawObjects = (await listAllR2Objects(env, RAW_PREFIX)).filter((object) => {
    const uploaded = object.uploaded ? new Date(object.uploaded).getTime() : 0;
    return object.key.startsWith(RAW_PREFIX) && uploaded && uploaded < cutoff;
  });
  const keys = rawObjects.map((object) => object.key);
  await deleteR2Keys(env, keys);
  return { deleted: keys.length };
}

function isSmokeTestPayload(payload) {
  if (!payload) return false;
  const source = String(payload.source || '').toLowerCase();
  const xid = String(payload.identity && payload.identity.xid || '').toLowerCase();
  const name = String(payload.identity && payload.identity.name || '').toLowerCase();
  const stocks = payload.localModel && payload.localModel.stocks ? Object.keys(payload.localModel.stocks) : [];
  return source === 'codex-r2-smoke-test' || xid === 'smoke' || name === 'smoke' || name === 'smoke-test' || (stocks.length === 1 && stocks[0] === 'TST');
}

async function backupModel(env, model) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  await r2PutJson(env, `${BACKUP_PREFIX}model-${stamp}.json`, model);
}

async function deleteR2Keys(env, keys) {
  if (!keys.length) return;
  const bucket = r2Bucket(env);
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    if (chunk.length === 1) await bucket.delete(chunk[0]);
    else await bucket.delete(chunk);
  }
}

async function listAllR2Objects(env, prefix = '') {
  const bucket = r2Bucket(env);
  const objects = [];
  let cursor = undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    (page.objects || []).forEach((object) => objects.push({
      key: object.key,
      size: Number(object.size || 0),
      uploaded: object.uploaded ? object.uploaded.toISOString() : '',
      etag: object.etag || ''
    }));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects;
}

async function listR2ObjectsPage(env, prefix = '', limit = 50) {
  const bucket = r2Bucket(env);
  const page = await bucket.list({ prefix, limit: clamp(Math.round(Number(limit || 50)), 1, 1000) });
  return (page.objects || []).map((object) => ({
    key: object.key,
    size: Number(object.size || 0),
    uploaded: object.uploaded ? object.uploaded.toISOString() : '',
    etag: object.etag || ''
  }));
}

async function readStoredModel(env) {
  return r2ReadJson(env, MODEL_FILE_NAME);
}

async function readLatestModel(env) {
  const cached = await r2ReadJson(env, MODEL_FILE_NAME).catch(() => null);
  if (cached && cached.source === 'tornsy-archive-worker') return cached;
  if (cached && cached.source === 'tornsy-worker' && Date.now() - Number(cached.generatedAt || 0) < TORNSY_MODEL_TTL_MS) return cached;

  const model = await fetchTornsyModel();
  await r2PutJson(env, MODEL_FILE_NAME, model).catch(() => null);
  return model;
}

function normalizeArchiveModel(model) {
  const existing = model && typeof model === 'object' ? model : {};
  return {
    schema: 3,
    source: 'tornsy-archive-worker',
    generatedAt: Date.now(),
    uploadCount: 0,
    stockCount: Number(existing.stockCount || 0),
    archivedRows: Number(existing.archivedRows || 0),
    archiveBytes: Number(existing.archiveBytes || 0),
    backtestSamples: Number(existing.backtestSamples || 0),
    archiveInterval: ARCHIVE_INTERVAL,
    note: 'Built from slowly archived Tornsy OHLC candles in Cloudflare R2. No Torn API keys or user snapshots are stored.',
    stocks: existing.stocks && typeof existing.stocks === 'object' ? existing.stocks : {}
  };
}

function summarizeArchiveCursor(cursor) {
  const progressRows = Object.values(cursor && cursor.stocks && typeof cursor.stocks === 'object' ? cursor.stocks : {});
  return {
    stockCount: Math.max(Number(cursor && cursor.stockCount || 0), progressRows.length),
    archivedRows: progressRows.reduce((sum, row) => sum + Number(row && row.rowCount || 0), 0),
    completeCount: progressRows.filter((row) => row && row.complete).length
  };
}

function updateArchiveModelStats(model, cursorSummary, archiveObjects = []) {
  const stocks = model && model.stocks && typeof model.stocks === 'object' ? model.stocks : {};
  model.generatedAt = Date.now();
  model.source = 'tornsy-archive-worker';
  model.schema = 3;
  model.archiveInterval = ARCHIVE_INTERVAL;
  model.stockCount = Math.max(Object.keys(stocks).length, Number(cursorSummary && cursorSummary.stockCount || 0));
  model.archivedRows = Math.max(0, Number(cursorSummary && cursorSummary.archivedRows || 0));
  model.archiveBytes = archiveObjects.reduce((sum, object) => sum + Number(object.size || 0), 0) || Number(model.archiveBytes || 0);
  model.backtestSamples = Object.values(stocks).reduce((sum, stock) => sum + Number(stock && stock.backtestSamples || 0), 0);
  model.note = 'Built from slowly archived Tornsy OHLC candles in Cloudflare R2. No Torn API keys or user snapshots are stored.';
  model.stocks = stocks;
  return model;
}

async function fetchTornsyModel() {
  const url = `https://tornsy.com/api/stocks?interval=${encodeURIComponent(TORNSY_INTERVALS.join(','))}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw httpError(502, `Tornsy HTTP ${response.status}`);
  const json = await response.json();
  const generatedAt = Number(json.timestamp || 0) ? Number(json.timestamp) * 1000 : Date.now();
  const stocks = {};
  (Array.isArray(json.data) ? json.data : []).forEach((row) => {
    const model = tornsyRowToModel(row, generatedAt);
    if (model && model.acronym) stocks[model.acronym] = model;
  });
  return {
    schema: 2,
    source: 'tornsy-worker',
    generatedAt,
    uploadCount: 0,
    stockCount: Object.keys(stocks).length,
    note: 'Built from Tornsy public stock intervals. User snapshot uploads are disabled.',
    stocks
  };
}

function tornsyRowToModel(row, generatedAt) {
  const acronym = String(row && row.stock || '').toUpperCase();
  const currentPrice = Number(row && row.price || 0);
  if (!acronym || currentPrice <= 0) return null;
  const interval = row.interval && typeof row.interval === 'object' ? row.interval : {};
  const change30m = intervalChange(currentPrice, interval.m30);
  const change1h = intervalChange(currentPrice, interval.h1);
  const change6h = intervalChange(currentPrice, interval.h6);
  const change24h = intervalChange(currentPrice, interval.d1);
  const change7d = intervalChange(currentPrice, interval.w1);
  const changes = [change30m, change1h, change6h, change24h, change7d].filter(Number.isFinite);
  const shortTrend = averageNumbers([change30m, change1h]);
  const midTrend = averageNumbers([change6h, change24h]);
  const longTrend = Number.isFinite(change7d) ? change7d : midTrend;
  const volatility = modelVolatility(changes);
  const expectedMovePct = clamp(
    ((Number.isFinite(shortTrend) ? shortTrend : 0) * 0.45)
    + ((Number.isFinite(midTrend) ? midTrend : 0) * 0.35)
    + ((Number.isFinite(longTrend) ? longTrend : 0) * 0.20),
    -8,
    8
  );
  const aligned = trendAlignment(changes);
  const confidence = clamp(Math.round((changes.length * 12) + (aligned * 18) + Math.min(18, Math.abs(expectedMovePct) * 4) - Math.min(24, volatility * 8)), 0, 95);
  return {
    acronym,
    name: String(row.name || acronym),
    samples: changes.length,
    latestPrice: currentPrice,
    lastTs: generatedAt,
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

function intervalChange(currentPrice, row) {
  const price = Number(row && row.price || 0);
  if (currentPrice <= 0 || price <= 0) return null;
  return ((currentPrice - price) / price) * 100;
}

function modelVolatility(values) {
  const rows = values.filter(Number.isFinite);
  if (rows.length < 2) return 0;
  const avg = averageNumbers(rows);
  return rows.reduce((sum, value) => sum + Math.abs(value - avg), 0) / rows.length;
}

function trendAlignment(values) {
  const rows = values.filter((value) => Number.isFinite(value) && Math.abs(value) >= 0.01);
  if (!rows.length) return 0;
  const positive = rows.filter((value) => value > 0).length;
  const negative = rows.filter((value) => value < 0).length;
  return Math.max(positive, negative) / rows.length;
}

function averageNumbers(values) {
  const rows = values.filter(Number.isFinite);
  if (!rows.length) return null;
  return rows.reduce((sum, value) => sum + value, 0) / rows.length;
}

async function runTornsyArchiveCollector(env, options = {}) {
  const startedAt = Date.now();
  const previousStatus = await readArchiveStatus(env).catch(() => null);
  if (previousStatus && previousStatus.runningAt && startedAt - Number(previousStatus.runningAt) < 8 * 60 * 1000) {
    return {
      ...previousStatus,
      skipped: true,
      reason: 'collector already running or recently started'
    };
  }
  if (previousStatus && previousStatus.finishedAt && startedAt - Number(previousStatus.finishedAt) < ARCHIVE_MIN_RUN_GAP_MS) {
    return {
      ...previousStatus,
      skipped: true,
      reason: `collector resting; minimum ${Math.round(ARCHIVE_MIN_RUN_GAP_MS / 60000)} minute gap`
    };
  }

  await r2PutJson(env, ARCHIVE_STATUS_FILE, {
    ...(previousStatus || {}),
    runningAt: startedAt,
    trigger: options.trigger || 'manual',
    status: 'running'
  });

  try {
    const stockRows = await fetchTornsyStockRows();
    const stocks = stockRows
      .map((row) => ({ acronym: String(row.stock || '').toUpperCase(), name: String(row.name || row.stock || '') }))
      .filter((row) => row.acronym)
      .sort((a, b) => a.acronym.localeCompare(b.acronym));
    if (!stocks.length) throw httpError(502, 'Tornsy returned no stocks to archive.');

    const cursor = normalizeArchiveCursor(await r2ReadJson(env, ARCHIVE_CURSOR_FILE).catch(() => ({ nextIndex: 0 })));
    const currentRows = new Map(stockRows.map((row) => [String(row.stock || '').toUpperCase(), row]));
    const model = normalizeArchiveModel(await readStoredModel(env).catch(() => null));
    const startIndex = clamp(Math.round(Number(cursor.nextIndex || 0)), 0, Math.max(0, stocks.length - 1));
    const selected = selectArchiveBatch(stocks, cursor, startIndex);

    const updated = [];
    for (const stock of selected) {
      try {
        const progress = cursor.stocks[stock.acronym] || {};
        const existing = await r2ReadJson(env, archiveStockKey(stock.acronym)).catch(() => null);
        const fromTs = Number(progress.nextFrom || 0) || nextArchiveFrom(existing);
        const segment = await fetchTornsyOhlcArchive(stock, fromTs);
        const merged = mergeArchivePayload(existing, segment);
        const putResult = await r2PutJson(env, archiveStockKey(stock.acronym), merged);
        const stockModel = archivePayloadToModel(merged, currentRows.get(stock.acronym));
        if (stockModel) model.stocks[stockModel.acronym] = stockModel;
        const segmentLastTs = segment.rows.length ? segment.rows[segment.rows.length - 1].ts : 0;
        const mergedLastTs = merged.rows.length ? merged.rows[merged.rows.length - 1].ts : 0;
        const nextFrom = segment.rows.length ? Math.floor(segmentLastTs / 1000) + 3600 : fromTs + (ARCHIVE_LIMIT * 3600);
        const complete = (segment.rows.length < ARCHIVE_LIMIT && segmentLastTs > 0 && Date.now() - segmentLastTs < 2 * 60 * 60 * 1000)
          || (segment.rows.length === 0 && mergedLastTs > 0 && Date.now() - mergedLastTs < 2 * 60 * 60 * 1000);
        cursor.stocks[stock.acronym] = {
          nextFrom,
          complete,
          rowCount: merged.rows.length,
          firstTs: merged.rows.length ? merged.rows[0].ts : 0,
          lastTs: mergedLastTs,
          cursorLastTs: segmentLastTs,
          size: putResult.size,
          lastFetchedAt: Date.now()
        };
        updated.push({
          acronym: stock.acronym,
          rows: segment.rows.length,
          totalRows: merged.rows.length,
          fromTs: fromTs * 1000,
          lastTs: mergedLastTs,
          cursorLastTs: segmentLastTs,
          complete
        });
      } catch (error) {
        updated.push({ acronym: stock.acronym, error: error.message || 'archive fetch failed' });
      }
      await sleep(250);
    }

    const nextIndex = (startIndex + selected.length) % stocks.length;
    cursor.nextIndex = nextIndex;
    cursor.stockCount = stocks.length;
    cursor.updatedAt = Date.now();
    await r2PutJson(env, ARCHIVE_CURSOR_FILE, cursor);

    const archiveObjects = await listAllR2Objects(env, ARCHIVE_OHLC_PREFIX).catch(() => []);
    const cursorSummary = summarizeArchiveCursor(cursor);
    updateArchiveModelStats(model, cursorSummary, archiveObjects);
    if (model.stockCount) await r2PutJson(env, MODEL_FILE_NAME, model);

    const status = {
      schema: 1,
      status: 'ok',
      trigger: options.trigger || 'manual',
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      stockCount: model.stockCount,
      knownStocks: stocks.length,
      archivedRows: model.archivedRows,
      archiveBytes: model.archiveBytes,
      updatedCount: updated.filter((row) => !row.error).length,
      updated,
      nextIndex,
      lastError: ''
    };
    await r2PutJson(env, ARCHIVE_STATUS_FILE, status);
    return status;
  } catch (error) {
    const status = {
      schema: 1,
      status: 'error',
      trigger: options.trigger || 'manual',
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      lastError: error.message || 'archive collector failed'
    };
    await r2PutJson(env, ARCHIVE_STATUS_FILE, status).catch(() => null);
    throw error;
  }
}

async function readArchiveStatus(env) {
  return r2ReadJson(env, ARCHIVE_STATUS_FILE).catch(() => ({
    schema: 1,
    status: 'not started',
    updatedCount: 0,
    stockCount: 0,
    lastError: ''
  }));
}

async function fetchTornsyStockRows() {
  const url = `https://tornsy.com/api/stocks?interval=${encodeURIComponent(TORNSY_INTERVALS.join(','))}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw httpError(502, `Tornsy stock list HTTP ${response.status}`);
  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
}

function normalizeArchiveCursor(cursor) {
  return {
    schema: 2,
    nextIndex: Math.max(0, Math.round(Number(cursor && cursor.nextIndex || 0))),
    stockCount: Math.max(0, Math.round(Number(cursor && cursor.stockCount || 0))),
    updatedAt: Number(cursor && cursor.updatedAt || 0),
    stocks: cursor && cursor.stocks && typeof cursor.stocks === 'object' ? cursor.stocks : {}
  };
}

function selectArchiveBatch(stocks, cursor, startIndex) {
  const selected = [];
  const now = Date.now();
  for (let pass = 0; pass < 2 && selected.length < Math.min(ARCHIVE_BATCH_SIZE, stocks.length); pass += 1) {
    for (let offset = 0; offset < stocks.length && selected.length < Math.min(ARCHIVE_BATCH_SIZE, stocks.length); offset += 1) {
      const stock = stocks[(startIndex + offset) % stocks.length];
      if (selected.some((row) => row.acronym === stock.acronym)) continue;
      const progress = cursor.stocks[stock.acronym] || {};
      const isDueRefresh = progress.complete && Number(progress.lastFetchedAt || 0) && now - Number(progress.lastFetchedAt || 0) >= ARCHIVE_REFRESH_COMPLETE_AFTER_MS;
      if (pass === 0 && !progress.complete) selected.push(stock);
      if (pass === 1 && isDueRefresh) selected.push(stock);
    }
  }
  return selected;
}

function nextArchiveFrom(existing) {
  const rows = existing && Array.isArray(existing.rows) ? existing.rows.map(normalizeOhlcRow).filter(Boolean).sort((a, b) => a.ts - b.ts) : [];
  if (!rows.length) return ARCHIVE_GOAL_START_TS;
  const firstTs = Math.floor(rows[0].ts / 1000);
  if (firstTs > ARCHIVE_GOAL_START_TS + 3600) return ARCHIVE_GOAL_START_TS;
  const lastTs = Math.floor(rows[rows.length - 1].ts / 1000);
  return lastTs + 3600;
}

function mergeArchivePayload(existing, incoming) {
  const acronym = String((incoming && incoming.acronym) || (existing && existing.acronym) || '').toUpperCase();
  const name = String((incoming && incoming.name) || (existing && existing.name) || acronym);
  const map = new Map();
  [existing, incoming].forEach((payload) => {
    (payload && Array.isArray(payload.rows) ? payload.rows : [])
      .map(normalizeOhlcRow)
      .filter(Boolean)
      .forEach((row) => map.set(String(row.ts), row));
  });
  const rows = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  return {
    schema: 2,
    source: 'tornsy-ohlc-full',
    acronym,
    name,
    interval: ARCHIVE_INTERVAL,
    fetchedAt: Date.now(),
    rowCount: rows.length,
    firstTs: rows.length ? rows[0].ts : 0,
    lastTs: rows.length ? rows[rows.length - 1].ts : 0,
    rows
  };
}

async function fetchTornsyOhlcArchive(stock, fromTs = 0) {
  const acronym = String(stock.acronym || '').toUpperCase();
  const params = new URLSearchParams({
    interval: ARCHIVE_INTERVAL,
    limit: String(ARCHIVE_LIMIT)
  });
  if (fromTs) params.set('from', String(Math.round(Number(fromTs))));
  const url = `https://tornsy.com/api/${encodeURIComponent(acronym)}?${params.toString()}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw httpError(502, `Tornsy ${acronym} OHLC HTTP ${response.status}`);
  const json = await response.json();
  const rows = normalizeOhlcRows(json)
    .sort((a, b) => a.ts - b.ts)
    .slice(-ARCHIVE_LIMIT);
  return {
    schema: 1,
    source: 'tornsy-ohlc',
    acronym,
    name: stock.name || acronym,
    interval: ARCHIVE_INTERVAL,
    fetchedAt: Date.now(),
    rowCount: rows.length,
    rows
  };
}

function normalizeOhlcRows(json) {
  const source = Array.isArray(json && json.data) ? json.data
    : Array.isArray(json && json.ohlc) ? json.ohlc
      : Array.isArray(json) ? json
        : [];
  return source.map(normalizeOhlcRow).filter(Boolean);
}

function normalizeOhlcRow(row) {
  if (Array.isArray(row)) {
    const ts = normalizeTimestamp(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    if (!ts || close <= 0) return null;
    return { ts, open, high, low, close, totalShares: Math.round(Number(row[5] || 0)) };
  }
  if (!row || typeof row !== 'object') return null;
  const ts = normalizeTimestamp(row.ts || row.timestamp || row.time || row.date);
  const close = Number(row.close || row.price || row.c || 0);
  if (!ts || close <= 0) return null;
  return {
    ts,
    open: Number(row.open || row.o || close),
    high: Number(row.high || row.h || close),
    low: Number(row.low || row.l || close),
    close,
    totalShares: Math.round(Number(row.totalShares || row.total_shares || row.shares || 0))
  };
}

function normalizeTimestamp(value) {
  if (typeof value === 'string' && /[a-z-]/i.test(value)) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return number < 100000000000 ? number * 1000 : number;
}

async function buildArchiveModelFromR2(env, options = {}) {
  const objects = await listAllR2Objects(env, ARCHIVE_OHLC_PREFIX);
  const currentRows = new Map((options.stockRows || []).map((row) => [String(row.stock || '').toUpperCase(), row]));
  const stocks = {};
  const archiveBytes = objects.reduce((sum, object) => sum + Number(object.size || 0), 0);
  let archivedRows = 0;
  let backtestSamples = 0;
  for (const object of objects) {
    const payload = await r2ReadJson(env, object.key).catch(() => null);
    const model = archivePayloadToModel(payload, currentRows.get(String(payload && payload.acronym || '').toUpperCase()));
    if (!model) continue;
    stocks[model.acronym] = model;
    archivedRows += Number(payload.rowCount || (payload.rows ? payload.rows.length : 0) || 0);
    backtestSamples += Number(model.backtestSamples || 0);
  }
  const stockCount = Object.keys(stocks).length;
  if (!stockCount) return null;
  return {
    schema: 3,
    source: 'tornsy-archive-worker',
    generatedAt: Date.now(),
    uploadCount: 0,
    stockCount,
    archivedRows,
    archiveBytes,
    backtestSamples,
    archiveInterval: ARCHIVE_INTERVAL,
    note: 'Built from slowly archived Tornsy OHLC candles in Cloudflare R2. No Torn API keys or user snapshots are stored.',
    stocks
  };
}

function archivePayloadToModel(payload, currentRow = null) {
  if (!payload || !payload.acronym || !Array.isArray(payload.rows) || payload.rows.length < 12) return null;
  const rows = payload.rows
    .map(normalizeOhlcRow)
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
  if (rows.length < 12) return null;
  const latest = rows[rows.length - 1];
  const currentPrice = Number(currentRow && currentRow.price || latest.close);
  const change1h = archiveChangeHours(rows, 1);
  const change6h = archiveChangeHours(rows, 6);
  const change24h = archiveChangeHours(rows, 24);
  const change7d = archiveChangeHours(rows, 24 * 7);
  const changes = [change1h, change6h, change24h, change7d].filter(Number.isFinite);
  const expectedMovePct = archiveExpectedMove(change1h, change6h, change24h, change7d);
  const hourlyReturns = [];
  for (let index = Math.max(1, rows.length - 168); index < rows.length; index += 1) {
    hourlyReturns.push(percentDelta(rows[index - 1].close, rows[index].close));
  }
  const volatility = averageNumbers(hourlyReturns.map(Math.abs)) || 0;
  const backtest = backtestArchiveRows(rows);
  const aligned = trendAlignment(changes);
  const sampleFactor = clamp(rows.length / 16, 0, 35);
  const backtestFactor = backtest.samples ? clamp((backtest.hitRate - 0.5) * 80, -18, 26) : 0;
  const strengthFactor = clamp(Math.abs(expectedMovePct) * 8, 0, 18);
  const confidence = clamp(Math.round(10 + sampleFactor + backtestFactor + (aligned * 14) + strengthFactor - clamp(volatility * 4, 0, 20)), 0, 98);
  return {
    acronym: String(payload.acronym).toUpperCase(),
    name: String(payload.name || (currentRow && currentRow.name) || payload.acronym),
    samples: rows.length,
    latestPrice: currentPrice,
    lastTs: latest.ts,
    change1h,
    change6h,
    change24h,
    change7d,
    volatility,
    expectedMovePct,
    confidence,
    hitRate: backtest.samples ? Math.round(backtest.hitRate * 1000) / 10 : null,
    backtestSamples: backtest.samples,
    backtestAvgOutcomePct: backtest.avgOutcomePct,
    provider: 'Tornsy archive'
  };
}

function archiveChangeHours(rows, hours) {
  const latest = rows[rows.length - 1];
  const targetTs = latest.ts - (hours * 60 * 60 * 1000);
  let base = rows[0];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].ts <= targetTs) {
      base = rows[index];
      break;
    }
  }
  return percentDelta(base.close, latest.close);
}

function archiveExpectedMove(change1h, change6h, change24h, change7d) {
  const shortTrend = averageNumbers([change1h, change6h]);
  const longTrend = averageNumbers([change24h, change7d]);
  const raw = ((Number.isFinite(shortTrend) ? shortTrend : 0) * 0.55)
    + ((Number.isFinite(longTrend) ? longTrend : 0) * 0.25)
    + ((Number.isFinite(change24h) && Number.isFinite(change1h) && change24h < -1 && change1h > 0) ? 0.18 : 0);
  return clamp(raw, -8, 8);
}

function backtestArchiveRows(rows) {
  let hits = 0;
  let samples = 0;
  let outcomeTotal = 0;
  for (let index = 24 * 7; index < rows.length - 6; index += 6) {
    const prior = rows.slice(0, index + 1);
    const signal = archiveExpectedMove(
      archiveChangeHours(prior, 1),
      archiveChangeHours(prior, 6),
      archiveChangeHours(prior, 24),
      archiveChangeHours(prior, 24 * 7)
    );
    if (!Number.isFinite(signal) || Math.abs(signal) < 0.03) continue;
    const outcome = percentDelta(rows[index].close, rows[index + 6].close);
    if (!Number.isFinite(outcome)) continue;
    samples += 1;
    outcomeTotal += outcome;
    if ((signal > 0 && outcome >= 0) || (signal < 0 && outcome <= 0)) hits += 1;
  }
  return {
    samples,
    hitRate: samples ? hits / samples : 0,
    avgOutcomePct: samples ? outcomeTotal / samples : null
  };
}

function percentDelta(from, to) {
  const base = Number(from);
  const value = Number(to);
  if (!Number.isFinite(base) || !Number.isFinite(value) || base <= 0) return null;
  return ((value - base) / base) * 100;
}

function archiveStockKey(acronym) {
  return `${ARCHIVE_OHLC_PREFIX}${String(acronym || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '')}.json`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readDownloadBody(request) {
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  return {
    token: String(form.get('token') || ''),
    format: String(form.get('format') || '')
  };
}

async function requireActionConfirm(request, expected) {
  const form = await request.formData();
  if (String(form.get('confirm') || '').trim().toLowerCase() !== expected) {
    throw httpError(400, `Type ${expected} to confirm.`);
  }
}

function wantsJson(request) {
  const accept = String(request.headers.get('Accept') || '').toLowerCase();
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  return accept.includes('application/json') || contentType.includes('application/json');
}

function isConfigured(env) {
  return !!(env.STOCK_SYNC_BUCKET && env.TORNZ_SYNC_TOKENS);
}

function isDashboardConfigured(env) {
  return !!(env.DASHBOARD_ADMIN_USER && env.DASHBOARD_ADMIN_PASSWORD && env.DASHBOARD_SESSION_SECRET);
}

async function requireToken(request, env) {
  validateToken(bearerToken(request), env);
}

function bearerToken(request) {
  return String(request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function validateToken(token, env) {
  const value = String(token || '').trim();
  const allowed = parseAllowedTokens(env.TORNZ_SYNC_TOKENS);
  if (!value || !allowed.includes(value)) throw httpError(401, 'Invalid or missing sync token.');
}

function parseAllowedTokens(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch (error) {
    // Comma/newline separated secrets are easier for quick private deployments.
  }
  return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizePayload(payload) {
  return {
    schema: 1,
    app: String(payload.app || "TORN'z Tools"),
    version: String(payload.version || ''),
    source: String(payload.source || 'extension'),
    exportedAt: numberOrNow(payload.exportedAt),
    identity: {
      xid: String(payload.identity && payload.identity.xid || ''),
      name: String(payload.identity && payload.identity.name || '')
    },
    context: payload.context && typeof payload.context === 'object' ? payload.context : {},
    localModel: payload.localModel && typeof payload.localModel === 'object' ? payload.localModel : { stocks: {} },
    ticks: Array.isArray(payload.ticks) ? payload.ticks.slice(-12000).map(normalizeTick).filter(Boolean) : [],
    signals: Array.isArray(payload.signals) ? payload.signals.slice(-1200).map(normalizeSignal).filter(Boolean) : []
  };
}

function normalizeTick(row) {
  if (!row || !row.acronym || !Number(row.price)) return null;
  return {
    ts: numberOrNow(row.ts),
    acronym: String(row.acronym).toUpperCase(),
    stockId: String(row.stockId || ''),
    price: Number(row.price),
    name: String(row.name || row.acronym),
    totalShares: Math.round(Number(row.totalShares || 0)),
    availableShares: Math.round(Number(row.availableShares || 0))
  };
}

function normalizeSignal(row) {
  if (!row || !row.acronym || !row.action) return null;
  return {
    ts: numberOrNow(row.ts),
    acronym: String(row.acronym).toUpperCase(),
    stockId: String(row.stockId || ''),
    action: String(row.action),
    priority: Math.round(Number(row.priority || 0)),
    price: Number(row.price || 0)
  };
}

function assertNoApiKeys(value) {
  const text = JSON.stringify(value || {});
  if (/"apiKey"\s*:|"key"\s*:\s*"[A-Za-z0-9]{12,}"/i.test(text)) throw httpError(400, 'Payload appears to contain a key and was rejected.');
}

function rawFileName(payload) {
  const date = new Date(payload.exportedAt || Date.now());
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const xid = String(payload.identity && payload.identity.xid || 'anon').replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'anon';
  return `raw/${day}/${hour}/${xid}-${date.getTime()}.json`;
}

function mergeModel(previous, payload) {
  const now = Date.now();
  const stocks = { ...((previous && previous.stocks) || {}) };
  const incoming = payload.localModel && payload.localModel.stocks ? payload.localModel.stocks : {};
  Object.entries(incoming).forEach(([acronym, row]) => {
    const key = String(acronym || row.acronym || '').toUpperCase();
    if (!key) return;
    const old = stocks[key] || {};
    const oldSamples = Math.max(0, Number(old.samples || 0));
    const newSamples = Math.max(1, Number(row.samples || 1));
    const total = Math.max(1, oldSamples + newSamples);
    stocks[key] = {
      acronym: key,
      samples: Math.min(1000000, total),
      latestPrice: Number(row.latestPrice || old.latestPrice || 0),
      lastTs: Math.max(Number(row.lastTs || 0), Number(old.lastTs || 0)),
      expectedMovePct: weighted(old.expectedMovePct, oldSamples, row.expectedMovePct, newSamples),
      confidence: clamp(weighted(old.confidence, oldSamples, row.confidence, newSamples), 0, 98),
      change1h: weighted(old.change1h, oldSamples, row.change1h, newSamples),
      change6h: weighted(old.change6h, oldSamples, row.change6h, newSamples),
      change24h: weighted(old.change24h, oldSamples, row.change24h, newSamples),
      volatility: weighted(old.volatility, oldSamples, row.volatility, newSamples),
      hitRate: old.hitRate == null ? null : old.hitRate
    };
  });
  return {
    schema: 1,
    source: 'r2-worker',
    generatedAt: now,
    uploadCount: Number(previous && previous.uploadCount || 0) + 1,
    lastUploadAt: payload.exportedAt || now,
    stocks
  };
}

function weighted(a, aw, b, bw) {
  const av = Number.isFinite(Number(a)) ? Number(a) : 0;
  const bv = Number.isFinite(Number(b)) ? Number(b) : 0;
  return ((av * Math.max(0, aw)) + (bv * Math.max(0, bw))) / Math.max(1, Math.max(0, aw) + Math.max(0, bw));
}

function r2Bucket(env) {
  if (!env.STOCK_SYNC_BUCKET) throw httpError(500, 'Cloud storage is not configured. Add the STOCK_SYNC_BUCKET R2 binding.');
  return env.STOCK_SYNC_BUCKET;
}

async function r2PutJson(env, key, object) {
  const text = JSON.stringify(object);
  const result = await r2Bucket(env).put(key, text, {
    httpMetadata: { contentType: 'application/json; charset=UTF-8' }
  });
  return {
    key,
    size: text.length,
    uploaded: result && result.uploaded ? result.uploaded.toISOString() : new Date().toISOString()
  };
}

async function r2ReadJson(env, key) {
  const object = await r2Bucket(env).get(key);
  if (!object) throw httpError(404, 'No shared model exists yet.');
  const text = await object.text();
  try {
    return JSON.parse(text || '{}');
  } catch (error) {
    throw httpError(500, `Stored JSON is not valid: ${error.message}`);
  }
}

function corsResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
  });
}

function dashboardJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function redirectResponse(location, options = {}) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  if (options.setCookie) headers.append('Set-Cookie', options.setCookie);
  if (options.clearCookie) headers.append('Set-Cookie', `${DASHBOARD_SESSION_COOKIE}=; Path=${DASHBOARD_PREFIX}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
}

function jsonDownloadResponse(model) {
  return new Response(JSON.stringify(model || {}, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tornz-stock-model-latest.json"`,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function createDashboardSession(user, env) {
  const now = Date.now();
  const payload = { user, iat: now, exp: now + DASHBOARD_SESSION_TTL_MS };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signSession(encodedPayload, env);
  return `${encodedPayload}.${signature}`;
}

async function requireDashboardSession(request, env) {
  if (!isDashboardConfigured(env)) throw httpError(500, 'Dashboard secrets are not configured.');
  const cookie = getCookie(request, DASHBOARD_SESSION_COOKIE);
  if (!cookie || !cookie.includes('.')) throw httpError(401, 'Dashboard login required.');
  const [encodedPayload, signature] = cookie.split('.');
  const expected = await signSession(encodedPayload, env);
  if (!timingSafeEqual(signature, expected)) throw httpError(401, 'Dashboard login required.');
  let payload = null;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (error) {
    throw httpError(401, 'Invalid dashboard session.');
  }
  if (!payload || Number(payload.exp || 0) < Date.now()) throw httpError(401, 'Dashboard session expired.');
  return payload;
}

async function signSession(encodedPayload, env) {
  const secret = String(env.DASHBOARD_SESSION_SECRET || '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function sessionCookieHeader(value) {
  const maxAge = Math.floor(DASHBOARD_SESSION_TTL_MS / 1000);
  return `${DASHBOARD_SESSION_COOKIE}=${value}; Path=${DASHBOARD_PREFIX}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function getCookie(request, name) {
  const cookies = String(request.headers.get('Cookie') || '').split(';');
  for (const cookie of cookies) {
    const [rawName, ...parts] = cookie.trim().split('=');
    if (rawName === name) return parts.join('=');
  }
  return '';
}

function timingSafeEqual(a, b) {
  const av = String(a || '');
  const bv = String(b || '');
  if (av.length !== bv.length) return false;
  let result = 0;
  for (let index = 0; index < av.length; index += 1) result |= av.charCodeAt(index) ^ bv.charCodeAt(index);
  return result === 0;
}

function base64UrlEncode(text) {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function renderDownloadPage({ configured = false, model = null, error = '' } = {}) {
  const stocks = model && model.stocks ? model.stocks : {};
  const stockRows = Object.values(stocks)
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, 12);
  const generated = model && model.generatedAt ? new Date(model.generatedAt) : null;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TORN'z Stock Intelligence Download</title>
  ${baseStyles()}
</head>
<body>
  <main class="page">
    <header class="top">
      <div>
        <h1>TORN'z Stock Intelligence Download</h1>
        <div class="muted">Private Tornsy-backed stock intelligence model for TORN'z Tools.</div>
      </div>
      <div class="top-actions">
        <a class="button" href="${DASHBOARD_PREFIX}">Dashboard</a>
        <div class="tag ${configured ? 'ok' : 'bad'}">${configured ? 'configured' : 'not configured'}</div>
      </div>
    </header>
    <section>
      ${error ? `<div class="alert bad">${escapeHtml(error)}</div>` : ''}
      <strong>Private access</strong>
      <p class="muted">Enter your TORN'z sync token to inspect or download the latest Tornsy-backed model. The model contains stock movement statistics, confidence, volatility, and expected move data. It does not contain Torn API keys or user snapshot uploads.</p>
      <div class="access-card">
        <form class="token-form" method="post" id="download-form">
          <input id="sync-token" name="token" type="password" autocomplete="off" placeholder="TORN'z sync token" required>
          <button class="primary" type="submit">Show model</button>
          <button type="submit" name="format" value="json">Download JSON</button>
        </form>
        <div class="remember-row">
          <label class="switch-check">
            <input id="remember-token" type="checkbox">
            <span></span>
            <strong>Remember this token on this computer</strong>
          </label>
          <button type="button" class="mini" id="forget-token">Forget token</button>
        </div>
        <div class="inline-note">Only use this on your own computer. The token is stored in this browser only, never server-side and never in the URL.</div>
      </div>
    </section>
    <section>
      <strong>model/latest.json</strong>
      <div class="grid four">
        <div class="metric"><strong>${escapeHtml(String(Object.keys(stocks).length))}</strong><span class="muted">Stocks</span></div>
        <div class="metric"><strong>${escapeHtml(String(model && model.uploadCount || 0))}</strong><span class="muted">User uploads</span></div>
        <div class="metric"><strong>${generated ? escapeHtml(formatDateShort(generated)) : '-'}</strong><span class="muted">Generated</span></div>
        <div class="metric"><strong>${model && model.source ? escapeHtml(model.source) : '-'}</strong><span class="muted">Source</span></div>
      </div>
      ${stockRows.length ? renderModelRows(stockRows, false) : '<p class="muted">No model loaded yet. The Worker will request Tornsy when the page or API is opened.</p>'}
    </section>
    <footer>Made by FLUZ [4325064] - manual-assist only - Tornsy-backed model - no API keys or user snapshots uploaded</footer>
  </main>
  <script>
    (() => {
      const key = 'tornz.stockSyncDownloadToken';
      const form = document.getElementById('download-form');
      const input = document.getElementById('sync-token');
      const remember = document.getElementById('remember-token');
      const forget = document.getElementById('forget-token');
      const saved = localStorage.getItem(key) || '';
      if (saved && input && !input.value) {
        input.value = saved;
        remember.checked = true;
      }
      form && form.addEventListener('submit', () => {
        if (!input) return;
        if (remember && remember.checked) localStorage.setItem(key, input.value || '');
        else localStorage.removeItem(key);
      });
      forget && forget.addEventListener('click', () => {
        localStorage.removeItem(key);
        if (input) input.value = '';
        if (remember) remember.checked = false;
      });
    })();
  </script>
</body>
</html>`;
}

function renderDashboardLogin({ configured = false, error = '' } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TORN'z Stock Intelligence Dashboard Login</title>
  ${baseStyles()}
</head>
<body>
  <main class="page narrow">
    <header class="top">
      <div>
        <h1>TORN'z Stock Intelligence Dashboard</h1>
        <div class="muted">Private control panel for Tornsy-backed stock intelligence.</div>
      </div>
      <div class="tag ${configured ? 'ok' : 'bad'}">${configured ? 'login' : 'not configured'}</div>
    </header>
    <section>
      ${error ? `<div class="alert bad">${escapeHtml(error)}</div>` : ''}
      <form class="login-form" method="post" action="${DASHBOARD_PREFIX}/login">
        <label>Username<input name="username" type="text" autocomplete="username" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="primary" type="submit">Login</button>
      </form>
    </section>
    <footer>Made by FLUZ [4325064] - private admin access</footer>
  </main>
</body>
</html>`;
}

function renderDashboardPage({ data, session, notice = '', error = '' }) {
  const { health, storage, activity, archiveStatus, archiveGoal, modelSummary, recentUploads, endpoints } = data;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TORN'z Stock Intelligence Dashboard</title>
  ${baseStyles()}
</head>
<body>
  <main class="page wide">
    <header class="top">
      <div>
        <h1>TORN'z Stock Intelligence Dashboard</h1>
        <div class="muted">Tornsy model health, Worker status, cache activity, and storage overview.</div>
      </div>
      <div class="top-actions">
        <span class="tag ${health.r2Connected && health.modelJsonValid ? 'ok' : 'warn'}">${health.r2Connected && health.modelJsonValid ? 'healthy' : 'check'}</span>
        <a class="button" href="${DOWNLOAD_PATH}">Download page</a>
        <span class="muted">${escapeHtml(session.user || 'admin')}</span>
        <form method="post" action="${DASHBOARD_PREFIX}/logout"><button type="submit">Logout</button></form>
      </div>
    </header>
    ${notice ? `<div class="alert ok">${escapeHtml(notice)}</div>` : ''}
    ${error ? `<div class="alert bad">${escapeHtml(error)}</div>` : ''}
    ${health.defaultPasswordActive ? '<div class="alert warn">Default admin password is active. Change it in Cloudflare Worker secrets.</div>' : ''}
    ${modelSummary.onlyTst ? '<div class="alert warn">Model currently contains only smoke-test stock TST. Use the cleanup action after real uploads arrive.</div>' : ''}

    <section>
      <h2>System Health</h2>
      <div class="grid five">
        ${metric('Worker', yesNo(health.workerConfigured), health.workerConfigured ? 'ok' : 'bad')}
        ${metric('R2 bucket', yesNo(health.r2Connected), health.r2Connected ? 'ok' : 'bad')}
        ${metric('Sync token', yesNo(health.syncTokenConfigured), health.syncTokenConfigured ? 'ok' : 'bad')}
        ${metric('Model JSON', yesNo(health.modelJsonValid), health.modelJsonValid ? 'ok' : 'warn')}
        ${metric('Worker time', formatDateShort(new Date(health.workerTime)), 'plain')}
      </div>
      <div class="grid three">
        ${metric('Last model read', health.lastSuccessfulModelRead ? formatDateShort(new Date(health.lastSuccessfulModelRead)) : '-', health.lastSuccessfulModelRead ? 'ok' : 'warn')}
        ${metric('Last upload', health.lastSuccessfulUpload ? formatDateShort(new Date(health.lastSuccessfulUpload)) : '-', health.lastSuccessfulUpload ? 'ok' : 'warn')}
        ${metric('Last error', health.lastError || '-', health.lastError ? 'bad' : 'ok')}
      </div>
    </section>

    <section>
      <h2>R2 Storage Overview</h2>
      <div class="grid five">
        ${metric('Objects', storage.totalObjects)}
        ${metric('Raw uploads', storage.rawObjects)}
        ${metric('Archive files', storage.archiveObjects)}
        ${metric('Models', storage.modelObjects)}
        ${metric('Total stored', storage.totalHuman)}
      </div>
      <div class="grid four">
        ${metric('Largest raw', storage.largestRaw ? `${storage.largestRaw.sizeHuman}` : '-')}
        ${metric('Oldest raw', storage.oldestRaw ? formatDateShort(new Date(storage.oldestRaw.uploaded)) : '-')}
        ${metric('Newest raw', storage.newestRaw ? formatDateShort(new Date(storage.newestRaw.uploaded)) : '-')}
        ${metric('Avg raw size', storage.averageRawHuman)}
      </div>
      <div class="grid five">
        ${metric('Daily growth', storage.dailyGrowthHuman)}
        ${metric('30-day estimate', storage.monthlyGrowthHuman)}
        ${metric('365-day estimate', storage.yearlyGrowthHuman)}
        ${metric('Until 1 GB', storage.timeTo1gb)}
        ${metric('Until 10 GB', storage.timeTo10gb)}
      </div>
    </section>

    <section>
      <h2>Tornsy Archive Collector</h2>
      <div class="grid five">
        ${metric('Status', archiveStatus && archiveStatus.status ? archiveStatus.status : 'not started', archiveStatus && archiveStatus.status === 'ok' ? 'ok' : archiveStatus && archiveStatus.status === 'error' ? 'bad' : 'warn')}
        ${metric('Last run', archiveStatus && archiveStatus.finishedAt ? formatDateShort(new Date(archiveStatus.finishedAt)) : '-')}
        ${metric('Updated files', archiveStatus && archiveStatus.updatedCount != null ? archiveStatus.updatedCount : 0)}
        ${metric('Model stocks', archiveStatus && archiveStatus.stockCount != null ? archiveStatus.stockCount : modelSummary.stockCount)}
        ${metric('Next cursor', archiveStatus && archiveStatus.nextIndex != null ? archiveStatus.nextIndex : '-')}
      </div>
      <p class="muted">The collector is intentionally gentle: one stock list request plus ${ARCHIVE_BATCH_SIZE} OHLC history requests per scheduled run, one after another. It enforces a ${Math.round(ARCHIVE_MIN_RUN_GAP_MS / 60000)} minute rest gap so manual clicks cannot spam Tornsy.</p>
      ${archiveStatus && Array.isArray(archiveStatus.updated) && archiveStatus.updated.length ? `
      <table>
        <thead><tr><th>Stock</th><th>New rows</th><th>Total rows</th><th>From</th><th>Last candle</th><th>Status</th></tr></thead>
        <tbody>${archiveStatus.updated.map((row) => `<tr><td>${escapeHtml(row.acronym || '-')}</td><td>${escapeHtml(String(row.rows || 0))}</td><td>${escapeHtml(String(row.totalRows || 0))}</td><td>${row.fromTs ? escapeHtml(formatDateShort(new Date(row.fromTs))) : '-'}</td><td>${row.lastTs ? escapeHtml(formatDateShort(new Date(row.lastTs))) : '-'}</td><td>${escapeHtml(row.error || (row.complete ? 'caught up' : 'backfilling'))}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      ${archiveStatus && archiveStatus.lastError ? `<div class="alert bad">${escapeHtml(archiveStatus.lastError)}</div>` : ''}
    </section>

    <section>
      <h2>Full Tornsy Stock Database Goal</h2>
      <div class="grid five">
        ${metric('Known stocks', archiveGoal.knownStocks)}
        ${metric('Current rows', formatNumber(archiveGoal.archivedRows))}
        ${metric('Goal start', formatDateShort(new Date(archiveGoal.goalStartTs)).slice(0, 10))}
        ${metric('Target rows', formatNumber(archiveGoal.totalGoalRows))}
        ${metric('Estimated full size', archiveGoal.totalGoalHuman)}
        ${metric('Current R2 archive', archiveGoal.archiveHuman)}
      </div>
      <div class="progress-block">
        <div class="progress-head"><strong>All available stock OHLC history</strong><span>${escapeHtml(formatPctValue(archiveGoal.progressPct))} of ${escapeHtml(formatNumber(archiveGoal.totalGoalRows))} rows (${escapeHtml(archiveGoal.totalGoalHuman)} est.)</span></div>
        ${progressBar(archiveGoal.progressPct)}
      </div>
      <div class="grid five">
        ${metric('Rows / run', formatNumber(archiveGoal.rowsPerRun))}
        ${metric('Requests / run', archiveGoal.requestsPerRun)}
        ${metric('Rows / hour', formatNumber(archiveGoal.rowsPerHour))}
        ${metric('Requests / hour', archiveGoal.requestsPerHour)}
        ${metric('Full rolling pass', archiveGoal.firstPassTime)}
      </div>
      <div class="grid three">
        ${metric('Windows / stock', archiveGoal.windowsPerStockForFullHistory)}
        ${metric('Remaining runs', formatNumber(archiveGoal.remainingRunsAtCurrentPace))}
        ${metric('Estimated remaining', archiveGoal.fullHistoryBackfillTime)}
      </div>
      <p class="muted">Goal: collect every available Tornsy stock candle from Stocks 3.0 onward. The dashboard uses ${formatDateShort(new Date(archiveGoal.goalStartTs)).slice(0, 10)} as the target start; Tornsy may begin a few days later for some stocks. Current collector pace: ${ARCHIVE_BATCH_SIZE} stock windows per scheduled run, ${ARCHIVE_LIMIT} hourly rows per stock window, never parallel.</p>
    </section>

    <section>
      <h2>Sync Activity</h2>
      <div class="grid five">
        ${metric('Uploads merged', activity.uploadCount)}
        ${metric('Raw today', activity.rawToday)}
        ${metric('Raw 24h', activity.rawLast24h)}
        ${metric('Raw 7d', activity.rawLast7d)}
        ${metric('Uploaders', activity.uniqueIdentityCount)}
      </div>
      <p class="muted">Recent identities: ${activity.identities.length ? escapeHtml(activity.identities.join(', ')) : '-'}</p>
      ${renderRecentUploads(recentUploads)}
    </section>

    <section>
      <h2>Model Status</h2>
      <div class="grid five">
        ${metric('Stocks', modelSummary.stockCount, modelSummary.onlyTst ? 'warn' : 'ok')}
        ${metric('Model age', modelSummary.age)}
        ${metric('Generated', modelSummary.generatedAt ? formatDateShort(new Date(modelSummary.generatedAt)) : '-')}
        ${metric('Uploads merged', modelSummary.uploadCount)}
        ${metric('Source', modelSummary.source || '-')}
      </div>
      ${modelSummary.rows.length ? renderModelRows(modelSummary.rows, true) : '<p class="muted">No model rows yet.</p>'}
    </section>

    <section>
      <h2>API / Endpoint Status</h2>
      <table>
        <thead><tr><th>Check</th><th>Status</th><th>Time</th><th>Detail</th></tr></thead>
        <tbody>${endpoints.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td><span class="pill ${row.ok ? 'ok' : 'bad'}">${row.ok ? 'ok' : 'fail'}</span></td><td>${escapeHtml(String(row.ms || 0))}ms</td><td>${escapeHtml(row.detail || '')}</td></tr>`).join('')}</tbody>
      </table>
    </section>

    <section>
      <h2>Admin Actions</h2>
      <div class="actions">
        <a class="button primary" href="${DASHBOARD_PREFIX}">Refresh dashboard</a>
        <a class="button" href="${DOWNLOAD_PATH}" target="_blank" rel="noreferrer">Open download page</a>
        <a class="button" href="${DASHBOARD_PREFIX}/health.json" target="_blank" rel="noreferrer">Download health JSON</a>
      </div>
      <div class="grid three action-grid">
        <form method="post" action="${DASHBOARD_PREFIX}/actions/run-archive">
          <strong>Run archive collector</strong>
          <p class="muted">Manual gentle run: archives the next ${ARCHIVE_BATCH_SIZE} Tornsy stock histories and rebuilds the model.</p>
          <input name="confirm" placeholder="type collect" required>
          <button class="primary" type="submit">Collect next batch</button>
        </form>
        <form method="post" action="${DASHBOARD_PREFIX}/actions/clear-smoke-test">
          <strong>Clear smoke-test data</strong>
          <p class="muted">Removes TST from the model and deletes raw smoke-test uploads.</p>
          <input name="confirm" placeholder="type clear" required>
          <button class="warn" type="submit">Clear smoke test</button>
        </form>
        <form method="post" action="${DASHBOARD_PREFIX}/actions/rebuild-model">
          <strong>Rebuild model from raw uploads</strong>
          <p class="muted">Writes a model backup first, then rebuilds from recent non-test raw packages.</p>
          <input name="confirm" placeholder="type rebuild" required>
          <button class="warn" type="submit">Rebuild model</button>
        </form>
        <form method="post" action="${DASHBOARD_PREFIX}/actions/purge-raw">
          <strong>Purge old raw uploads</strong>
          <p class="muted">Deletes raw upload objects older than the selected days.</p>
          <input name="days" type="number" min="1" max="3650" value="90">
          <input name="confirm" placeholder="type purge" required>
          <button class="danger" type="submit">Purge raw</button>
        </form>
      </div>
    </section>
    <footer>Made by FLUZ [4325064] - manual-assist only - Tornsy-backed model - no API keys or sync tokens rendered</footer>
  </main>
</body>
</html>`;
}

function baseStyles() {
  return `<style>
    :root { color-scheme: dark; --bg:#090a0c; --panel:#151719; --panel2:#0d0f11; --line:#2b3035; --text:#f0f2f4; --muted:#9aa3ad; --green:#72e3ad; --red:#ff7777; --gold:#d8c16b; --blue:#b7c2cf; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; background:#0d0f11; color:var(--text); font:12px/1.32 Arial, sans-serif; padding:10px; }
    .page { width:min(1040px, 100%); margin:0 auto; border:1px solid var(--line); background:linear-gradient(180deg, #171a1d, #121416); box-shadow:0 12px 38px rgba(0,0,0,.45); border-radius:5px; overflow:hidden; }
    .page.wide { width:min(1360px, 100%); }
    .page.narrow { width:min(460px, 100%); }
    .top { padding:10px 14px; border-bottom:1px solid var(--line); background:#15181b; display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .top-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
    h1 { margin:0; font-size:15px; line-height:1.15; }
    h2 { margin:0 0 7px; font-size:12px; }
    p { margin:6px 0; }
    section { padding:10px 14px; border-bottom:1px solid rgba(145,168,188,.14); }
    footer { padding:7px 14px; color:var(--muted); font-size:11px; }
    .muted { color:var(--muted); }
    .inline-note { margin:3px 0 5px; color:var(--muted); font-size:11px; }
    .tag, .pill { display:inline-flex; align-items:center; border-radius:3px; padding:3px 6px; font-weight:800; background:#1a2632; color:var(--text); line-height:1.1; }
    .ok { color:#07110d; background:var(--green); border-color:var(--green); }
    .bad { color:#ffd5d5; background:rgba(255,85,85,.12); border-color:rgba(255,85,85,.45); }
    .warn { color:#1a1300; background:var(--gold); border-color:var(--gold); }
    .plain { color:var(--text); }
    .alert { margin:8px 14px 0; border:1px solid; padding:7px 9px; border-radius:4px; }
    .grid { display:grid; gap:6px; margin-top:7px; }
    .grid.three { grid-template-columns:repeat(3, 1fr); }
    .grid.four { grid-template-columns:repeat(4, 1fr); }
    .grid.five { grid-template-columns:repeat(5, 1fr); }
    .metric { border:1px solid var(--line); background:var(--panel2); border-radius:4px; padding:6px 8px; min-width:0; min-height:42px; }
    .metric strong { display:block; font-size:13px; line-height:1.15; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .metric strong.warn { color:var(--gold); background:transparent; }
    .metric strong.bad { color:var(--red); background:transparent; }
    .metric span { display:block; font-size:9px; text-transform:uppercase; letter-spacing:.05em; margin-top:3px; }
    .token-form { display:grid; grid-template-columns:1fr auto auto; gap:6px; margin-top:8px; }
    .access-card { border:1px solid var(--line); background:#0b1118; border-radius:5px; padding:8px; margin-top:8px; }
    .login-form { display:grid; grid-template-columns:1fr; gap:7px; }
    .remember-row { display:flex; justify-content:space-between; gap:8px; align-items:center; margin-top:7px; flex-wrap:wrap; }
    .switch-check { display:inline-flex; gap:6px; align-items:center; color:var(--text); cursor:pointer; }
    .switch-check input { position:absolute; opacity:0; pointer-events:none; width:1px; height:1px; }
    .switch-check span { width:28px; height:15px; border-radius:999px; border:1px solid var(--line); background:#152130; position:relative; box-shadow:inset 0 0 0 1px rgba(0,0,0,.2); }
    .switch-check span::after { content:''; position:absolute; width:11px; height:11px; left:1px; top:1px; border-radius:50%; background:#7f94a8; transition:transform .15s ease, background .15s ease; }
    .switch-check input:checked + span { border-color:var(--green); background:rgba(114,227,173,.18); }
    .switch-check input:checked + span::after { transform:translateX(13px); background:var(--green); }
    .switch-check strong { font-size:11px; }
    input, select { width:100%; border:1px solid var(--line); background:#09111a; color:var(--text); padding:6px 8px; border-radius:3px; font-size:12px; }
    button, .button { border:1px solid var(--line); background:#1a2632; color:var(--text); padding:6px 9px; border-radius:3px; font-weight:800; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; font-size:12px; line-height:1.15; }
    button.primary, .button.primary { background:var(--green); color:#06110c; border-color:var(--green); }
    button.danger { color:#ffd5d5; background:rgba(255,85,85,.22); border-color:rgba(255,85,85,.55); }
    .mini { padding:4px 6px; font-size:11px; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0 8px; }
    .action-grid form { border:1px solid var(--line); background:#0b1118; border-radius:4px; padding:8px; display:grid; gap:6px; }
    .action-grid p { margin:2px 0; }
    .progress-block { margin-top:8px; border:1px solid var(--line); background:#0b1118; border-radius:4px; padding:7px 8px; }
    .progress-head { display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:5px; font-size:11px; }
    .progress-head span { color:var(--muted); text-align:right; }
    .progress { height:8px; border:1px solid var(--line); background:#070b0f; border-radius:999px; overflow:hidden; }
    .progress span { display:block; height:100%; min-width:2px; background:linear-gradient(90deg, var(--green), var(--gold)); box-shadow:0 0 12px rgba(114,227,173,.25); }
    table { width:100%; border-collapse:collapse; margin-top:7px; font-size:11px; }
    th, td { border-bottom:1px solid rgba(145,168,188,.14); padding:5px 7px; text-align:left; vertical-align:top; }
    th { color:var(--muted); text-transform:uppercase; font-size:9px; letter-spacing:.04em; }
    @media (max-width: 880px) { body { padding:6px; } .grid.three, .grid.four, .grid.five, .token-form { grid-template-columns:1fr; } .top { display:block; } .top-actions { justify-content:flex-start; margin-top:7px; } }
  </style>`;
}

function metric(label, value, tone = 'plain') {
  return `<div class="metric"><strong class="${tone}">${escapeHtml(String(value == null ? '-' : value))}</strong><span class="muted">${escapeHtml(label)}</span></div>`;
}

function progressBar(percent) {
  const value = clamp(Number(percent || 0), 0, 100);
  return `<div class="progress"><span style="width:${escapeHtml(String(value))}%"></span></div>`;
}

function renderModelRows(rows, detailed) {
  return `<table>
    <thead><tr><th>Stock</th><th>Confidence</th><th>Expected</th><th>Samples</th><th>Hit rate</th><th>1h</th><th>6h</th><th>24h</th><th>Volatility</th>${detailed ? '<th>Last</th>' : ''}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td>${escapeHtml(row.acronym || '')}</td>
        <td>${escapeHtml(String(Math.round(Number(row.confidence || 0))))}%</td>
        <td>${escapeHtml(formatPctPlain(row.expectedMovePct))}</td>
        <td>${escapeHtml(String(Math.round(Number(row.samples || 0))))}</td>
        <td>${row.hitRate == null ? '-' : `${escapeHtml(String(Number(row.hitRate).toFixed ? Number(row.hitRate).toFixed(1) : row.hitRate))}%`}</td>
        <td>${escapeHtml(formatPctPlain(row.change1h))}</td>
        <td>${escapeHtml(formatPctPlain(row.change6h))}</td>
        <td>${escapeHtml(formatPctPlain(row.change24h))}</td>
        <td>${escapeHtml(formatPctPlain(row.volatility))}</td>
        ${detailed ? `<td>${row.lastTs ? escapeHtml(formatDateShort(new Date(row.lastTs))) : '-'}</td>` : ''}
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderRecentUploads(rows) {
  if (!rows.length) return '<p class="muted">No recent raw uploads found.</p>';
  return `<table>
    <thead><tr><th>Timestamp</th><th>Source</th><th>Version</th><th>XID / Name</th><th>Ticks</th><th>Signals</th><th>Local stocks</th><th>Size</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${escapeHtml(row.uploaded ? formatDateShort(new Date(row.uploaded)) : '-')}</td>
      <td>${escapeHtml(row.source || '-')}</td>
      <td>${escapeHtml(row.version || '-')}</td>
      <td>${escapeHtml([row.xid, row.name].filter(Boolean).join(' / ') || '-')}</td>
      <td>${escapeHtml(String(row.tickCount))}</td>
      <td>${escapeHtml(String(row.signalCount))}</td>
      <td>${escapeHtml(String(row.localStockCount))}</td>
      <td>${escapeHtml(row.sizeHuman)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateShort(date) {
  if (!date || Number.isNaN(date.getTime())) return '-';
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

function formatPctPlain(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function formatPctValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0%';
  if (number > 0 && number < 0.1) return `${number.toFixed(3)}%`;
  return `${number.toFixed(1)}%`;
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '-';
  return Math.round(number).toLocaleString('en-US');
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let scaled = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && scaled >= 1024; index += 1) {
    scaled /= 1024;
    unit = units[index];
  }
  return `${scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)} ${unit}`;
}

function formatAge(ms) {
  const seconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatDuration(ms) {
  const minutes = Math.max(0, Math.round(Number(ms || 0) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 90) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}

function estimateTimeToLimit(currentBytes, dailyGrowthBytes, limitBytes) {
  if (!dailyGrowthBytes) return 'needs more history';
  const remaining = limitBytes - currentBytes;
  if (remaining <= 0) return 'already over';
  const days = Math.ceil(remaining / dailyGrowthBytes);
  if (days < 2) return `${days} day`;
  if (days < 60) return `${days} days`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

function summarizeObject(object) {
  return {
    key: object.key,
    size: object.size,
    sizeHuman: formatBytes(object.size),
    uploaded: object.uploaded || ''
  };
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function numberOrNow(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Date.now();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
