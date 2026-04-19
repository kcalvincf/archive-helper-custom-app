import type { RemoveIncomingLinksInput, RemoveIncomingLinksResult } from "@archive-helper/shared-types";
import type { RemoveIncomingLinksBatchService } from "./removeIncomingLinksBatchService.js";
import { validateRemoveIncomingLinksInput } from "./validation.js";

export type RemoveIncomingLinksHandlerOptions = {
  installationDefaultBatchSize?: number;
  envOrConfigDefaultBatchSize?: number;
};

/**
 * Validates payload and runs {@link RemoveIncomingLinksBatchService.execute} (one batch).
 */
export async function removeIncomingLinksActionHandler(
  input: RemoveIncomingLinksInput,
  unlink: RemoveIncomingLinksBatchService,
  options?: RemoveIncomingLinksHandlerOptions,
): Promise<RemoveIncomingLinksResult> {
  const normalized = validateRemoveIncomingLinksInput(input, {
    installationDefaultBatchSize: options?.installationDefaultBatchSize,
    envOrConfigDefaultBatchSize: options?.envOrConfigDefaultBatchSize,
  });
  return unlink.execute(normalized);
}
