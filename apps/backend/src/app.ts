import { createPlainClient } from "./contentful/createClient.js";
import { ContentfulEntryService } from "./contentful/ContentfulEntryService.js";
import type { ContentfulConfig } from "@archive-helper/shared-types";
import { InboundReferenceService } from "./services/InboundReferenceService.js";
import { RemoveIncomingLinksService } from "./services/RemoveIncomingLinksService.js";

export type AppServices = {
  entries: ContentfulEntryService;
  inbound: InboundReferenceService;
  unlink: RemoveIncomingLinksService;
};

export function createAppServices(config: ContentfulConfig): AppServices {
  const client = createPlainClient(config.accessToken);
  const entries = new ContentfulEntryService(client);
  return {
    entries,
    inbound: new InboundReferenceService(entries),
    unlink: new RemoveIncomingLinksService(entries),
  };
}
