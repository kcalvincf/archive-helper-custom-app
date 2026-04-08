import { describe, expect, it, vi } from "vitest";
import type { EntryProps } from "contentful-management";
import { ContentfulEntryService } from "../contentful/ContentfulEntryService.js";
import { InboundReferenceService } from "./InboundReferenceService.js";
import { RemoveIncomingLinksService } from "./RemoveIncomingLinksService.js";

const spaceId = "space";
const environmentId = "master";
const targetId = "targetEntry";

function mockEntry(overrides: Partial<EntryProps> = {}): EntryProps {
  return {
    sys: {
      id: "linked-1",
      type: "Entry",
      version: 3,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      space: { sys: { type: "Link", linkType: "Space", id: spaceId } },
      environment: { sys: { type: "Link", linkType: "Environment", id: environmentId } },
      contentType: { sys: { type: "Link", linkType: "ContentType", id: "post" } },
      automationTags: [],
      publishedVersion: 2,
      ...overrides.sys,
    },
    fields: {
      ref: { "en-US": { sys: { type: "Link", linkType: "Entry", id: targetId } } },
      ...overrides.fields,
    },
    metadata: { tags: [] },
  } as EntryProps;
}

describe("InboundReferenceService", () => {
  it("returns total from CMA and optional preview", async () => {
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 42,
      items: [
        mockEntry({
          sys: {
            id: "a",
            type: "Entry",
            version: 1,
            createdAt: "",
            updatedAt: "",
            space: { sys: { type: "Link", linkType: "Space", id: spaceId } },
            environment: { sys: { type: "Link", linkType: "Environment", id: environmentId } },
            contentType: { sys: { type: "Link", linkType: "ContentType", id: "ct" } },
            automationTags: [],
          },
        }),
      ],
      limit: 3,
      skip: 0,
    });

    const entries = { getLinkedEntriesPage } as unknown as ContentfulEntryService;
    const svc = new InboundReferenceService(entries);

    const r = await svc.getLinkedEntryCount({
      spaceId,
      environmentId,
      entryId: targetId,
      previewSize: 3,
    });

    expect(r.totalLinkedEntries).toBe(42);
    expect(r.preview).toHaveLength(1);
    expect(r.request).toEqual({ limit: 3, skip: 0 });
    expect(getLinkedEntriesPage).toHaveBeenCalledWith(
      expect.objectContaining({
        linksToEntry: targetId,
        limit: 3,
      }),
    );
  });
});

describe("RemoveIncomingLinksService", () => {
  it("dry-run does not call update or publish", async () => {
    const entry = mockEntry();
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 1,
      items: [entry],
      limit: 100,
      skip: 0,
    });
    const getEntry = vi.fn().mockResolvedValue(entry);
    const updateEntryFields = vi.fn();
    const publishEntry = vi.fn();

    const entries = {
      getLinkedEntriesPage,
      getEntry,
      updateEntryFields,
      publishEntry,
    } as unknown as ContentfulEntryService;

    const svc = new RemoveIncomingLinksService(entries);
    const result = await svc.removeIncomingLinks({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      dryRun: true,
    });

    expect(result.scanned).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.results[0].status).toBe("would-change");
    expect(result.results[0].removedCount).toBeGreaterThan(0);
    expect(updateEntryFields).not.toHaveBeenCalled();
    expect(publishEntry).not.toHaveBeenCalled();
  });

  it("update flow calls update when fields change", async () => {
    const entry = mockEntry();
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 1,
      items: [entry],
      limit: 100,
      skip: 0,
    });
    const getEntry = vi.fn().mockResolvedValue(entry);
    const updateEntryFields = vi.fn().mockResolvedValue({ ...entry, sys: { ...entry.sys, version: 4 } });
    const publishEntry = vi.fn();

    const entries = {
      getLinkedEntriesPage,
      getEntry,
      updateEntryFields,
      publishEntry,
    } as unknown as ContentfulEntryService;

    const svc = new RemoveIncomingLinksService(entries);
    const result = await svc.removeIncomingLinks({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      dryRun: false,
      publishStrategy: "none",
    });

    expect(updateEntryFields).toHaveBeenCalledTimes(1);
    expect(publishEntry).not.toHaveBeenCalled();
    expect(result.results[0].status).toBe("changed");
  });

  it("does not publish when entry was never published", async () => {
    const entry = mockEntry();
    const draftSys = { ...entry.sys, publishedVersion: undefined };
    const draft = { ...entry, sys: draftSys };
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 1,
      items: [draft],
      limit: 100,
      skip: 0,
    });
    const getEntry = vi.fn().mockResolvedValue(draft);
    const updateEntryFields = vi.fn().mockResolvedValue(draft);
    const publishEntry = vi.fn();

    const entries = {
      getLinkedEntriesPage,
      getEntry,
      updateEntryFields,
      publishEntry,
    } as unknown as ContentfulEntryService;

    const svc = new RemoveIncomingLinksService(entries);
    await svc.removeIncomingLinks({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      publishStrategy: "republish-if-published",
    });

    expect(publishEntry).not.toHaveBeenCalled();
  });

  it("republish-if-published calls publish after update", async () => {
    const entry = mockEntry();
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 1,
      items: [entry],
      limit: 100,
      skip: 0,
    });
    const getEntry = vi.fn().mockResolvedValue(entry);
    const updateEntryFields = vi.fn().mockResolvedValue(entry);
    const publishEntry = vi.fn().mockResolvedValue(entry);

    const entries = {
      getLinkedEntriesPage,
      getEntry,
      updateEntryFields,
      publishEntry,
    } as unknown as ContentfulEntryService;

    const svc = new RemoveIncomingLinksService(entries);
    await svc.removeIncomingLinks({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      dryRun: false,
      publishStrategy: "republish-if-published",
    });

    expect(publishEntry).toHaveBeenCalledTimes(1);
  });

  it("partial failure: one entry fails without stopping batch", async () => {
    const e1 = mockEntry({ sys: { ...mockEntry().sys, id: "ok" } });
    const e2 = mockEntry({ sys: { ...mockEntry().sys, id: "bad" } });
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 2,
      items: [e1, e2],
      limit: 100,
      skip: 0,
    });
    const getEntry = vi.fn().mockImplementation((_s, _e, id: string) => {
      if (id === "bad") return Promise.reject(new Error("version mismatch"));
      return Promise.resolve(e1);
    });
    const updateEntryFields = vi.fn().mockResolvedValue(e1);

    const entries = {
      getLinkedEntriesPage,
      getEntry,
      updateEntryFields,
      publishEntry: vi.fn(),
    } as unknown as ContentfulEntryService;

    const svc = new RemoveIncomingLinksService(entries);
    const result = await svc.removeIncomingLinks({
      spaceId,
      environmentId,
      targetEntryId: targetId,
    });

    expect(result.failed).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.results.find((r) => r.entryId === "bad")?.status).toBe("failed");
  });

  it("zero inbound links yields empty results", async () => {
    const getLinkedEntriesPage = vi.fn().mockResolvedValue({
      total: 0,
      items: [],
      limit: 100,
      skip: 0,
    });
    const entries = {
      getLinkedEntriesPage,
      getEntry: vi.fn(),
      updateEntryFields: vi.fn(),
      publishEntry: vi.fn(),
    } as unknown as ContentfulEntryService;

    const svc = new RemoveIncomingLinksService(entries);
    const result = await svc.removeIncomingLinks({
      spaceId,
      environmentId,
      targetEntryId: targetId,
    });

    expect(result.totalLinkedEntries).toBe(0);
    expect(result.scanned).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});
