# Backend Functions (`apps/backend-functions`)

Thin **Contentful Function** handlers for two App Actions. Core logic lives in **`@archive-helper/domain`** and **`@archive-helper/contentful-adapters`** (same as the standalone Express app).

| Source file | App Action id (manifest) |
|-------------|---------------------------|
| `src/getIncomingLinksCountAction.ts` | `getIncomingLinksCount` |
| `src/removeIncomingLinksAction.ts` | `removeIncomingLinks` (batched) |

Handlers:

- Resolve a CMA **plain** client from the [function context](https://www.contentful.com/developers/docs/extensibility/app-framework/working-with-functions/).
- Build **`FunctionsCmaContentRepository`**.
- Call **`InboundReferenceService`** or **`RemoveIncomingLinksBatchService`**.
- For unlink, read **`defaultUnlinkBatchSize`** from **`context.appInstallationParameters`** when the action body omits **`batchSize`**.

Build:

```bash
npm run build -w @archive-helper/backend-functions
```

Full Contentful bundle from repo root:

```bash
npm run build:contentful
```
