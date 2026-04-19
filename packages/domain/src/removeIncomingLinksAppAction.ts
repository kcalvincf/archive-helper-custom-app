import type { AppActionRemoveLinksInput, RemoveIncomingLinksResult } from "@archive-helper/shared-types";
import type { RemoveIncomingLinksBatchService } from "./removeIncomingLinksBatchService.js";
import { validateRemoveIncomingLinksInput } from "./validation.js";

export type RemoveIncomingLinksAppActionOptions = {
  installationDefaultBatchSize?: number;
  envOrConfigDefaultBatchSize?: number;
};

/**
 * Invokes batched unlink with space context and returns the full result for Automations.
 */
export async function removeIncomingLinksAppAction(
  context: { spaceId: string; environmentId: string },
  input: AppActionRemoveLinksInput,
  unlink: RemoveIncomingLinksBatchService,
  options?: RemoveIncomingLinksAppActionOptions,
): Promise<RemoveIncomingLinksResult> {
  const fullInput = {
    spaceId: context.spaceId,
    environmentId: context.environmentId,
    targetEntryId: input.targetEntryId,
    batchSize: input.batchSize,
    skip: input.skip,
    dryRun: input.dryRun,
    publishStrategy: input.publishStrategy,
    localeMode: input.localeMode,
    contentTypeFilter: input.contentTypeFilter,
  };

  const normalized = validateRemoveIncomingLinksInput(fullInput, {
    installationDefaultBatchSize: options?.installationDefaultBatchSize,
    envOrConfigDefaultBatchSize: options?.envOrConfigDefaultBatchSize,
  });

  return unlink.execute(normalized);
}
