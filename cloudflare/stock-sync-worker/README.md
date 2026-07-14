# TORN'z Stock Sync Worker

Private Cloudflare Worker gateway for optional TORN'z Stock Intelligence Drive backup.

The extension never receives Google credentials. It sends token-protected stock intelligence packages to this Worker, and the Worker writes JSON files into a private Google Drive folder shared with a Google service account.

## Endpoints

- `POST /api/stock-sync/v1/upload`
- `GET /api/stock-sync/v1/model/latest`
- `POST /api/stock-sync/v1/model/latest`
- `GET /api/stock-sync/v1/status`
- `GET /stock-sync/download`
- `POST /stock-sync/download`

The extension uploads to `/api/stock-sync/v1/upload`, then downloads the shared model from `/stock-sync/download`. Browser users can open `/stock-sync/download` to inspect model stats and download `model_latest.json` after entering a valid private sync token.

## Required Secrets

Set these with Wrangler:

```powershell
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret put GOOGLE_DRIVE_FOLDER_ID
wrangler secret put TORNZ_SYNC_TOKENS
```

`TORNZ_SYNC_TOKENS` can be a comma-separated list or a JSON array of private tokens.

Recommended first private token:

```text
tornz_8JxP9mK2sV7qL4nR6wZ1_private
```

Do not commit real tokens into the public extension source. Store them only as Cloudflare secrets and in your local extension settings.

## Google Drive Setup

1. Create a private Google Drive folder.
2. Create a Google Cloud service account and enable the Google Drive API.
3. Share the private Drive folder with the service account email as Editor.
4. Store the full service account JSON only as `GOOGLE_SERVICE_ACCOUNT_JSON`.
5. Store the Drive folder ID as `GOOGLE_DRIVE_FOLDER_ID`.

No Torn API key is accepted in synced payloads. The Worker rejects payloads that appear to include API keys.

## Deploy

After secrets are set:

```powershell
npx wrangler deploy
```

The included route config maps:

- `https://hq.tornz-tools.org/api/stock-sync/v1*`
- `https://hq.tornz-tools.org/stock-sync/download*`
