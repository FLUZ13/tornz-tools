const API_PREFIX = '/api/stock-sync/v1';
const MODEL_FILE_NAME = 'model_latest.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return corsResponse(null, 204);
    if (url.pathname === '/stock-sync/download') return handleDownloadPage(request, env);
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
  const token = await googleAccessToken(env);
  const rawName = rawFileName(payload);
  const rawResult = await driveUploadJson(env, token, rawName, payload);

  const previous = await driveReadNamedJson(env, token, MODEL_FILE_NAME).catch(() => null);
  const model = mergeModel(previous, payload);
  const modelResult = await driveUpsertNamedJson(env, token, MODEL_FILE_NAME, model);

  return corsResponse({
    ok: true,
    uploaded: rawResult,
    model: {
      fileId: modelResult.id,
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
  const accessToken = await googleAccessToken(env);
  const model = await driveReadNamedJson(env, accessToken, MODEL_FILE_NAME).catch(() => ({
    schema: 1,
    source: 'drive-worker',
    generatedAt: Date.now(),
    uploadCount: 0,
    stocks: {}
  }));
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

async function readLatestModel(env) {
  const accessToken = await googleAccessToken(env);
  return driveReadNamedJson(env, accessToken, MODEL_FILE_NAME).catch(() => ({
    schema: 1,
    source: 'drive-worker',
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

function wantsJson(request) {
  const accept = String(request.headers.get('Accept') || '').toLowerCase();
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  return accept.includes('application/json') || contentType.includes('application/json');
}

function isConfigured(env) {
  return !!(env.GOOGLE_SERVICE_ACCOUNT_JSON && env.GOOGLE_DRIVE_FOLDER_ID && env.TORNZ_SYNC_TOKENS);
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
  return `raw_${day}_${hour}_${xid}_${date.getTime()}.json`;
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
    source: 'drive-worker',
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

async function googleAccessToken(env) {
  const account = parseGoogleServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!account.client_email || !account.private_key) {
    throw httpError(500, 'GOOGLE_SERVICE_ACCOUNT_JSON is incomplete. It must be the full Google service account JSON key with client_email and private_key.');
  }
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({
    alg: 'RS256',
    typ: 'JWT'
  }, {
    iss: account.client_email,
    scope: DRIVE_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }, account.private_key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) throw httpError(500, json.error_description || 'Google token request failed.');
  return json.access_token;
}

function parseGoogleServiceAccount(raw) {
  const text = String(raw || '').trim();
  if (!text) throw httpError(500, 'GOOGLE_SERVICE_ACCOUNT_JSON is missing. Add the full Google service account JSON key as a Cloudflare Worker secret.');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw httpError(500, `GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Re-add the secret and paste the full service account JSON file contents. Parser said: ${error.message}`);
  }
}

async function signJwt(header, payload, privateKeyPem) {
  const unsigned = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64urlBytes(new Uint8Array(signature))}`;
}

async function importPrivateKey(pem) {
  const normalized = String(pem).replace(/\\n/g, '\n');
  const base64 = normalized.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, '');
  const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function driveUploadJson(env, accessToken, name, object) {
  const metadata = { name, parents: [env.GOOGLE_DRIVE_FOLDER_ID] };
  const boundary = `tornz_${crypto.randomUUID()}`;
  const body = multipartBody(boundary, metadata, object);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
  const json = await response.json();
  if (!response.ok) throw httpError(500, json.error && json.error.message || 'Drive upload failed.');
  return json;
}

async function driveUpsertNamedJson(env, accessToken, name, object) {
  const existing = await driveFindNamedFile(env, accessToken, name);
  if (!existing) return driveUploadJson(env, accessToken, name, object);
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media&fields=id,name,modifiedTime`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(object)
  });
  const json = await response.json();
  if (!response.ok) throw httpError(500, json.error && json.error.message || 'Drive model update failed.');
  return json;
}

async function driveReadNamedJson(env, accessToken, name) {
  const file = await driveFindNamedFile(env, accessToken, name);
  if (!file) throw httpError(404, 'No shared model exists yet.');
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = await response.json();
  if (!response.ok) throw httpError(500, json.error && json.error.message || 'Drive model download failed.');
  return json;
}

async function driveFindNamedFile(env, accessToken, name) {
  const escapedName = String(name).replace(/'/g, "\\'");
  const escapedFolder = String(env.GOOGLE_DRIVE_FOLDER_ID).replace(/'/g, "\\'");
  const query = `'${escapedFolder}' in parents and name='${escapedName}' and trashed=false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = await response.json();
  if (!response.ok) throw httpError(500, json.error && json.error.message || 'Drive file lookup failed.');
  return json.files && json.files[0] ? json.files[0] : null;
}

function multipartBody(boundary, metadata, object) {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(object),
    `--${boundary}--`,
    ''
  ].join('\r\n');
}

function base64urlJson(value) {
  return base64urlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64urlBytes(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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
  <style>
    :root { color-scheme: dark; --bg:#080b0f; --panel:#101720; --line:#2b3a48; --text:#e8f4ff; --muted:#91a8bc; --green:#62e6a4; --red:#ff6b6b; --gold:#ffd166; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; background:radial-gradient(circle at 20% 0%, rgba(98,230,164,.08), transparent 32%), var(--bg); color:var(--text); font:14px/1.45 Arial, sans-serif; display:flex; align-items:center; justify-content:center; padding:28px; }
    main { width:min(900px, 100%); border:1px solid var(--line); background:linear-gradient(180deg, #13202b, var(--panel)); box-shadow:0 24px 80px rgba(0,0,0,.55); border-radius:8px; overflow:hidden; }
    header { padding:18px 22px; border-bottom:1px solid var(--line); background:#111b25; display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:18px; }
    .tag { color:#07110d; background:var(--green); border-radius:4px; padding:4px 8px; font-weight:800; }
    section { padding:18px 22px; border-bottom:1px solid rgba(145,168,188,.16); }
    .muted { color:var(--muted); }
    .error { color:#ffd5d5; background:rgba(255,85,85,.12); border:1px solid rgba(255,85,85,.45); padding:10px; border-radius:5px; margin-bottom:14px; }
    .grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-top:12px; }
    .metric { border:1px solid var(--line); background:#0b1118; border-radius:5px; padding:10px; }
    .metric strong { display:block; font-size:18px; color:var(--green); }
    form { display:grid; grid-template-columns:1fr auto auto; gap:8px; margin-top:12px; }
    input { width:100%; border:1px solid var(--line); background:#09111a; color:var(--text); padding:10px; border-radius:4px; }
    button { border:1px solid var(--line); background:#1a2632; color:var(--text); padding:10px 13px; border-radius:4px; font-weight:800; cursor:pointer; }
    button.primary { background:var(--green); color:#06110c; border-color:var(--green); }
    table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
    th, td { border-bottom:1px solid rgba(145,168,188,.16); padding:8px; text-align:left; }
    th { color:var(--muted); text-transform:uppercase; font-size:10px; letter-spacing:.04em; }
    footer { padding:12px 22px; color:var(--muted); font-size:12px; }
    @media (max-width: 720px) { .grid, form { grid-template-columns:1fr; } header { display:block; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>TORN'z Stock Sync Download</h1>
        <div class="muted">Private shared stock intelligence model for TORN'z Tools.</div>
      </div>
      <div class="tag">${configured ? 'configured' : 'not configured'}</div>
    </header>
    <section>
      ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
      <strong>Private access</strong>
      <p class="muted">Enter your TORN'z sync token to inspect or download the latest shared model. The model contains aggregated stock movement statistics, confidence, volatility, and expected move data. It does not contain Torn API keys.</p>
      <form method="post">
        <input name="token" type="password" autocomplete="off" placeholder="TORN'z sync token" required>
        <button class="primary" type="submit">Show model</button>
        <button type="submit" name="format" value="json">Download JSON</button>
      </form>
    </section>
    <section>
      <strong>model_latest.json</strong>
      <div class="grid">
        <div class="metric"><strong>${escapeHtml(String(Object.keys(stocks).length))}</strong><span class="muted">Stocks</span></div>
        <div class="metric"><strong>${escapeHtml(String(model && model.uploadCount || 0))}</strong><span class="muted">Uploads merged</span></div>
        <div class="metric"><strong>${generated ? escapeHtml(formatDateShort(generated)) : '-'}</strong><span class="muted">Generated</span></div>
        <div class="metric"><strong>${model && model.source ? escapeHtml(model.source) : '-'}</strong><span class="muted">Source</span></div>
      </div>
      ${stockRows.length ? `
        <table>
          <thead><tr><th>Stock</th><th>Confidence</th><th>Expected</th><th>Samples</th><th>Volatility</th></tr></thead>
          <tbody>
            ${stockRows.map((row) => `<tr><td>${escapeHtml(row.acronym || '')}</td><td>${escapeHtml(String(Math.round(Number(row.confidence || 0))))}%</td><td>${escapeHtml(formatPctPlain(row.expectedMovePct))}</td><td>${escapeHtml(String(Math.round(Number(row.samples || 0))))}</td><td>${escapeHtml(formatPctPlain(row.volatility))}</td></tr>`).join('')}
          </tbody>
        </table>` : '<p class="muted">No model loaded yet. Sync from the extension first, then refresh this page with your token.</p>'}
    </section>
    <footer>Made by FLUZ [4325064] - manual-assist only - no API keys in model uploads</footer>
  </main>
</body>
</html>`;
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
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

function formatPctPlain(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
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
