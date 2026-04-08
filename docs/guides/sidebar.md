# How to: Sidebar (`apps/sidebar`)

This guide explains how to run, configure, and deploy the **Entry Sidebar** React UI: inbound link count, preview unlink, and remove links via the **App Action** API.

## What you get

- **Location:** `LOCATION_ENTRY_SIDEBAR` (entry sidebar in the Contentful web app).
- **Main UI:** `src/locations/EntrySidebar.tsx` — loads count with CMA, runs unlink via `sdk.cma.appActionCall.createWithResult`.
- **Stack:** Vite, React 18, `@contentful/app-sdk`, `@contentful/f36-components`.
- **Types:** `@archive-helper/shared-types` for `AppActionRemoveLinksOutput`.

---

## 1. Prerequisites

- Node.js 18.18+
- A **Contentful app** with the **Entry sidebar** location enabled and pointing at your hosted (or tunneled) sidebar URL.
- An **App Action** registered on that app with parameters compatible with the sidebar (see below).
- Monorepo dependencies installed from root: `npm install`, and `npm run build -w @archive-helper/shared-types` (sidebar imports that package).

---

## 2. Parameter definitions (Contentful UI)

- **Instance parameters** (entry sidebar location): use **`packages/shared-types/schemas/archive-helper.instance-parameters.definition.json`** so `id` values match `ArchiveHelperInstanceParameters` (`appDefinitionId`, `appActionRemoveLinksId`).
- **App Action** in Contentful: paste **`app-action-remove-links.parameters.schema.json`** and **`app-action-remove-links.result.schema.json`** into **parametersSchema** / **resultSchema** (draft-04). See `packages/shared-types/schemas/README.md`.

## 3. Configure App Action IDs

The sidebar must know **which App Action** to call. It resolves IDs in this order:

1. **Instance / installation parameters** (best for production), from the app definition in Contentful:
   - `appDefinitionId`
   - `appActionRemoveLinksId`
2. **Vite environment variables** (handy for local dev), in `apps/sidebar/.env`:

   ```bash
   cp apps/sidebar/.env.example apps/sidebar/.env
   ```

   | Variable | Purpose |
   |----------|---------|
   | `VITE_CONTENTFUL_APP_DEFINITION_ID` | Your app definition ID (from Contentful UI or API). |
   | `VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID` | The App Action ID for “remove inbound links”. |

After changing `.env`, restart `npm run dev` (Vite reads env at startup).

**Where to find IDs in Contentful**

- App definition: Apps → your app → URL or settings often show the definition ID; or use the Management API.
- App Action: same app → App actions → select the action → copy its **ID**.

---

## 4. Local development

From the monorepo root:

```bash
npm install
npm run build -w @archive-helper/shared-types
npm run dev -w @archive-helper/sidebar
```

Default Vite port is **3001** (see `apps/sidebar/vite.config.ts`).

### Open the UI inside Contentful

The sidebar is not meant to run standalone as a full product experience: it expects the **Contentful App SDK** `init()` context (space, environment, entry, CMA adapter).

Typical flow:

1. Expose your dev server with **HTTPS** (Contentful often requires it for app URLs), e.g. **ngrok**, **Cloudflare Tunnel**, or similar:  
   `https://xxxx.ngrok.io` → `http://localhost:3001`
2. In Contentful: **Apps** → your app → set the **Entry sidebar** frontend URL to that HTTPS origin (path should load `index.html`, e.g. `https://xxxx.ngrok.io/`).
3. Install the app to your space, open an **entry**, and open the **sidebar** where your app is pinned.

If you open only `http://localhost:3001` in a normal browser tab, SDK init may not receive a real host context.

---

## 5. Production build and hosting

```bash
npm run build -w @archive-helper/sidebar
```

Static output is in **`apps/sidebar/build/`** (Vite `outDir`). Deploy that folder to:

- S3 + CloudFront, Netlify, Vercel (static), or any static host.
- Set the app’s **Entry sidebar** URL to the deployed origin.

Ensure **HTTPS** and correct **CORS** / caching headers per your host (Contentful loads the app in an iframe).

---

## 6. What the sidebar does (behavior)

| UI | Behavior |
|----|----------|
| **Incoming links** | On load: `sdk.cma.entry.getMany` with `query: { links_to_entry: <current entry id>, limit: 1 }`, displays **`total`**. |
| **Preview unlink impact** | Calls App Action with `dryRun: true`, `publishStrategy: "none"`. |
| **Remove links** | Calls App Action with `dryRun: false`, `publishStrategy: "republish-if-published"`. Disabled when count is `0`. |
| **While running** | Buttons disabled + “Running App Action…” spinner. |
| **After run** | Shows summary note and up to 12 per-entry lines; notifier toasts on success/error. |

Entry ID comes from `sdk.entry.getSys().id`. Space/environment from `sdk.ids.space` and `sdk.ids.environment`.

---

## 7. App Action contract (must match Contentful)

The executor must accept **parameters** (names should match what you register in the App Action definition):

- `targetEntryId` (string)
- `dryRun` (boolean, optional)
- `publishStrategy` (`"none"` | `"republish-if-published"`, optional)

The executor should return JSON matching **`AppActionRemoveLinksOutput`** (`totalLinkedEntries`, `scanned`, `changed`, `unchanged`, `failed`, `results`).

Implement that with a **Contentful Function**, or proxy to **`POST /app-actions/remove-incoming-links`** on this repo’s backend — see [Backend how-to](./backend.md) and [Configuration](../CONFIGURATION.md).

---

## 8. Troubleshooting

| Issue | What to check |
|--------|----------------|
| “Missing App Action configuration” | Set instance params (`appActionRemoveLinksId`, `appDefinitionId`) or both `VITE_*` vars in `.env`. |
| App Action fails / wrong result | Parameter names and types in Contentful match §6; executor returns `AppActionRemoveLinksOutput`. |
| Count fails or stays loading | User/token can read entries; `links_to_entry` supported for your environment. |
| Blank iframe | Sidebar URL HTTPS, app installed, correct location (entry sidebar). |
| Stale env vars | Restart Vite after editing `.env`. |

---

## 9. Related docs

- [Configuration](../CONFIGURATION.md) — full stack wiring, Automations, security.
- [Backend how-to](./backend.md) — HTTP API and library usage.
