import type { RepositoryEntry } from "@archive-helper/contentful-adapters";

export function isEntryPublished(entry: RepositoryEntry): boolean {
  return entry.sys.publishedVersion != null;
}
