# TORN'z Stock Sync Worker

Private Cloudflare Worker gateway for optional TORN'z Stock Intelligence cloud sync.

The extension sends token-protected stock intelligence packages to this Worker, and the Worker writes JSON files into a private Cloudflare R2 bucket. API keys are rejected and never stored.

## Endpoints

- `POST /api/stock-sync/v1/upload`
- `GET /api/stock-sync/v1/model/latest`
- `POST /api/stock-sync/v1/model/latest`
- `GET /api/stock-sync/v1/status`
- `GET /stock-sync/download`
- `POST /stock-sync/download`

The extension uploads to `/api/stock-sync/v1/upload`, then downloads the shared model from `/stock-sync/download`. Browser users can open `/stock-sync/download` to inspect model stats and download `model/latest.json` after entering a valid private sync token.

## Required Secrets

Configure the R2 bucket binding in `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  {
    "binding": "STOCK_SYNC_BUCKET",
    "bucket_name": "tornz-stock-sync"
  }
]
```

Set the private sync tokens with Wrangler:

```powershell
wrangler secret put TORNZ_SYNC_TOKENS
```

`TORNZ_SYNC_TOKENS` can be a comma-separated list or a JSON array of private tokens.

Recommended first private token:

```text
tornz_8JxP9mK2sV7qL4nR6wZ1_private
```

Do not commit real tokens into the public extension source. Store them only as Cloudflare secrets and in your local extension settings.

## R2 Setup

Create the private R2 bucket once:

```powershell
npx wrangler r2 bucket create tornz-stock-sync
```

No Torn API key is accepted in synced payloads. The Worker rejects payloads that appear to include API keys.

## Deploy

After secrets are set:

```powershell
npx wrangler deploy
```

The included route config maps:

- `https://hq.tornz-tools.org/api/stock-sync/v1*`
- `https://hq.tornz-tools.org/stock-sync/download*`
