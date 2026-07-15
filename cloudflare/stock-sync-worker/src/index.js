const API_PREFIX = '/api/stock-sync/v1';
const DASHBOARD_PREFIX = '/stock-sync/dashboard';
const DOWNLOAD_PATH = '/stock-sync/download';
const MODEL_FILE_NAME = 'model/latest.json';
const RAW_PREFIX = 'raw/';
const BACKUP_PREFIX = 'backup/';
const DASHBOARD_SESSION_COOKIE = 'tornz_dashboard_session';
const DASHBOARD_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_REBUILD_UPLOADS = 1500;

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
      return corsResponse({ ok: false, error: 'Unsupported endpoint' }, 404);
    } catch (error) {
      const status = error && error.status ? error.status : 500;
      return corsResponse({ ok: false, error: error && error.message ? error.message : 'Worker error' }, status);
    }
  }
};

async function handleUpload(request, env) {
  const body = await request.json().catch(() => ({}));
  validateToken(body.token, env);
  if (!body.payload || typeof body.payload !== 'object') throw httpError(400, 'Missing sync payload.');
  assertNoApiKeys(body.payload);

  const payload = normalizePayload(body.payload);
  const rawName = rawFileName(payload);
  const rawResult = await r2PutJson(env, rawName, payload);

  const previous = await r2ReadJson(env, MODEL_FILE_NAME).catch(() => null);
  const model = mergeModel(previous, payload);
  const modelResult = await r2PutJson(env, MODEL_FILE_NAME, model);

  return corsResponse({
    ok: true,
    uploaded: rawResult,
    model: {
      key: modelResult.key,
      generatedAt: model.generatedAt,
      stockCount: Object.keys(model.stocks || {}).length,
      uploadCount: model.uploadCount
    }
  });
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
      return dashboardJsonResponse({ ok: true, health: data.health, storage: data.storage, activity: data.activity, model: data.modelSummary });
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
  let model = await readLatestModel(env).catch((error) => {
    health.lastError = error.message || 'Model read failed';
    return null;
  });

  try {
    objects = await listAllR2Objects(env);
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

  const rawObjects = objects.filter((object) => object.key.startsWith(RAW_PREFIX));
  const recentUploads = await readRecentRawUploads(env, rawObjects, 20);
  const storage = buildStorageSummary(objects, rawObjects);
  const activity = buildActivitySummary(model, rawObjects, recentUploads);
  const modelSummary = buildModelSummary(model);
  const endpoints = await buildEndpointStatus(env, health, started);

  return {
    generatedAt: Date.now(),
    health,
    storage,
    activity,
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
    await readLatestModel(env);
    checks.push({ name: 'R2 model read', ok: true, ms: Date.now() - modelStart, detail: 'model/latest.json readable' });
  } catch (error) {
    checks.push({ name: 'R2 model read', ok: false, ms: Date.now() - modelStart, detail: error.message || 'failed' });
  }
  checks.push({ name: 'dashboard auth', ok: isDashboardConfigured(env), ms: 0, detail: isDashboardConfigured(env) ? 'admin session enabled' : 'missing dashboard secrets' });
  checks.push({ name: '/stock-sync/download', ok: true, ms: 0, detail: 'page route active' });
  checks.push({ name: 'R2 list', ok: health.r2Connected, ms: 0, detail: health.r2Connected ? 'bucket list reachable' : 'bucket list failed' });
  return checks;
}

function buildStorageSummary(objects, rawObjects) {
  const now = Date.now();
  const totalBytes = objects.reduce((sum, object) => sum + Number(object.size || 0), 0);
  const rawBytes = rawObjects.reduce((sum, object) => sum + Number(object.size || 0), 0);
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

async function readLatestModel(env) {
  return r2ReadJson(env, MODEL_FILE_NAME).catch(() => ({
    schema: 1,
    source: 'r2-worker',
    generatedAt: Date.now(),
    uploadCount: 0,
    stocks: {}
  }));
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
  <title>TORN'z Stock Sync Download</title>
  ${baseStyles()}
</head>
<body>
  <main class="page">
    <header class="top">
      <div>
        <h1>TORN'z Stock Sync Download</h1>
        <div class="muted">Private shared stock intelligence model for TORN'z Tools.</div>
      </div>
      <div class="tag ${configured ? 'ok' : 'bad'}">${configured ? 'configured' : 'not configured'}</div>
    </header>
    <section>
      ${error ? `<div class="alert bad">${escapeHtml(error)}</div>` : ''}
      <strong>Private access</strong>
      <p class="muted">Enter your TORN'z sync token to inspect or download the latest shared model. The model contains aggregated stock movement statistics, confidence, volatility, and expected move data. It does not contain Torn API keys.</p>
      <form class="token-form" method="post" id="download-form">
        <input id="sync-token" name="token" type="password" autocomplete="off" placeholder="TORN'z sync token" required>
        <button class="primary" type="submit">Show model</button>
        <button type="submit" name="format" value="json">Download JSON</button>
      </form>
      <label class="check-row"><input id="remember-token" type="checkbox"> Remember this token on this computer</label>
      <div class="inline-note">Only use this on your own computer. The token is stored in this browser only, never server-side and never in the URL.</div>
      <button type="button" class="mini" id="forget-token">Forget remembered token</button>
    </section>
    <section>
      <strong>model/latest.json</strong>
      <div class="grid four">
        <div class="metric"><strong>${escapeHtml(String(Object.keys(stocks).length))}</strong><span class="muted">Stocks</span></div>
        <div class="metric"><strong>${escapeHtml(String(model && model.uploadCount || 0))}</strong><span class="muted">Uploads merged</span></div>
        <div class="metric"><strong>${generated ? escapeHtml(formatDateShort(generated)) : '-'}</strong><span class="muted">Generated</span></div>
        <div class="metric"><strong>${model && model.source ? escapeHtml(model.source) : '-'}</strong><span class="muted">Source</span></div>
      </div>
      ${stockRows.length ? renderModelRows(stockRows, false) : '<p class="muted">No model loaded yet. Sync from the extension first, then refresh this page with your token.</p>'}
    </section>
    <footer>Made by FLUZ [4325064] - manual-assist only - Cloudflare R2 storage - no API keys in model uploads</footer>
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
  <title>TORN'z Stock Sync Dashboard Login</title>
  ${baseStyles()}
</head>
<body>
  <main class="page narrow">
    <header class="top">
      <div>
        <h1>TORN'z Stock Sync Dashboard</h1>
        <div class="muted">Private control panel for the R2 stock intelligence backend.</div>
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
  const { health, storage, activity, modelSummary, recentUploads, endpoints } = data;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TORN'z Stock Sync Dashboard</title>
  ${baseStyles()}
</head>
<body>
  <main class="page wide">
    <header class="top">
      <div>
        <h1>TORN'z Stock Sync Dashboard</h1>
        <div class="muted">R2 health, model status, sync activity, and storage projections.</div>
      </div>
      <div class="top-actions">
        <span class="tag ${health.r2Connected && health.modelJsonValid ? 'ok' : 'warn'}">${health.r2Connected && health.modelJsonValid ? 'healthy' : 'check'}</span>
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
        ${metric('Models', storage.modelObjects)}
        ${metric('Backups', storage.backupObjects)}
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
        <a class="button" href="${DOWNLOAD_PATH}" target="_blank" rel="noreferrer">Download latest model JSON</a>
        <a class="button" href="${DASHBOARD_PREFIX}/health.json" target="_blank" rel="noreferrer">Download health JSON</a>
      </div>
      <div class="grid three action-grid">
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
    <footer>Made by FLUZ [4325064] - manual-assist only - Cloudflare R2 storage - no API keys or sync tokens rendered</footer>
  </main>
</body>
</html>`;
}

function baseStyles() {
  return `<style>
    :root { color-scheme: dark; --bg:#080b0f; --panel:#101720; --panel2:#0b1118; --line:#2b3a48; --text:#e8f4ff; --muted:#91a8bc; --green:#62e6a4; --red:#ff6b6b; --gold:#ffd166; --blue:#86c6ff; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; background:radial-gradient(circle at 20% 0%, rgba(98,230,164,.08), transparent 32%), var(--bg); color:var(--text); font:14px/1.45 Arial, sans-serif; padding:28px; }
    .page { width:min(980px, 100%); margin:0 auto; border:1px solid var(--line); background:linear-gradient(180deg, #13202b, var(--panel)); box-shadow:0 24px 80px rgba(0,0,0,.55); border-radius:8px; overflow:hidden; }
    .page.wide { width:min(1240px, 100%); }
    .page.narrow { width:min(560px, 100%); }
    .top { padding:18px 22px; border-bottom:1px solid var(--line); background:#111b25; display:flex; justify-content:space-between; gap:16px; align-items:center; }
    .top-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
    h1 { margin:0; font-size:18px; }
    h2 { margin:0 0 12px; font-size:14px; }
    section { padding:18px 22px; border-bottom:1px solid rgba(145,168,188,.16); }
    footer { padding:12px 22px; color:var(--muted); font-size:12px; }
    .muted { color:var(--muted); }
    .inline-note { margin:4px 0 8px; color:var(--muted); font-size:12px; }
    .tag, .pill { display:inline-flex; align-items:center; border-radius:4px; padding:4px 8px; font-weight:800; background:#1a2632; color:var(--text); }
    .ok { color:#07110d; background:var(--green); border-color:var(--green); }
    .bad { color:#ffd5d5; background:rgba(255,85,85,.12); border-color:rgba(255,85,85,.45); }
    .warn { color:#1a1300; background:var(--gold); border-color:var(--gold); }
    .plain { color:var(--text); }
    .alert { margin:14px 22px 0; border:1px solid; padding:10px; border-radius:5px; }
    .grid { display:grid; gap:10px; margin-top:12px; }
    .grid.three { grid-template-columns:repeat(3, 1fr); }
    .grid.four { grid-template-columns:repeat(4, 1fr); }
    .grid.five { grid-template-columns:repeat(5, 1fr); }
    .metric { border:1px solid var(--line); background:var(--panel2); border-radius:5px; padding:10px; min-width:0; }
    .metric strong { display:block; font-size:17px; color:var(--green); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .metric strong.warn { color:var(--gold); background:transparent; }
    .metric strong.bad { color:var(--red); background:transparent; }
    .metric span { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    .token-form { display:grid; grid-template-columns:1fr auto auto; gap:8px; margin-top:12px; }
    .login-form { display:grid; grid-template-columns:1fr; gap:10px; }
    .check-row { display:flex; gap:8px; align-items:center; margin-top:10px; color:var(--text); }
    input, select { width:100%; border:1px solid var(--line); background:#09111a; color:var(--text); padding:10px; border-radius:4px; }
    button, .button { border:1px solid var(--line); background:#1a2632; color:var(--text); padding:10px 13px; border-radius:4px; font-weight:800; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
    button.primary, .button.primary { background:var(--green); color:#06110c; border-color:var(--green); }
    button.danger { color:#ffd5d5; background:rgba(255,85,85,.22); border-color:rgba(255,85,85,.55); }
    .mini { padding:6px 8px; font-size:12px; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 12px; }
    .action-grid form { border:1px solid var(--line); background:#0b1118; border-radius:5px; padding:12px; display:grid; gap:8px; }
    table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
    th, td { border-bottom:1px solid rgba(145,168,188,.16); padding:8px; text-align:left; vertical-align:top; }
    th { color:var(--muted); text-transform:uppercase; font-size:10px; letter-spacing:.04em; }
    @media (max-width: 880px) { .grid.three, .grid.four, .grid.five, .token-form { grid-template-columns:1fr; } .top { display:block; } .top-actions { justify-content:flex-start; margin-top:10px; } }
  </style>`;
}

function metric(label, value, tone = 'plain') {
  return `<div class="metric"><strong class="${tone}">${escapeHtml(String(value == null ? '-' : value))}</strong><span class="muted">${escapeHtml(label)}</span></div>`;
}

function renderModelRows(rows, detailed) {
  return `<table>
    <thead><tr><th>Stock</th><th>Confidence</th><th>Expected</th><th>Samples</th><th>1h</th><th>6h</th><th>24h</th><th>Volatility</th>${detailed ? '<th>Last</th>' : ''}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td>${escapeHtml(row.acronym || '')}</td>
        <td>${escapeHtml(String(Math.round(Number(row.confidence || 0))))}%</td>
        <td>${escapeHtml(formatPctPlain(row.expectedMovePct))}</td>
        <td>${escapeHtml(String(Math.round(Number(row.samples || 0))))}</td>
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
