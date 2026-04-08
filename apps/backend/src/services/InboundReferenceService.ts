import type { ContentfulEntryService } from "../contentful/ContentfulEntryService.js";
import type { GetLinkedEntryCountInput, GetLinkedEntryCountResult } from "@archive-helper/shared-types";
import { createLogger, type Logger } from "../utils/logger.js";

/**
 * Fast inbound reference counts using CMA `links_to_entry` and the collection `total`.
 */
export class InboundReferenceService {
  private readonly log: Logger;

  constructor(
    private readonly entries: ContentfulEntryService,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger("InboundReferenceService");
  }

  async getLinkedEntryCount(input: GetLinkedEntryCountInput): Promise<GetLinkedEntryCountResult> {
    const previewSize = input.previewSize ?? 0;
    const limit = previewSize > 0 ? Math.min(Math.max(previewSize, 1), 25) : 1;

    this.log.info("inbound.count.start", {
      entryId: input.entryId,
      limit,
    });

    const page = await this.entries.getLinkedEntriesPage({
      spaceId: input.spaceId,
      environmentId: input.environmentId,
      linksToEntry: input.entryId,
      limit,
      skip: 0,
    });

    const preview =
      previewSize > 0
        ? page.items.slice(0, previewSize).map((e) => ({
            entryId: e.sys.id,
            contentTypeId: e.sys.contentType.sys.id,
          }))
        : undefined;

    this.log.info("inbound.count.done", {
      entryId: input.entryId,
      total: page.total,
    });

    return {
      entryId: input.entryId,
      totalLinkedEntries: page.total,
      preview: preview?.length ? preview : undefined,
      request: { limit: page.limit, skip: page.skip },
    };
  }
}
