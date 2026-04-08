# Parameter schema definitions

Use these files when registering the app in Contentful so validation and the sidebar stay aligned with `@archive-helper/shared-types`.

| File | Where to use it |
|------|------------------|
| **`archive-helper.instance-parameters.definition.json`** | App definition → **Entry sidebar** location → **Instance parameters**. Paste the JSON array (or recreate fields to match `id` / `type` / `required`). Same keys as TypeScript `ArchiveHelperInstanceParameters`. |
| **`app-action-remove-links.parameters.schema.json`** | App Action → **parametersSchema** (JSON Schema **draft-04**). |
| **`app-action-remove-links.result.schema.json`** | App Action → **resultSchema** (JSON Schema **draft-04**). |

TypeScript mirrors:

- `ArchiveHelperInstanceParameters`, `ContentfulParameterDefinition`, `ARCHIVE_HELPER_INSTANCE_PARAMETER_DEFINITIONS` in `src/parameters.ts`
- `AppActionRemoveLinksInput` / `AppActionRemoveLinksOutput` in `src/index.ts`

**Note:** Contentful documents App Action schemas as [JSONSchema4](https://www.contentful.com/developers/docs/extensibility/app-framework/app-actions/). These files use `$schema` `draft-04`.
