import type { EntryProps, PlainClientAPI } from "contentful-management";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";
import { withRetry } from "./retry.js";

export type LinkedEntriesPage = {
  total: number;
  items: EntryProps[];
  limit: number;
  skip: number;
};

/**
 * CMA access via the plain client (suitable for serverless and explicit request/response typing).
 */
export class ContentfulEntryService {
  private readonly log: Logger;

  constructor(
    private readonly client: PlainClientAPI,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger("ContentfulEntryService");
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

  async getLinkedEntriesPage(params: {
    spaceId: string;
    environmentId: string;
    linksToEntry: string;
    limit: number;
    skip: number;
  }): Promise<LinkedEntriesPage> {
    const res = await withRetry(
      () =>
        this.client.entry.getMany({
          spaceId: params.spaceId,
          environmentId: params.environmentId,
          query: {
            links_to_entry: params.linksToEntry,
            limit: params.limit,
            skip: params.skip,
          },
        }),
      { logger: this.log, operation: "entry.getMany.links_to_entry" },
    );
    return {
      total: res.total,
      items: res.items,
      limit: res.limit,
      skip: res.skip,
    };
  }

  async getEntry(spaceId: string, environmentId: string, entryId: string): Promise<EntryProps> {
    return withRetry(
      () =>
        this.client.entry.get({
          spaceId,
          environmentId,
          entryId,
        }),
      { logger: this.log, operation: "entry.get" },
    );
  }

  async updateEntryFields(params: {
    spaceId: string;
    environmentId: string;
    entryId: string;
    fields: Record<string, Record<string, unknown>>;
  }): Promise<EntryProps> {
    const current = await this.getEntry(params.spaceId, params.environmentId, params.entryId);
    const updated: EntryProps = {
      ...current,
      fields: params.fields as EntryProps["fields"],
    };
    return withRetry(
      () =>
        this.client.entry.update(
          {
            spaceId: params.spaceId,
            environmentId: params.environmentId,
            entryId: params.entryId,
          },
          updated,
        ),
      { logger: this.log, operation: "entry.update" },
    );
  }

  async publishEntry(spaceId: string, environmentId: string, entryId: string): Promise<EntryProps> {
    const current = await this.getEntry(spaceId, environmentId, entryId);
    return withRetry(
      () =>
        this.client.entry.publish(
          {
            spaceId,
            environmentId,
            entryId,
          },
          current,
        ),
      { logger: this.log, operation: "entry.publish" },
    );
  }
}
