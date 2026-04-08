/**
 * Shared contracts for sidebar, HTTP backend, App Actions, and Automations.
 */

export type EntryUnlinkResult = {
  entryId: string;
  contentTypeId?: string;
  status: "changed" | "would-change" | "unchanged" | "failed";
  removedCount: number;
  message?: string;
};

/** Registered App Action parameters (sidebar + Automations). */
export type AppActionRemoveLinksInput = {
  targetEntryId: string;
  dryRun?: boolean;
  publishStrategy?: "none" | "republish-if-published";
};

/** App Action / invoke response (matches Automation expectations). */
export type AppActionRemoveLinksOutput = {
  totalLinkedEntries: number;
  scanned: number;
  changed: number;
  unchanged: number;
  failed: number;
  results: EntryUnlinkResult[];
};

/** Minimal count shape for sidebar display. */
export type InboundLinkCountResult = {
  entryId: string;
  totalLinkedEntries: number;
};

export type PublishStrategy = "none" | "republish-if-published";
export type LocaleMode = "all" | "defaultOnly";

/** Full service / HTTP body (space + environment + optional batching). */
export type RemoveIncomingLinksInput = {
  spaceId: string;
  environmentId: string;
  targetEntryId: string;
  dryRun?: boolean;
  publishStrategy?: PublishStrategy;
  localeMode?: LocaleMode;
  limit?: number;
  skip?: number;
  contentTypeFilter?: string[];
};

export type RemoveIncomingLinksResult = {
  targetEntryId: string;
  totalLinkedEntries: number;
  scanned: number;
  changed: number;
  unchanged: number;
  failed: number;
  results: EntryUnlinkResult[];
};

export type GetLinkedEntryCountInput = {
  spaceId: string;
  environmentId: string;
  entryId: string;
  previewSize?: number;
};

export type GetLinkedEntryCountResult = {
  entryId: string;
  totalLinkedEntries: number;
  preview?: Array<{
    entryId: string;
    contentTypeId?: string;
    locale?: string;
  }>;
  request?: { limit: number; skip: number };
};

export type ContentfulEntryLink = {
  sys: {
    type: "Link";
    linkType: "Entry";
    id: string;
  };
};

export type RichTextNode = {
  nodeType: string;
  data?: Record<string, unknown>;
  content?: RichTextNode[];
  [key: string]: unknown;
};

export type ContentfulConfig = {
  accessToken: string;
};

/** HTTP + App invoke: merge App Action fields with space context. */
export type InvokeRemoveLinksBody = AppActionRemoveLinksInput & {
  spaceId: string;
  environmentId: string;
};

export type {
  ArchiveHelperInstanceParameters,
  ContentfulParameterDefinition,
} from "./parameters.js";
export { ARCHIVE_HELPER_INSTANCE_PARAMETER_DEFINITIONS } from "./parameters.js";
