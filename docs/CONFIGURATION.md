# Configuration guide

This document explains how to wire **Archive Helper** end-to-end: Contentful app installation, environment variables, App Actions, Automations, and local development.

**Focused how-tos**

- [Backend how-to](./guides/backend.md) — run the API, env, `curl`, library usage  
- [Sidebar how-to](./guides/sidebar.md) — Vite, env vars, hosting, `EntrySidebar` behavior  

## 1. Prerequisites

- Contentful **space** with environments (e.g. `master`).
- A **Management API token** with rights to read/update entries (and manage app definitions if you create the app yourself).
- Node.js **18.18+** and npm **9+** (workspaces).

## 2. Monorepo layout

| Path | Role |
|------|------|
| `apps/sidebar` | React UI — count (optional count App Action or CMA), batched unlink via App Action |
| `apps/backend-standalone` | Express API + Management token (same domain as Functions) |
| `apps/backend-functions` | Contentful Function sources for both App Actions |
| `packages/shared-types` | Contracts + JSON schemas |
| `packages/shared-utils` | Recursive unlink helpers |
| `packages/domain` | `InboundReferenceService`, `RemoveIncomingLinksBatchService` |
| `packages/contentful-adapters` | `ContentRepository` + CMA implementation |

## 3. Install dependencies

From the repository root:

```bash
cd contentful-archive-helper
npm install
npm run build
```

## 4. Backend environment

Create `apps/backend-standalone/.env` (see `apps/backend-standalone/.env.example` if present):

| Variable | Purpose |
|----------|---------|
| `CONTENTFUL_MANAGEMENT_TOKEN` | CMA token for the standalone HTTP server |
| `PORT` | HTTP port (default `3000`) |
| `DEFAULT_UNLINK_BATCH_SIZE` | Optional default when `POST` body omits `batchSize` (1–100) |

## 5. Sidebar environment

The sidebar resolves IDs for **`appActionCall.createWithResult`** like this:

| Value | Resolution order |
|-------|------------------|
| **App definition ID** | 1) Instance parameter `appDefinitionId` → 2) `VITE_CONTENTFUL_APP_DEFINITION_ID` → 3) **`sdk.ids.app`** (set automatically when the UI runs inside Contentful). |
| **Remove-links App Action ID** | 1) `appActionRemoveLinksId` → 2) **`VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID`**. |
| **Count App Action ID (optional)** | 1) `appActionGetIncomingLinksCountId` → 2) **`VITE_CONTENTFUL_APP_ACTION_GET_INCOMING_LINKS_COUNT_ID`**. If unset, sidebar uses CMA `links_to_entry` + `total`. |
| **Default batch size (sidebar)** | Instance `defaultUnlinkBatchSize` or **`VITE_DEFAULT_UNLINK_BATCH_SIZE`**. |
| **Publish after unlink** | Instance parameter **`republishAfterUnlink`** (Boolean, default off) or, for local dev only, **`VITE_CONTENTFUL_REPUBLISH_AFTER_UNLINK=true`**. When off or unset, **Remove links** uses **`publishStrategy: "none"`** (draft-only). When on, **Remove links** uses **`republish-if-published`**. **Preview** always uses **`"none"`**. |

So **inside Contentful**, you normally only configure the **App Action ID** (instance parameter on the Entry sidebar location, or Vite env for dev). If **`sdk.ids.app`** is missing in your context, set **`appDefinitionId`** explicitly.

**Local dev:** copy `apps/sidebar/.env.example` → `apps/sidebar/.env` and set at least **`VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID`** (from **Apps → your app → App actions** — use the action’s ID). Optionally set **`VITE_CONTENTFUL_REPUBLISH_AFTER_UNLINK=true`** to test republish behavior without changing instance parameters.

## 6. Register the app in Contentful

1. In the Contentful web app: **Apps** → **Create app** (or use the CLI / API).
2. Under **Locations**, add **Entry sidebar** (`entry-sidebar` / `LOCATION_ENTRY_SIDEBAR`).
3. Set the **frontend URL** to your hosted sidebar build (`apps/sidebar` → `npm run build` → deploy the `build/` folder), or use a tunnel (e.g. ngrok) to `npm run dev` during development.
4. Save the **App definition ID** — you need it for App Actions and optional Vite env.
5. For **instance parameters** on the entry sidebar location, use **`archive-helper.instance-parameters.definition.json`**. For **installation** defaults (e.g. batch size for Functions), use **`archive-helper.installation-parameters.definition.json`**. See **`packages/shared-types/schemas/README.md`**.

### Schema files (App Actions + types)

| Artifact | File |
|----------|------|
| Instance parameters (sidebar) | `archive-helper.instance-parameters.definition.json` |
| Installation parameters | `archive-helper.installation-parameters.definition.json` |
| **getIncomingLinksCount** parameters / result | `app-action-get-incoming-links-count.*.schema.json` |
| **removeIncomingLinks** parameters / result | `app-action-remove-links.*.schema.json` |

Types: `GetIncomingLinksCountActionResult`, `RemoveIncomingLinksResult`, `AppActionRemoveLinksInput`, etc. in `@archive-helper/shared-types`.

## 7. Register the App Actions

Register **two** Custom App Actions on the app definition (or wire one to HTTP — see root **README**).

### A. `getIncomingLinksCount`

- **Parameters:** `app-action-get-incoming-links-count.parameters.schema.json` — body field **`entryId`** (space/environment from host).
- **Result:** `app-action-get-incoming-links-count.result.schema.json`.
- **Function:** `apps/backend-functions` → `getIncomingLinksCountAction.js` (see root **`contentful-app-manifest.json`**).

### B. `removeIncomingLinks` (batched)

- **Parameters:** `app-action-remove-links.parameters.schema.json` — **`targetEntryId`**, optional **`batchSize`**, **`skip`**, **`dryRun`**, **`publishStrategy`**, **`localeMode`**, **`contentTypeFilter`**.
- **Result:** `app-action-remove-links.result.schema.json` — includes **`hasMore`**, **`nextSkip`**, **`remainingEstimate`**, per-entry **`results`**.

**Executor:** Contentful Function from this repo, or HTTP **`POST /app-actions/remove-incoming-links`** on **`apps/backend-standalone`**.

**Large jobs:** In Automations, loop the unlink action with **`skip`** = previous **`nextSkip`** until **`hasMore`** is **false**.

## 8. How the sidebar uses the stack

- **Count:** Optional **`getIncomingLinksCount`** App Action; otherwise **`sdk.cma.entry.getMany`** with `links_to_entry`, `limit: 1`, **`total`**.
- **Preview / remove batch:** **`appActionCall.createWithResult`** on the batched **`removeIncomingLinks`** action with **`skip`** and **`batchSize`**.

Shared types: **`RemoveIncomingLinksResult`**, **`EntryUnlinkResult`**.

## 9. Automations

1. Optionally run **`getIncomingLinksCount`** to gate work.
2. Loop **`removeIncomingLinks`** with **`skip`** starting at **0**, then each **`nextSkip`**, until **`hasMore`** is **false**.
3. Use **`dryRun: true`** only for preview steps.
4. Ensure the executor token can read/update all linking entries.

## 10. Local development

**Backend**

```bash
cd apps/backend-standalone
# add CONTENTFUL_MANAGEMENT_TOKEN (and optional DEFAULT_UNLINK_BATCH_SIZE)
npm run dev
# HTTP on PORT (default 3000): GET /linked-entry-count, POST /remove-incoming-links, POST /app-actions/remove-incoming-links
```

**Sidebar**

```bash
cd apps/sidebar
cp .env.example .env
# optional: VITE_* fallbacks
npm run dev
```

Register the dev URL in the app definition and open an entry in the Contentful web app with the sidebar enabled.

## 11. Security notes

- Never commit `.env` files or Management tokens.
- The browser app only uses the **App SDK–scoped CMA client**; long-lived tokens belong on the **backend / function** only.
- Lock down `POST /app-actions/remove-incoming-links` with auth if exposed on the public internet.

## 12. Verifying contracts

- TypeScript types: `import type { AppActionRemoveLinksInput, AppActionRemoveLinksOutput } from '@archive-helper/shared-types'`.
- After changing shapes, run `npm run build` at the repo root and fix any type errors in `apps/sidebar`, `apps/backend-standalone`, or `apps/backend-functions`.
