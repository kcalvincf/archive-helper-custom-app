import type { GetIncomingLinksCountActionResult } from "@archive-helper/shared-types";
import type { InboundReferenceService } from "./inboundReferenceService.js";
import { getIncomingLinksCountActionHandler } from "./getIncomingLinksCountActionHandler.js";

/**
 * Invokes inbound count with space context (App Action / HTTP adapters).
 */
export async function getIncomingLinksCountAppAction(
  context: { spaceId: string; environmentId: string },
  body: { entryId: string; previewSize?: number },
  inbound: InboundReferenceService,
): Promise<GetIncomingLinksCountActionResult> {
  return getIncomingLinksCountActionHandler(
    {
      spaceId: context.spaceId,
      environmentId: context.environmentId,
      entryId: body.entryId,
      previewSize: body.previewSize,
    },
    inbound,
  );
}
