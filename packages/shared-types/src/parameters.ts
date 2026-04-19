/**
 * Contentful **instance** parameters for the Entry Sidebar (assign-app-to-location / content type).
 * Keys must match `schemas/archive-helper.instance-parameters.definition.json`.
 *
 * @see https://www.contentful.com/developers/docs/extensibility/app-framework/app-parameters/
 */
export type ArchiveHelperInstanceParameters = {
  /**
   * App definition ID for `appActionCall`. Optional when running inside Contentful: the sidebar uses
   * `sdk.ids.app` after instance params and `VITE_CONTENTFUL_APP_DEFINITION_ID`.
   */
  appDefinitionId?: string;
  /**
   * App Action ID for `getIncomingLinksCount`. Optional: sidebar falls back to direct CMA count.
   */
  appActionGetIncomingLinksCountId?: string;
  /**
   * App Action ID for remove inbound links (batched). Required unless
   * `VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID` is set (typical for local Vite dev).
   */
  appActionRemoveLinksId?: string;
  /**
   * When true, previously published linking entries are republished after unlink. When false or
   * omitted, updates are draft-only (`publishStrategy: none`).
   */
  republishAfterUnlink?: boolean;
  /**
   * Default batch size for “Remove links” in the sidebar when the user does not override it.
   * Clamped to 1..MAX_UNLINK_BATCH_SIZE in the client.
   */
  defaultUnlinkBatchSize?: number;
};

/**
 * App **installation** parameters (space-level). Keys should match
 * `schemas/archive-helper.installation-parameters.definition.json`.
 */
export type ArchiveHelperInstallationParameters = {
  /**
   * Default `batchSize` for the remove-incoming-links App Action when the workflow omits `batchSize`.
   */
  defaultUnlinkBatchSize?: number;
};

/**
 * Contentful UI / CMA: `parameters` array shape for **instance** parameter definitions
 * (Edit app definition → Locations → Entry sidebar → instance parameters).
 */
export type ContentfulParameterDefinition = {
  id: string;
  name: string;
  description?: string;
  type: "Symbol" | "Enum" | "Number" | "Boolean";
  required?: boolean;
  default?: string | number | boolean;
  options?: Array<{ value: string }>;
  labels?: { true?: string; false?: string };
};

/** Canonical instance-parameter definitions for this app (copy JSON from `schemas/archive-helper.instance-parameters.definition.json` or use this in tooling). */
export const ARCHIVE_HELPER_INSTANCE_PARAMETER_DEFINITIONS: ContentfulParameterDefinition[] = [
  {
    id: "appDefinitionId",
    name: "App definition ID",
    description:
      "ID of this app definition. Used for App Action calls. Optional if using Vite env for dev only.",
    type: "Symbol",
    required: false,
  },
  {
    id: "appActionGetIncomingLinksCountId",
    name: "Count inbound links — App Action ID",
    description:
      "Optional. App Action ID for fast inbound link count. If unset, the sidebar uses CMA directly.",
    type: "Symbol",
    required: false,
  },
  {
    id: "appActionRemoveLinksId",
    name: "Remove links — App Action ID",
    description:
      "ID of the batched App Action: remove inbound links (targetEntryId, batchSize, skip, dryRun, publishStrategy, …).",
    type: "Symbol",
    required: false,
  },
  {
    id: "republishAfterUnlink",
    name: "Republish after unlink",
    description:
      "If enabled, republish entries that were already published after removing links. Default: off (draft-only).",
    type: "Boolean",
    required: false,
  },
  {
    id: "defaultUnlinkBatchSize",
    name: "Default unlink batch size",
    description:
      "Default number of linking entries to process per Remove links run in the sidebar (1–100). Falls back to 20 if unset.",
    type: "Number",
    required: false,
  },
];

/** Installation-parameter definitions (Apps → your app → Install → parameters). */
export const ARCHIVE_HELPER_INSTALLATION_PARAMETER_DEFINITIONS: ContentfulParameterDefinition[] = [
  {
    id: "defaultUnlinkBatchSize",
    name: "Default unlink batch size",
    description:
      "When an automation omits batchSize on remove incoming links, use this value (1–100). Falls back to 20 if unset.",
    type: "Number",
    required: false,
  },
];
