import type { AppActionRemoveLinksOutput, RemoveIncomingLinksResult } from "@archive-helper/shared-types";

/**
 * App Actions return the full {@link RemoveIncomingLinksResult} (including `targetEntryId` and batch fields).
 */
export function toAppActionRemoveLinksOutput(full: RemoveIncomingLinksResult): AppActionRemoveLinksOutput {
  return full;
}
