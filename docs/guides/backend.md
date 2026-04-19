# How to: Backend (`apps/backend-standalone`)

This guide explains how to run and use the **standalone Express** API that wraps the same **`@archive-helper/domain`** services as Contentful Functions.

## What you get

- **Services:** `InboundReferenceService` (count), `RemoveIncomingLinksBatchService` (one batch per HTTP call).
- **Mappings:** `getIncomingLinksCountActionHandler`, `removeIncomingLinksAppAction` / `removeIncomingLinksActionHandler`.
- **HTTP:** health, count, batched unlink, App Action–shaped invoke endpoint.

Shared types: `@archive-helper/shared-types`. Recursive unlink: `@archive-helper/shared-utils`.

---

## 1. Prerequisites

- **Node.js** 18.18+
- From repo root: `npm install` (workspaces link shared packages).
- A **Contentful Management API token** with permission to read/update entries in your space.

---

## 2. One-time setup

From the monorepo root:

```bash
cd contentful-archive-helper
npm install
npm run build -w @archive-helper/shared-types
npm run build -w @archive-helper/shared-utils
npm run build -w @archive-helper/backend-standalone
```

Or build everything:

```bash
npm run build
```

---

## 3. Environment variables

1. Copy the example file:

   ```bash
   cp apps/backend-standalone/.env.example apps/backend-standalone/.env
   ```

2. Edit `apps/backend-standalone/.env`:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `CONTENTFUL_MANAGEMENT_TOKEN` | **Yes** | CMA personal access token or integration token (never commit this file). |
   | `PORT` | No | HTTP port (default `3000`). |
   | `DEFAULT_UNLINK_BATCH_SIZE` | No | When `POST` body omits `batchSize`, use this default (1–100). |

---

## 4. Run in development

Uses **tsx** so you do not need to rebuild after every change:

```bash
# From repo root
npm run dev -w @archive-helper/backend-standalone
```

Or from `apps/backend-standalone`:

```bash
cd apps/backend-standalone
npm run dev
```

You should see a JSON log line like `http.listening` with your port. If the token is missing, the process exits immediately.

---

## 5. Run in production

Build then start with Node:

```bash
npm run build -w @archive-helper/backend-standalone
npm run start -w @archive-helper/backend-standalone
```

This runs `node dist/server.js` (loads `dotenv`; run from `apps/backend-standalone` or ensure `.env` is discoverable).

---

## 6. HTTP API quick reference

Base URL: `http://localhost:<PORT>` (or your deployed host).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness: `{ "ok": true }` |
| `GET` | `/linked-entry-count` | Query: `spaceId`, `environmentId`, `entryId`, optional `previewSize` |
| `POST` | `/remove-incoming-links` | **One batch**; body = `RemoveIncomingLinksInput` (`batchSize`, `skip`, …); response = `RemoveIncomingLinksResult` |
| `POST` | `/app-actions/remove-incoming-links` | Body = `InvokeRemoveLinksBody`; response = full batched result (`hasMore`, `nextSkip`, …) |

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

See `apps/backend-standalone/src/action-entry.ts` for a minimal serverless-style entry idea.

---

## 8. Tests

```bash
npm run test -w @archive-helper/backend
```

---

## 9. Netlify / static hosts

- **Do not** point Netlify **Functions** at `apps/backend-standalone/dist`. Use **`netlify/functions`** (see repo root `netlify.toml`).
- **Declarations:** Backend standalone may emit **`.d.ts`** to **`dist-types/`** separately from `dist/`.

## 10. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Server exits on start | `CONTENTFUL_MANAGEMENT_TOKEN` set in `apps/backend-standalone/.env` |
| `401` / `403` from Contentful | Token scopes and space access |
| Wrong space/environment | `spaceId` and `environmentId` in query/body match the space you expect |
| Import errors in a fork | Run `npm run build` for `shared-types` and `utils` before building backend |
| Netlify: invalid function names `*.d` | Do not use backend `dist` as Functions directory; use `netlify.toml` in repo |

For **App definition, App Actions, and Automations**, see [Configuration](../CONFIGURATION.md) and [Sidebar how-to](./sidebar.md).

**App Action JSON Schemas** (draft-04) for Contentful’s `parametersSchema` / `resultSchema`: `packages/shared-types/schemas/` — see [schemas/README](../../packages/shared-types/schemas/README.md).
