import type { GetIncomingLinksCountActionInput, GetIncomingLinksCountActionResult } from "@archive-helper/shared-types";
import type { InboundReferenceService } from "./inboundReferenceService.js";
import { validateGetIncomingLinksCountInput } from "./validation.js";

export async function getIncomingLinksCountActionHandler(
  input: GetIncomingLinksCountActionInput,
  inbound: InboundReferenceService,
): Promise<GetIncomingLinksCountActionResult> {
  const normalized = validateGetIncomingLinksCountInput(input);
  return inbound.getCount(normalized);
}
