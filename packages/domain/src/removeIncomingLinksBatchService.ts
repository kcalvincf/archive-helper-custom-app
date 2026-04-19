import type { ContentRepository, RepositoryEntry } from "@archive-helper/contentful-adapters";
import type {
  EntryUnlinkResult,
  LocaleMode,
  PublishStrategy,
  RemoveIncomingLinksInput,
  RemoveIncomingLinksResult,
} from "@archive-helper/shared-types";
import { hasEntryChanged, removeTargetReferencesDeep } from "@archive-helper/shared-utils";
import { isEntryPublished } from "./entryPublished.js";
import { createLogger, type Logger } from "./logger.js";
import { aggregateUnlinkStats } from "./resultSummary.js";
import { resolveUnlinkBatchSize } from "./batchSize.js";

/**
 * Processes **one batch** of inbound linking entries per {@link execute} call.
 * Repeat with increasing `skip` (use `nextSkip` from the previous result) until `hasMore` is false.
 */
export class RemoveIncomingLinksBatchService {
  private readonly log: Logger;

  constructor(
    private readonly contentRepository: ContentRepository,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger("RemoveIncomingLinksBatchService");
  }

  /**
   * Primary entry point used by HTTP and Contentful Function adapters.
   * Callers should run {@link validateRemoveIncomingLinksInput} first so `batchSize` is resolved.
   */
  execute(input: RemoveIncomingLinksInput): Promise<RemoveIncomingLinksResult> {
    return this.run(input);
  }

  private async run(input: RemoveIncomingLinksInput): Promise<RemoveIncomingLinksResult> {
    const dryRun = input.dryRun ?? false;
    const publishStrategy: PublishStrategy = input.publishStrategy ?? "none";
    const localeMode: LocaleMode = input.localeMode ?? "all";
    const skipUsed = input.skip ?? 0;

    const batchSizeUsed = resolveUnlinkBatchSize({ explicit: input.batchSize });

    const head = await this.contentRepository.getLinkedEntries({
      spaceId: input.spaceId,
      environmentId: input.environmentId,
      entryId: input.targetEntryId,
      limit: 1,
      skip: 0,
    });
    const totalLinkedEntries = head.total;

    if (totalLinkedEntries === 0) {
      return {
        targetEntryId: input.targetEntryId,
        totalLinkedEntries: 0,
        batchSizeUsed,
        skipUsed,
        processedInThisBatch: 0,
        nextSkip: 0,
        hasMore: false,
        remainingEstimate: 0,
        changed: 0,
        unchanged: 0,
        failed: 0,
        results: [],
      };
    }

    if (skipUsed >= totalLinkedEntries) {
      return {
        targetEntryId: input.targetEntryId,
        totalLinkedEntries,
        batchSizeUsed,
        skipUsed,
        processedInThisBatch: 0,
        nextSkip: skipUsed,
        hasMore: false,
        remainingEstimate: 0,
        changed: 0,
        unchanged: 0,
        failed: 0,
        results: [],
      };
    }

    const effectiveLimit = Math.min(batchSizeUsed, totalLinkedEntries - skipUsed);

    const page = await this.contentRepository.getLinkedEntries({
      spaceId: input.spaceId,
      environmentId: input.environmentId,
      entryId: input.targetEntryId,
      limit: effectiveLimit,
      skip: skipUsed,
    });

    const defaultLocale =
      localeMode === "defaultOnly"
        ? await this.contentRepository.getDefaultLocaleCode(input.spaceId, input.environmentId)
        : undefined;

    this.log.info("unlink.batch.start", {
      targetEntryId: input.targetEntryId,
      totalLinkedEntries,
      dryRun,
      publishStrategy,
      localeMode,
      skipUsed,
      batchSizeUsed,
      pageItems: page.items.length,
    });

    const results: EntryUnlinkResult[] = [];
    let processedInThisBatch = 0;

    for (const item of page.items) {
      const ctId = item.sys.contentType.sys.id;
      if (input.contentTypeFilter?.length && !input.contentTypeFilter.includes(ctId)) {
        continue;
      }

      processedInThisBatch += 1;
      const one = await this.processOneEntry({
        spaceId: input.spaceId,
        environmentId: input.environmentId,
        targetEntryId: input.targetEntryId,
        dryRun,
        publishStrategy,
        localeMode,
        defaultLocale,
        listItem: item,
      });
      results.push(one);
    }

    const nextSkip = skipUsed + page.items.length;
    const hasMore = nextSkip < totalLinkedEntries;
    const remainingEstimate = Math.max(0, totalLinkedEntries - nextSkip);
    const stats = aggregateUnlinkStats(results);

    const summary: RemoveIncomingLinksResult = {
      targetEntryId: input.targetEntryId,
      totalLinkedEntries,
      batchSizeUsed,
      skipUsed,
      processedInThisBatch,
      nextSkip,
      hasMore,
      remainingEstimate,
      changed: stats.changed,
      unchanged: stats.unchanged,
      failed: stats.failed,
      results,
    };

    this.log.info("unlink.batch.done", {
      targetEntryId: input.targetEntryId,
      processedInThisBatch,
      nextSkip,
      hasMore,
      changed: stats.changed,
      unchanged: stats.unchanged,
      failed: stats.failed,
    });

    return summary;
  }

  private async processOneEntry(params: {
    spaceId: string;
    environmentId: string;
    targetEntryId: string;
    dryRun: boolean;
    publishStrategy: PublishStrategy;
    localeMode: LocaleMode;
    defaultLocale?: string;
    listItem: RepositoryEntry;
  }): Promise<EntryUnlinkResult> {
    const entryId = params.listItem.sys.id;
    const contentTypeId = params.listItem.sys.contentType.sys.id;

    try {
      const entry = await this.contentRepository.getEntry({
        spaceId: params.spaceId,
        environmentId: params.environmentId,
        entryId,
      });
      const fields = structuredClone(entry.fields) as Record<string, Record<string, unknown>>;

      let removedTotal = 0;

      for (const fieldId of Object.keys(fields)) {
        const localeMap = fields[fieldId];
        if (!localeMap || typeof localeMap !== "object") continue;

        const locales =
          params.localeMode === "defaultOnly" && params.defaultLocale
            ? Object.keys(localeMap).filter((l) => l === params.defaultLocale)
            : Object.keys(localeMap);

        for (const loc of locales) {
          const raw = localeMap[loc];
          const { cleaned, removedCount, changed } = removeTargetReferencesDeep(raw, params.targetEntryId);
          removedTotal += removedCount;
          if (changed) {
            localeMap[loc] = cleaned as typeof raw;
          }
        }
      }

      const original = entry.fields as Record<string, Record<string, unknown>>;
      const fieldsMutated = hasEntryChanged(original, fields);

      if (!fieldsMutated) {
        return {
          entryId,
          contentTypeId,
          status: "unchanged",
          removedCount: 0,
        };
      }

      if (params.dryRun) {
        this.log.info("unlink.entry.would_change", { entryId, removedCount: removedTotal });
        return {
          entryId,
          contentTypeId,
          status: "would-change",
          removedCount: removedTotal,
        };
      }

      const wasPublished = isEntryPublished(entry);

      await this.contentRepository.updateEntry({
        spaceId: params.spaceId,
        environmentId: params.environmentId,
        entryId,
        fields,
        version: entry.sys.version,
      });

      if (params.publishStrategy === "republish-if-published" && wasPublished) {
        await this.contentRepository.publishEntry({
          spaceId: params.spaceId,
          environmentId: params.environmentId,
          entryId,
        });
      }

      this.log.info("unlink.entry.changed", { entryId, removedCount: removedTotal, republished: wasPublished });

      return {
        entryId,
        contentTypeId,
        status: "changed",
        removedCount: removedTotal,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error("unlink.entry.failed", { entryId, message });
      return {
        entryId,
        contentTypeId,
        status: "failed",
        removedCount: 0,
        message,
      };
    }
  }
}
