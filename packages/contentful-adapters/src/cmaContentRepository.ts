import type { EntryProps, PlainClientAPI } from "contentful-management";
import type { AdapterLogger } from "./logging.js";
import { noopAdapterLogger } from "./logging.js";
import type { ContentRepository, GetLinkedEntriesInput, GetLinkedEntriesResult } from "./contentRepository.js";
import { withRetry } from "./retry.js";
import type { RepositoryEntry } from "./types.js";

function toRepositoryEntry(entry: EntryProps): RepositoryEntry {
  return {
    sys: {
      id: entry.sys.id,
      type: "Entry",
      version: entry.sys.version,
      publishedVersion: entry.sys.publishedVersion,
      contentType: { sys: { type: "Link", linkType: "ContentType", id: entry.sys.contentType.sys.id } },
    },
    fields: entry.fields as Record<string, Record<string, unknown>>,
    metadata: entry.metadata,
  };
}

/**
 * Plain CMA client implementation shared by standalone Node and Contentful Functions runtimes.
 */
export class CmaContentRepository implements ContentRepository {
  private readonly log: AdapterLogger;

  constructor(
    private readonly client: PlainClientAPI,
    logger?: AdapterLogger,
  ) {
    this.log = logger ?? noopAdapterLogger;
  }

  async getDefaultLocaleCode(spaceId: string, environmentId: string): Promise<string> {
    const locales = await withRetry(
      () =>
        this.client.locale.getMany({
          spaceId,
          environmentId,
          query: { limit: 100 },
        }),
      { logger: this.log, operation: "locale.getMany" },
    );
    const def = locales.items.find((l) => l.default);
    const code = def?.code ?? locales.items[0]?.code;
    if (!code) {
      throw new Error("Could not resolve default locale for environment");
    }
    return code;
  }

  async getLinkedEntries(input: GetLinkedEntriesInput): Promise<GetLinkedEntriesResult> {
    const res = await withRetry(
      () =>
        this.client.entry.getMany({
          spaceId: input.spaceId,
          environmentId: input.environmentId,
          query: {
            links_to_entry: input.entryId,
            limit: input.limit,
            skip: input.skip,
          },
        }),
      { logger: this.log, operation: "entry.getMany.links_to_entry" },
    );
    return {
      total: res.total,
      items: res.items.map(toRepositoryEntry),
      limit: res.limit,
      skip: res.skip,
    };
  }

  async getEntry(input: {
    spaceId: string;
    environmentId: string;
    entryId: string;
  }): Promise<RepositoryEntry> {
    const entry = await withRetry(
      () =>
        this.client.entry.get({
          spaceId: input.spaceId,
          environmentId: input.environmentId,
          entryId: input.entryId,
        }),
      { logger: this.log, operation: "entry.get" },
    );
    return toRepositoryEntry(entry);
  }

  async updateEntry(input: {
    spaceId: string;
    environmentId: string;
    entryId: string;
    fields: Record<string, Record<string, unknown>>;
    version: number;
  }): Promise<RepositoryEntry> {
    const asProps = await withRetry(
      () =>
        this.client.entry.get({
          spaceId: input.spaceId,
          environmentId: input.environmentId,
          entryId: input.entryId,
        }),
      { logger: this.log, operation: "entry.get.beforeUpdate" },
    );
    if (asProps.sys.version !== input.version) {
      throw new Error(
        `Version mismatch for entry ${input.entryId}: expected ${input.version}, got ${asProps.sys.version}`,
      );
    }
    const updated: EntryProps = {
      ...asProps,
      fields: input.fields as EntryProps["fields"],
    };
    const saved = await withRetry(
      () =>
        this.client.entry.update(
          {
            spaceId: input.spaceId,
            environmentId: input.environmentId,
            entryId: input.entryId,
          },
          updated,
        ),
      { logger: this.log, operation: "entry.update" },
    );
    return toRepositoryEntry(saved);
  }

  async publishEntry(input: {
    spaceId: string;
    environmentId: string;
    entryId: string;
  }): Promise<RepositoryEntry> {
    const current = await withRetry(
      () =>
        this.client.entry.get({
          spaceId: input.spaceId,
          environmentId: input.environmentId,
          entryId: input.entryId,
        }),
      { logger: this.log, operation: "entry.get.beforePublish" },
    );
    const published = await withRetry(
      () =>
        this.client.entry.publish(
          {
            spaceId: input.spaceId,
            environmentId: input.environmentId,
            entryId: input.entryId,
          },
          current,
        ),
      { logger: this.log, operation: "entry.publish" },
    );
    return toRepositoryEntry(published);
  }
}
