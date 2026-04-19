import type { RepositoryEntry } from "./types.js";

export type GetLinkedEntriesInput = {
  spaceId: string;
  environmentId: string;
  /** Target entry id for CMA `links_to_entry`. */
  entryId: string;
  limit: number;
  skip: number;
};

export type GetLinkedEntriesResult = {
  total: number;
  items: RepositoryEntry[];
  limit: number;
  skip: number;
};

/**
 * Port for CMA-backed persistence. Domain services depend only on this interface.
 */
export interface ContentRepository {
  getDefaultLocaleCode(spaceId: string, environmentId: string): Promise<string>;

  getLinkedEntries(input: GetLinkedEntriesInput): Promise<GetLinkedEntriesResult>;

  getEntry(input: {
    spaceId: string;
    environmentId: string;
    entryId: string;
  }): Promise<RepositoryEntry>;

  updateEntry(input: {
    spaceId: string;
    environmentId: string;
    entryId: string;
    fields: Record<string, Record<string, unknown>>;
    /** Expected current version for optimistic concurrency (stale → CMA rejects update). */
    version: number;
  }): Promise<RepositoryEntry>;

  /**
   * Publishes the latest draft for the entry (fetches current version immediately before publish).
   */
  publishEntry(input: {
    spaceId: string;
    environmentId: string;
    entryId: string;
  }): Promise<RepositoryEntry>;
}
