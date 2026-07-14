# TORN'z Stock Sync Worker

Private Cloudflare Worker gateway for optional TORN'z Stock Intelligence Drive backup.

The extension never receives Google credentials. It sends token-protected stock intelligence packages to this Worker, and the Worker writes JSON files into a private Google Drive folder shared with a Google service account.

## Endpoints

- `POST /api/stock-sync/v1/upload`
- `GET /api/stock-sync/v1/model/latest`
- `POST /api/stock-sync/v1/model/latest`
- `GET /api/stock-sync/v1/status`

## Required Secrets

Set these with Wrangler:

```powershell
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret put GOOGLE_DRIVE_FOLDER_ID
wrangler secret put TORNZ_SYNC_TOKENS
```

`TORNZ_SYNC_TOKENS` can be a comma-separated list or a JSON array of private tokens.

## Google Drive Setup

1. Create a private Google Drive folder.
2. Create a Google Cloud service account and enable the Google Drive API.
3. Share the private Drive folder with the service account email as Editor.
4. Store the full service account JSON only as `GOOGLE_SERVICE_ACCOUNT_JSON`.
5. Store the Drive folder ID as `GOOGLE_DRIVE_FOLDER_ID`.

No Torn API key is accepted in synced payloads. The Worker rejects payloads that appear to include API keys.
