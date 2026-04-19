# Parameter schema definitions

Use these files when registering the app in Contentful so validation and the sidebar stay aligned with `@archive-helper/shared-types`.

| File | Where to use it |
|------|------------------|
| **`archive-helper.instance-parameters.definition.json`** | App definition → **Entry sidebar** location → **Instance parameters**. Same keys as `ArchiveHelperInstanceParameters`. |
| **`archive-helper.installation-parameters.definition.json`** | App definition → **Install** / installation parameters. Same keys as `ArchiveHelperInstallationParameters` (e.g. default unlink batch size for Functions). |
| **`app-action-get-incoming-links-count.parameters.schema.json`** | App Action **`getIncomingLinksCount`** → **parametersSchema** (draft-04). |
| **`app-action-get-incoming-links-count.result.schema.json`** | App Action **`getIncomingLinksCount`** → **resultSchema** (draft-04). |
| **`app-action-remove-links.parameters.schema.json`** | App Action **`removeIncomingLinks`** → **parametersSchema** (draft-04). |
| **`app-action-remove-links.result.schema.json`** | App Action **`removeIncomingLinks`** → **resultSchema** (draft-04). |

TypeScript mirrors:

- `ArchiveHelperInstanceParameters`, `ArchiveHelperInstallationParameters`, `ARCHIVE_HELPER_*_DEFINITIONS` in `src/parameters.ts`
- `GetIncomingLinksCountActionInput` / `GetIncomingLinksCountActionResult`, `AppActionRemoveLinksInput`, `RemoveIncomingLinksResult` in `src/index.ts`

**Note:** Contentful App Action schemas use [JSONSchema4](https://www.contentful.com/developers/docs/extensibility/app-framework/app-actions/) (draft-04).
