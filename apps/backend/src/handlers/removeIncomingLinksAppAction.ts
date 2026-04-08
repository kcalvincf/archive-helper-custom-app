import type {
  AppActionRemoveLinksInput,
  AppActionRemoveLinksOutput,
} from "@archive-helper/shared-types";
import type { RemoveIncomingLinksService } from "../services/RemoveIncomingLinksService.js";

/**
 * Maps full service output to the App Action contract (no `targetEntryId` in response).
 * Use from Contentful Functions / webhook handlers where `spaceId` and `environmentId`
 * come from invocation context.
 */
export async function removeIncomingLinksAppAction(
  context: { spaceId: string; environmentId: string },
  input: AppActionRemoveLinksInput,
  unlink: RemoveIncomingLinksService,
): Promise<AppActionRemoveLinksOutput> {
  const full = await unlink.removeIncomingLinks({
    spaceId: context.spaceId,
    environmentId: context.environmentId,
    targetEntryId: input.targetEntryId,
    dryRun: input.dryRun,
    publishStrategy: input.publishStrategy,
  });

  return {
    totalLinkedEntries: full.totalLinkedEntries,
    scanned: full.scanned,
    changed: full.changed,
    unchanged: full.unchanged,
    failed: full.failed,
    results: full.results,
  };
}
