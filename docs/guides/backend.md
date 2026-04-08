# How to: Backend (`apps/backend`)

This guide explains how to run, configure, and use the **Archive Helper backend**: the TypeScript unlink engine and optional **Express** HTTP API.

## What you get

- **Services:** inbound link counting (`InboundReferenceService`), full unlink flow (`RemoveIncomingLinksService`).
- **App Action mapping:** `removeIncomingLinksAppAction` — same logic as Automations should return (`AppActionRemoveLinksOutput`).
- **HTTP:** health check, count, full unlink, and App Action–shaped invoke endpoint.

Shared types live in `@archive-helper/shared-types`; recursive field logic in `@archive-helper/utils`.

---

## 1. Prerequisites

- **Node.js** 18.18+
- From repo root: `npm install` (workspaces link `@archive-helper/shared-types` and `@archive-helper/utils`).
- A **Contentful Management API token** with permission to read/update entries in your space.

---

## 2. One-time setup

From the monorepo root:

```bash
cd contentful-archive-helper
npm install
npm run build -w @archive-helper/shared-types
npm run build -w @archive-helper/utils
npm run build -w @archive-helper/backend
```

Or build everything:

```bash
npm run build
```

---

## 3. Environment variables

1. Copy the example file:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

2. Edit `apps/backend/.env`:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `CONTENTFUL_MANAGEMENT_TOKEN` | **Yes** | CMA personal access token or integration token (never commit this file). |
   | `PORT` | No | HTTP port (default `3000`). |

---

## 4. Run in development

Uses **tsx** so you do not need to rebuild after every change:

```bash
# From repo root
npm run dev -w @archive-helper/backend
```

Or from `apps/backend`:

```bash
cd apps/backend
npm run dev
```

You should see a JSON log line like `http.listening` with your port. If the token is missing, the process exits immediately.

---

## 5. Run in production

Build then start with Node:

```bash
npm run build -w @archive-helper/backend
npm run start -w @archive-helper/backend
```

This runs `node dist/server.js` (loads `dotenv` from `apps/backend` working directory — run from `apps/backend` or ensure `.env` is discoverable).

---

## 6. HTTP API quick reference

Base URL: `http://localhost:<PORT>` (or your deployed host).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness: `{ "ok": true }` |
| `GET` | `/linked-entry-count` | Query: `spaceId`, `environmentId`, `entryId`, optional `previewSize` |
| `POST` | `/remove-incoming-links` | Full unlink; JSON body = `RemoveIncomingLinksInput`; response includes `targetEntryId` |
| `POST` | `/app-actions/remove-incoming-links` | Same as App Action contract; body = `InvokeRemoveLinksBody`; response = `AppActionRemoveLinksOutput` |

### Example: health

```bash
curl -s http://localhost:3000/health
```

### Example: inbound count

```bash
curl -s "http://localhost:3000/linked-entry-count?spaceId=YOUR_SPACE&environmentId=master&entryId=ENTRY_ID"
```

### Example: dry-run unlink (full result)

```bash
curl -s -X POST http://localhost:3000/remove-incoming-links \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "YOUR_SPACE",
    "environmentId": "master",
    "targetEntryId": "TARGET_ENTRY",
    "dryRun": true
  }'
```

### Example: App Action–shaped invoke (for custom executors / proxies)

```bash
curl -s -X POST http://localhost:3000/app-actions/remove-incoming-links \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "YOUR_SPACE",
    "environmentId": "master",
    "targetEntryId": "TARGET_ENTRY",
    "dryRun": false,
    "publishStrategy": "republish-if-published"
  }'
```

**Security:** If this server is on the public internet, add authentication in front of these routes; the sample app does not enforce auth.

---

## 7. Use as a library (no HTTP)

From another Node package in the monorepo or after building:

```typescript
import { createAppServices, removeIncomingLinksAppAction } from "@archive-helper/backend";

const services = createAppServices({
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!,
});

// Full service result (includes targetEntryId)
const full = await services.unlink.removeIncomingLinks({
  spaceId,
  environmentId,
  targetEntryId,
  dryRun: true,
});

// App Action response shape (for Functions / webhooks)
const actionOut = await removeIncomingLinksAppAction(
  { spaceId, environmentId },
  { targetEntryId, dryRun: false, publishStrategy: "republish-if-published" },
  services.unlink,
);
```

See `apps/backend/src/action-entry.ts` for a minimal serverless-style entry idea.

---

## 8. Tests

```bash
npm run test -w @archive-helper/backend
```

---

## 9. Netlify / static hosts

- **Do not** point Netlify **Functions** at `apps/backend/dist`. Use **`netlify/functions`** (see repo root `netlify.toml`). The backend `dist/` is for Node/Express or App Action executors elsewhere, not one-function-per-file on Netlify.
- **Declarations:** TypeScript emits **`.d.ts`** to **`apps/backend/dist-types/`**, not next to `.js` in `dist/`, so folders that only package `dist` as functions do not pick up invalid function names from declaration files.

## 10. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Server exits on start | `CONTENTFUL_MANAGEMENT_TOKEN` set in `apps/backend/.env` |
| `401` / `403` from Contentful | Token scopes and space access |
| Wrong space/environment | `spaceId` and `environmentId` in query/body match the space you expect |
| Import errors in a fork | Run `npm run build` for `shared-types` and `utils` before building backend |
| Netlify: invalid function names `*.d` | Remove `apps/backend/dist` as Functions directory; use `netlify.toml` in repo; clean rebuild so stale `.d.ts` are not in `dist` |

For **App definition, App Actions, and Automations**, see [Configuration](../CONFIGURATION.md) and [Sidebar how-to](./sidebar.md).

**App Action JSON Schemas** (draft-04) for Contentful’s `parametersSchema` / `resultSchema`: `packages/shared-types/schemas/` — see [schemas/README](../../packages/shared-types/schemas/README.md).
