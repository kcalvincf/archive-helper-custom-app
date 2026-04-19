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

export type PublishStrategy = "none" | "republish-if-published";
export type LocaleMode = "all" | "defaultOnly";

/** Default batch size when no action param or installation default is set. */
export const DEFAULT_UNLINK_BATCH_SIZE = 20;
/** Hard cap per App Action invocation (abuse / timeout guard). */
export const MAX_UNLINK_BATCH_SIZE = 100;

/** Count-only App Action / HTTP (space + environment usually from context). */
export type GetIncomingLinksCountActionInput = {
  spaceId: string;
  environmentId: string;
  entryId: string;
  /** When set, include up to this many sample linking entries in `preview` (capped in service). */
  previewSize?: number;
};

export type GetIncomingLinksCountActionResult = {
  entryId: string;
  totalLinkedEntries: number;
  preview?: Array<{
    entryId: string;
    contentTypeId?: string;
    locale?: string;
  }>;
};

/** @deprecated Use {@link GetIncomingLinksCountActionInput} */
export type GetLinkedEntryCountInput = GetIncomingLinksCountActionInput;

/** @deprecated Use {@link GetIncomingLinksCountActionResult} */
export type GetLinkedEntryCountResult = GetIncomingLinksCountActionResult & {
  request?: { limit: number; skip: number };
};

/** Registered App Action parameters for batched unlink (sidebar + Automations). */
export type AppActionRemoveLinksInput = {
  targetEntryId: string;
  batchSize?: number;
  skip?: number;
  dryRun?: boolean;
  publishStrategy?: PublishStrategy;
  localeMode?: LocaleMode;
  contentTypeFilter?: string[];
};

/**
 * Batched unlink result — same shape returned from App Action, HTTP, and domain service.
 * Callers use `hasMore` + `nextSkip` to continue until all inbound links are processed.
 */
export type RemoveIncomingLinksResult = {
  targetEntryId: string;
  totalLinkedEntries: number;
  batchSizeUsed: number;
  skipUsed: number;
  processedInThisBatch: number;
  nextSkip: number;
  hasMore: boolean;
  remainingEstimate: number;
  changed: number;
  unchanged: number;
  failed: number;
  results: EntryUnlinkResult[];
};

/** App Action response for remove incoming links (full batch metadata for orchestration). */
export type AppActionRemoveLinksOutput = RemoveIncomingLinksResult;

/** Full service / HTTP body (space + environment + batching). */
export type RemoveIncomingLinksInput = {
  spaceId: string;
  environmentId: string;
  targetEntryId: string;
  batchSize?: number;
  skip?: number;
  dryRun?: boolean;
  publishStrategy?: PublishStrategy;
  localeMode?: LocaleMode;
  contentTypeFilter?: string[];
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
  /** Fallback when request body omits `batchSize` (standalone server only). */
  defaultUnlinkBatchSize?: number;
};

/** HTTP + App invoke: merge App Action fields with space context. */
export type InvokeRemoveLinksBody = AppActionRemoveLinksInput & {
  spaceId: string;
  environmentId: string;
};

/** @deprecated Use {@link GetIncomingLinksCountActionResult} */
export type InboundLinkCountResult = {
  entryId: string;
  totalLinkedEntries: number;
};

export type {
  ArchiveHelperInstanceParameters,
  ArchiveHelperInstallationParameters,
  ContentfulParameterDefinition,
} from "./parameters.js";
export {
  ARCHIVE_HELPER_INSTANCE_PARAMETER_DEFINITIONS,
  ARCHIVE_HELPER_INSTALLATION_PARAMETER_DEFINITIONS,
} from "./parameters.js";
