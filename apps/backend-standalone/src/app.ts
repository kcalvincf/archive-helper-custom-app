import { createPlainCmaClient, StandaloneCmaContentRepository } from "@archive-helper/contentful-adapters";
import type { ContentfulConfig } from "@archive-helper/shared-types";
import {
  createLogger,
  InboundReferenceService,
  RemoveIncomingLinksBatchService,
} from "@archive-helper/domain";

export type AppServices = {
  inbound: InboundReferenceService;
  unlink: RemoveIncomingLinksBatchService;
  /** Used when HTTP body omits `batchSize`. */
  defaultUnlinkBatchSize?: number;
};

export function createAppServices(config: ContentfulConfig): AppServices {
  const cmaLog = createLogger("StandaloneCma");
  const client = createPlainCmaClient(config.accessToken);
  const repository = new StandaloneCmaContentRepository(client, cmaLog);
  return {
    inbound: new InboundReferenceService(repository),
    unlink: new RemoveIncomingLinksBatchService(repository),
    defaultUnlinkBatchSize: config.defaultUnlinkBatchSize,
  };
}
