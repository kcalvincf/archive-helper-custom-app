import type { EntryUnlinkResult, RemoveIncomingLinksResult } from "@archive-helper/shared-types";

export function aggregateUnlinkStats(results: EntryUnlinkResult[]): Pick<
  RemoveIncomingLinksResult,
  "changed" | "unchanged" | "failed"
> {
  let changed = 0;
  let unchanged = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "failed") failed += 1;
    else if (r.status === "unchanged") unchanged += 1;
    else changed += 1;
  }
  return { changed, unchanged, failed };
}

export function buildUnlinkSummaryMessage(result: RemoveIncomingLinksResult): string {
  const {
    targetEntryId,
    totalLinkedEntries,
    processedInThisBatch,
    nextSkip,
    hasMore,
    changed,
    unchanged,
    failed,
  } = result;
  return [
    `Unlink batch for target ${targetEntryId}.`,
    `Total inbound entries (CMA total): ${totalLinkedEntries}.`,
    `Processed in this batch: ${processedInThisBatch}. Next skip: ${nextSkip}. Has more: ${hasMore}.`,
    `Changed: ${changed}, unchanged: ${unchanged}, failed: ${failed}.`,
  ].join(" ");
}
