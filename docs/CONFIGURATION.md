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
| `apps/sidebar` | React UI (`LOCATION_ENTRY_SIDEBAR`) — count via `sdk.cma`, unlink via App Action call |
| `apps/backend` | Standalone API + shared unlink engine (Management token) |
| `packages/shared-types` | Contracts shared by sidebar and backend |
| `packages/utils` | Recursive unlink helpers (used by backend) |

## 3. Install dependencies

From the repository root:

```bash
cd contentful-archive-helper
npm install
npm run build
```

## 4. Backend environment

Create `apps/backend/.env` (see `apps/backend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `CONTENTFUL_MANAGEMENT_TOKEN` | CMA token for `apps/backend` HTTP server and any server that uses `createAppServices` |
| `PORT` | HTTP port (default `3000`) |

## 5. Sidebar environment

The sidebar resolves the **App Action** to invoke in this order:

1. **Installation / instance parameters** (recommended for production), set in the Contentful app definition:
   - `appDefinitionId` — your app definition ID (same as `sdk.ids.app` when available).
   - `appActionRemoveLinksId` — ID of the “remove inbound links” App Action.
2. **Vite env vars** (optional, useful for local dev), in `apps/sidebar/.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_CONTENTFUL_APP_DEFINITION_ID` | Fallback if `instance.appDefinitionId` is not set |
| `VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID` | Fallback if `instance.appActionRemoveLinksId` is not set |

Copy `apps/sidebar/.env.example` to `apps/sidebar/.env` and fill values when not using instance parameters.

## 6. Register the app in Contentful

1. In the Contentful web app: **Apps** → **Create app** (or use the CLI / API).
2. Under **Locations**, add **Entry sidebar** (`entry-sidebar` / `LOCATION_ENTRY_SIDEBAR`).
3. Set the **frontend URL** to your hosted sidebar build (`apps/sidebar` → `npm run build` → deploy the `build/` folder), or use a tunnel (e.g. ngrok) to `npm run dev` during development.
4. Save the **App definition ID** — you need it for App Actions and optional Vite env.
5. For **instance parameters** on the entry sidebar location, use the field list in **`packages/shared-types/schemas/archive-helper.instance-parameters.definition.json`** (or equivalent `id`/`type`/`required` in the UI). See **`packages/shared-types/schemas/README.md`**.

### Schema files (App Action + types)

| Artifact | File under `packages/shared-types/schemas/` |
|----------|--------------------------------|
| Instance parameter definitions (sidebar) | `archive-helper.instance-parameters.definition.json` |
| App Action **parametersSchema** (JSON Schema draft-04) | `app-action-remove-links.parameters.schema.json` |
| App Action **resultSchema** (draft-04) | `app-action-remove-links.result.schema.json` |

TypeScript: `ArchiveHelperInstanceParameters`, `AppActionRemoveLinksInput`, `AppActionRemoveLinksOutput` in `@archive-helper/shared-types`.

## 7. Register the App Action

Create an App Action on the same app definition (Contentful UI: **App actions** or API):

- **Name**: e.g. `removeInboundLinks`.
- **Category**: suitable for Automations (often “Custom”).
- **Parameters** — paste **`app-action-remove-links.parameters.schema.json`** into **parametersSchema** in the UI (JSON Schema draft-04). Summary:

  | Key | Type | Notes |
  |-----|------|--------|
  | `targetEntryId` | String | Required |
  | `dryRun` | Boolean | Optional |
  | `publishStrategy` | String | `"none"` \| `"republish-if-published"` |

- **Result schema** — paste **`app-action-remove-links.result.schema.json`** into **resultSchema** so structured results match the sidebar.

- **Executor**: choose the option your org uses:

  ### Option A — Contentful Function (hosted)

  Deploy a function that:

  1. Reads `spaceId`, `environmentId`, and parameters from the invocation context.
  2. Uses a **secure** Management token (secret / env in the function).
  3. Calls the same logic as `removeIncomingLinksAppAction` in `apps/backend` (copy or import the built package in your function bundle).

  Return JSON exactly matching `AppActionRemoveLinksOutput` from `@archive-helper/shared-types`.

  ### Option B — HTTP / custom backend

  Point the App Action at your infrastructure so the invocation hits `apps/backend` (or a proxy). Your handler should:

  1. Validate the Contentful request (signed headers / org standards).
  2. `POST` to `POST /app-actions/remove-incoming-links` with body:

  ```json
  {
    "spaceId": "<from context>",
    "environmentId": "<from context>",
    "targetEntryId": "<parameter>",
    "dryRun": true,
    "publishStrategy": "none"
  }
  ```

  3. Return the JSON response as the App Action result.

## 8. How the sidebar talks to the backend

- **Incoming link count**: The sidebar does **not** call your Express server by default. It uses **`sdk.cma.entry.getMany`** with `links_to_entry` and `limit: 1`, then reads **`total`** (fast, same source of truth as the backend count service).
- **Unlink / preview**: The sidebar calls **`sdk.cma.appActionCall.createWithResult`** so execution stays server-side with appropriate tokens and matches **Automations** behavior.

The **shared types** for the App Action result are `AppActionRemoveLinksOutput` and `EntryUnlinkResult` in `packages/shared-types`.

## 9. Automations

1. **Automations** → create a workflow.
2. Add a step **App Action** and select this app’s `removeInboundLinks` (or your action name).
3. Map **parameters** from the trigger (e.g. archived entry’s ID → `targetEntryId`). Set `dryRun: false` for real unlink.
4. Ensure the executor’s Management token can update all linking entries.

## 10. Local development

**Backend**

```bash
cd apps/backend
cp .env.example .env
# add CONTENTFUL_MANAGEMENT_TOKEN
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
- After changing shapes, run `npm run build` at the repo root and fix any type errors in `apps/sidebar` or `apps/backend`.
