import type { EntryProps } from "contentful-management";
import contentfulManagement from "contentful-management";
import type {
  EntryUnlinkResult,
  LocaleMode,
  PublishStrategy,
  RemoveIncomingLinksInput,
  RemoveIncomingLinksResult,
} from "@archive-helper/shared-types";
import { hasEntryChanged, removeTargetReferencesDeep } from "@archive-helper/utils";
import type { ContentfulEntryService } from "../contentful/ContentfulEntryService.js";
import { createLogger, type Logger } from "../utils/logger.js";
import { aggregateUnlinkStats } from "../utils/resultSummary.js";

const PAGE_SIZE = 100;

/**
 * Orchestrates paginated discovery of inbound links, recursive field cleaning, updates, and optional republish.
 */
export class RemoveIncomingLinksService {
  private readonly log: Logger;

  constructor(
    private readonly entries: ContentfulEntryService,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger("RemoveIncomingLinksService");
  }

  async removeIncomingLinks(input: RemoveIncomingLinksInput): Promise<RemoveIncomingLinksResult> {
    const dryRun = input.dryRun ?? false;
    const publishStrategy: PublishStrategy = input.publishStrategy ?? "none";
    const localeMode: LocaleMode = input.localeMode ?? "all";
    const skip = input.skip ?? 0;
    const limit = input.limit;

    const head = await this.entries.getLinkedEntriesPage({
      spaceId: input.spaceId,
      environmentId: input.environmentId,
      linksToEntry: input.targetEntryId,
      limit: 1,
      skip: 0,
    });
    const totalLinkedEntries = head.total;

    const defaultLocale =
      localeMode === "defaultOnly"
        ? await this.entries.getDefaultLocaleCode(input.spaceId, input.environmentId)
        : undefined;

    this.log.info("unlink.start", {
      targetEntryId: input.targetEntryId,
      totalLinkedEntries,
      dryRun,
      publishStrategy,
      localeMode,
      skip,
      limit: limit ?? "none",
    });

    const results: EntryUnlinkResult[] = [];
    let scanned = 0;
    let pageSkip = 0;
    let globalCursor = 0;

    outer: while (true) {
      const page = await this.entries.getLinkedEntriesPage({
        spaceId: input.spaceId,
        environmentId: input.environmentId,
        linksToEntry: input.targetEntryId,
        limit: PAGE_SIZE,
        skip: pageSkip,
      });

      if (page.items.length === 0) break;

      for (const item of page.items) {
        const streamIndex = globalCursor++;
        if (streamIndex < skip) continue;

        const ctId = item.sys.contentType.sys.id;
        if (input.contentTypeFilter?.length && !input.contentTypeFilter.includes(ctId)) {
          continue;
        }

        if (limit !== undefined && scanned >= limit) {
          break outer;
        }

        scanned += 1;
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

      pageSkip += page.items.length;
      if (page.items.length < PAGE_SIZE) break;
    }

    const stats = aggregateUnlinkStats(results);
    const summary: RemoveIncomingLinksResult = {
      targetEntryId: input.targetEntryId,
      totalLinkedEntries,
      scanned,
      changed: stats.changed,
      unchanged: stats.unchanged,
      failed: stats.failed,
      results,
    };

    this.log.info("unlink.complete", {
      targetEntryId: input.targetEntryId,
      totalLinkedEntries,
      scanned,
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
    listItem: EntryProps;
  }): Promise<EntryUnlinkResult> {
    const entryId = params.listItem.sys.id;
    const contentTypeId = params.listItem.sys.contentType.sys.id;

    try {
      const entry = await this.entries.getEntry(params.spaceId, params.environmentId, entryId);
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

      const wasPublished = contentfulManagement.isPublished(entry);

      await this.entries.updateEntryFields({
        spaceId: params.spaceId,
        environmentId: params.environmentId,
        entryId,
        fields,
      });

      if (params.publishStrategy === "republish-if-published" && wasPublished) {
        await this.entries.publishEntry(params.spaceId, params.environmentId, entryId);
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
