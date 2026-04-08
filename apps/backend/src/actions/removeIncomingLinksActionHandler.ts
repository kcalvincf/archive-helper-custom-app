import { ValidationError } from "../errors.js";
import type { RemoveIncomingLinksInput, RemoveIncomingLinksResult } from "@archive-helper/shared-types";
import type { RemoveIncomingLinksService } from "../services/RemoveIncomingLinksService.js";

function requireNonEmpty(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) throw new ValidationError(`${name} is required`);
  return v;
}

/**
 * Validates payload and runs {@link RemoveIncomingLinksService.removeIncomingLinks}.
 * Wire this to Contentful App Actions / Automations by passing the parsed JSON body.
 */
export async function removeIncomingLinksActionHandler(
  input: RemoveIncomingLinksInput,
  unlink: RemoveIncomingLinksService,
): Promise<RemoveIncomingLinksResult> {
  const spaceId = requireNonEmpty("spaceId", input.spaceId);
  const environmentId = requireNonEmpty("environmentId", input.environmentId);
  const targetEntryId = requireNonEmpty("targetEntryId", input.targetEntryId);

  if (input.publishStrategy && !["none", "republish-if-published"].includes(input.publishStrategy)) {
    throw new ValidationError("publishStrategy must be 'none' or 'republish-if-published'");
  }
  if (input.localeMode && !["all", "defaultOnly"].includes(input.localeMode)) {
    throw new ValidationError("localeMode must be 'all' or 'defaultOnly'");
  }

  return unlink.removeIncomingLinks({
    ...input,
    spaceId,
    environmentId,
    targetEntryId,
  });
}
