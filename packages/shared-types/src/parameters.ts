/**
 * Contentful **instance** parameters for the Entry Sidebar (assign-app-to-location / content type).
 * Keys must match `schemas/archive-helper.instance-parameters.definition.json`.
 *
 * @see https://www.contentful.com/developers/docs/extensibility/app-framework/app-parameters/
 */
export type ArchiveHelperInstanceParameters = {
  /** App definition ID (for `appActionCall`); optional if using `VITE_CONTENTFUL_APP_DEFINITION_ID`. */
  appDefinitionId?: string;
  /** App Action ID for remove inbound links; optional if using `VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID`. */
  appActionRemoveLinksId?: string;
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
    id: "appActionRemoveLinksId",
    name: "Remove links — App Action ID",
    description:
      "ID of the App Action: remove inbound links (targetEntryId, dryRun, publishStrategy).",
    type: "Symbol",
    required: false,
  },
];
