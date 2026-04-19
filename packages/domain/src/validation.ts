import type {
  GetIncomingLinksCountActionInput,
  RemoveIncomingLinksInput,
} from "@archive-helper/shared-types";
import { resolveUnlinkBatchSize } from "./batchSize.js";

export class ValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function requireNonEmpty(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) throw new ValidationError(`${name} is required`);
  return v;
}

/**
 * Validates and normalizes unlink input for HTTP / App Action adapters.
 * Resolves `batchSize` using explicit → installation default → env/config default → hardcoded 20.
 */
export function validateRemoveIncomingLinksInput(
  input: RemoveIncomingLinksInput,
  options?: {
    installationDefaultBatchSize?: number;
    envOrConfigDefaultBatchSize?: number;
  },
): RemoveIncomingLinksInput {
  const spaceId = requireNonEmpty("spaceId", input.spaceId);
  const environmentId = requireNonEmpty("environmentId", input.environmentId);
  const targetEntryId = requireNonEmpty("targetEntryId", input.targetEntryId);

  if (input.publishStrategy && !["none", "republish-if-published"].includes(input.publishStrategy)) {
    throw new ValidationError("publishStrategy must be 'none' or 'republish-if-published'");
  }
  if (input.localeMode && !["all", "defaultOnly"].includes(input.localeMode)) {
    throw new ValidationError("localeMode must be 'all' or 'defaultOnly'");
  }
  if (input.skip !== undefined && input.skip !== null) {
    const s = Math.floor(Number(input.skip));
    if (!Number.isFinite(s) || s < 0) {
      throw new ValidationError("skip must be a non-negative integer");
    }
  }

  const batchSize = resolveUnlinkBatchSize({
    explicit: input.batchSize,
    installationDefault: options?.installationDefaultBatchSize,
    envOrConfigDefault: options?.envOrConfigDefaultBatchSize,
  });

  return {
    ...input,
    spaceId,
    environmentId,
    targetEntryId,
    batchSize,
  };
}

export function validateGetIncomingLinksCountInput(
  input: GetIncomingLinksCountActionInput,
): GetIncomingLinksCountActionInput {
  const spaceId = requireNonEmpty("spaceId", input.spaceId);
  const environmentId = requireNonEmpty("environmentId", input.environmentId);
  const entryId = requireNonEmpty("entryId", input.entryId);
  if (input.previewSize !== undefined && input.previewSize !== null) {
    const p = Math.floor(Number(input.previewSize));
    if (!Number.isFinite(p) || p < 0 || p > 25) {
      throw new ValidationError("previewSize must be between 0 and 25");
    }
  }
  return {
    spaceId,
    environmentId,
    entryId,
    previewSize: input.previewSize,
  };
}
