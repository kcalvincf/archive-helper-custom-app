# How to: Sidebar (`apps/sidebar`)

This guide explains how to run, configure, and deploy the **Entry Sidebar** React UI: inbound link count, **batched** preview unlink, and **batched** remove via App Actions.

## What you get

- **Location:** `LOCATION_ENTRY_SIDEBAR` (entry sidebar in the Contentful web app).
- **Main UI:** `src/locations/IncomingLinksSidebar.tsx` — optional **count** App Action or CMA; **remove** via `sdk.cma.appActionCall.createWithResult` with `skip` / `batchSize`.
- **Stack:** Vite, React 18, `@contentful/app-sdk`, `@contentful/f36-components`.
- **Types:** `@archive-helper/shared-types` (`RemoveIncomingLinksResult`, etc.).

---

## 1. Prerequisites

- Node.js 18.18+
- A **Contentful app** with the **Entry sidebar** location enabled and pointing at your hosted (or tunneled) sidebar URL.
- **App Actions** registered: **`removeIncomingLinks`** (required for unlink); **`getIncomingLinksCount`** (optional — otherwise CMA count).
- Monorepo dependencies installed from root: `npm install`, and `npm run build -w @archive-helper/shared-types` (sidebar imports that package).

---

## 2. Parameter definitions (Contentful UI)

- **Instance parameters:** **`archive-helper.instance-parameters.definition.json`** (`appDefinitionId`, `appActionGetIncomingLinksCountId`, `appActionRemoveLinksId`, `republishAfterUnlink`, `defaultUnlinkBatchSize`).
- **App Actions:** schemas under **`packages/shared-types/schemas/`** — count + batched remove (see **README.md** in that folder).

## 3. Configure App Action IDs

The sidebar must know **which App Action** to call. It resolves IDs in this order:

1. **Instance parameters** (entry sidebar), from the app definition in Contentful:
   - `appDefinitionId`
   - `appActionGetIncomingLinksCountId` (optional)
   - `appActionRemoveLinksId`
   - `republishAfterUnlink`, `defaultUnlinkBatchSize`
2. **Vite environment variables**, in `apps/sidebar/.env`:

   ```bash
   cp apps/sidebar/.env.example apps/sidebar/.env
   ```

   | Variable | Purpose |
   |----------|---------|
   | `VITE_CONTENTFUL_APP_DEFINITION_ID` | Your app definition ID (from Contentful UI or API). |
   | `VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID` | Batched **remove incoming links** action. |
   | `VITE_CONTENTFUL_APP_ACTION_GET_INCOMING_LINKS_COUNT_ID` | Optional count action (else CMA). |
   | `VITE_DEFAULT_UNLINK_BATCH_SIZE` | Optional default batch size (1–100). |
   | `VITE_CONTENTFUL_REPUBLISH_AFTER_UNLINK` | Optional `true` → `republish-if-published` on remove batch. |

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

**Netlify:** the repo root **`netlify.toml`** sets `publish = "apps/sidebar/build"` and `functions = "netlify/functions"`. Do not point Netlify Functions at the standalone backend `dist` folder (see [Backend how-to](./backend.md)).

Ensure **HTTPS** and correct **CORS** / caching headers per your host (Contentful loads the app in an iframe).

---

## 6. What the sidebar does (behavior)

| UI | Behavior |
|----|----------|
| **Incoming links** | On load: optional **count** App Action, else CMA `links_to_entry` + `limit: 1` + **`total`**. |
| **Batch size** | Editable field (clamped 1–100); initialized from instance / `VITE_DEFAULT_UNLINK_BATCH_SIZE` / 20. |
| **Preview batch** | `dryRun: true`, `publishStrategy: "none"`, current **`skip`** and **`batchSize`**. |
| **Remove one batch** | `dryRun: false`, optional republish per instance/env; passes **`skip`** / **`batchSize`**. On success, advances internal **`skip`** to **`nextSkip`** when **`hasMore`**, else resets to 0. |
| **Reset batch progress** | Sets **`skip`** back to 0. |
| **After run** | Shows `hasMore`, `nextSkip`, `remainingEstimate`, per-entry lines (up to 12). |

Entry ID comes from `sdk.entry.getSys().id`. Space/environment from `sdk.ids.space` and `sdk.ids.environment`.

---

## 7. App Action contract (must match Contentful)

**Remove** action parameters include:

- `targetEntryId` (string, required)
- `batchSize`, `skip` (optional; defaults resolved server-side)
- `dryRun`, `publishStrategy`, `localeMode`, `contentTypeFilter` (optional)

**Count** action: `entryId` (required); optional `previewSize`.

The executor should return JSON matching **`RemoveIncomingLinksResult`** / **`AppActionRemoveLinksOutput`** (batched metadata: `hasMore`, `nextSkip`, `processedInThisBatch`, plus `changed`, `unchanged`, `failed`, `results`).

Implement that with a **Contentful Function**, or proxy to **`POST /app-actions/remove-incoming-links`** on this repo’s backend — see [Backend how-to](./backend.md) and [Configuration](../CONFIGURATION.md).

---

## 8. Troubleshooting

| Issue | What to check |
|--------|----------------|
| “Missing App Action configuration” | Set instance params (`appActionRemoveLinksId`, `appDefinitionId`) or both `VITE_*` vars in `.env`. |
| App Action fails / wrong result | Parameter names and types in Contentful match section 6; executor returns `AppActionRemoveLinksOutput`. |
| Count fails or stays loading | User/token can read entries; `links_to_entry` supported for your environment. |
| Blank iframe | Sidebar URL HTTPS, app installed, correct location (entry sidebar). |
| Stale env vars | Restart Vite after editing `.env`. |

---

## 9. Related docs

- [Configuration](../CONFIGURATION.md) — full stack wiring, Automations, security.
- [Backend how-to](./backend.md) — HTTP API and library usage.
