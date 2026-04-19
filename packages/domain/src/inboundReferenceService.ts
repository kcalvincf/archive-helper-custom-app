import type { ContentRepository } from "@archive-helper/contentful-adapters";
import type {
  GetIncomingLinksCountActionInput,
  GetIncomingLinksCountActionResult,
  GetLinkedEntryCountInput,
  GetLinkedEntryCountResult,
} from "@archive-helper/shared-types";
import { createLogger, type Logger } from "./logger.js";

/**
 * Fast inbound reference counts using CMA `links_to_entry` and the collection `total`.
 * Paginated fetch for unlink batches is done via {@link ContentRepository.getLinkedEntries}.
 */
export class InboundReferenceService {
  private readonly log: Logger;

  constructor(
    private readonly repository: ContentRepository,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger("InboundReferenceService");
  }

  /**
   * Preferred name — returns count (and optional preview) for workflows and App Actions.
   */
  async getCount(input: GetIncomingLinksCountActionInput): Promise<GetIncomingLinksCountActionResult> {
    const { previewSize, ...rest } = input;
    const full = await this.getLinkedEntryCount({
      ...rest,
      previewSize,
    });
    return {
      entryId: full.entryId,
      totalLinkedEntries: full.totalLinkedEntries,
      preview: full.preview,
    };
  }

  /**
   * @deprecated Use {@link getCount} — same behavior; may include `request` metadata for backward compatibility.
   */
  async getLinkedEntryCount(input: GetLinkedEntryCountInput): Promise<GetLinkedEntryCountResult> {
    const previewSize = input.previewSize ?? 0;
    const limit = previewSize > 0 ? Math.min(Math.max(previewSize, 1), 25) : 1;

    this.log.info("inbound.count.start", {
      entryId: input.entryId,
      limit,
    });

    const page = await this.repository.getLinkedEntries({
      spaceId: input.spaceId,
      environmentId: input.environmentId,
      entryId: input.entryId,
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
