/**
 * Minimal entry shape used by domain services (no SDK types in domain).
 */
export type RepositoryEntry = {
  sys: {
    id: string;
    type: "Entry";
    version: number;
    publishedVersion?: number;
    contentType: { sys: { type: "Link"; linkType: "ContentType"; id: string } };
  };
  fields: Record<string, Record<string, unknown>>;
  metadata?: { tags: unknown[] };
};
