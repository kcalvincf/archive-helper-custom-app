import { describe, expect, it, vi } from "vitest";
import type { ContentRepository } from "@archive-helper/contentful-adapters";
import type { RepositoryEntry } from "@archive-helper/contentful-adapters";
import { InboundReferenceService } from "./inboundReferenceService.js";
import { RemoveIncomingLinksBatchService } from "./removeIncomingLinksBatchService.js";
import { runRemoveIncomingLinksUntilComplete } from "./orchestrateUnlinkBatches.js";

const spaceId = "space";
const environmentId = "master";
const targetId = "targetEntry";

function mockEntry(overrides: Partial<RepositoryEntry> = {}): RepositoryEntry {
  return {
    sys: {
      id: "linked-1",
      type: "Entry",
      version: 3,
      publishedVersion: 2,
      contentType: { sys: { type: "Link", linkType: "ContentType", id: "post" } },
      ...overrides.sys,
    },
    fields: {
      ref: { "en-US": { sys: { type: "Link", linkType: "Entry", id: targetId } } },
      ...overrides.fields,
    },
    metadata: { tags: [] },
    ...overrides,
  };
}

describe("InboundReferenceService", () => {
  it("returns total from CMA and optional preview", async () => {
    const getLinkedEntries = vi.fn().mockResolvedValue({
      total: 42,
      items: [
        mockEntry({
          sys: {
            id: "a",
            type: "Entry",
            version: 1,
            publishedVersion: undefined,
            contentType: { sys: { type: "Link", linkType: "ContentType", id: "ct" } },
          },
        }),
      ],
      limit: 3,
      skip: 0,
    });

    const repository = {
      getLinkedEntries,
      getDefaultLocaleCode: vi.fn(),
      getEntry: vi.fn(),
      updateEntry: vi.fn(),
      publishEntry: vi.fn(),
    } as unknown as ContentRepository;
    const svc = new InboundReferenceService(repository);

    const r = await svc.getLinkedEntryCount({
      spaceId,
      environmentId,
      entryId: targetId,
      previewSize: 3,
    });

    expect(r.totalLinkedEntries).toBe(42);
    expect(r.preview).toHaveLength(1);
    expect(getLinkedEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        entryId: targetId,
        limit: 3,
      }),
    );
  });

  it("getCount matches total without request metadata requirement", async () => {
    const getLinkedEntries = vi.fn().mockResolvedValue({
      total: 100,
      items: [],
      limit: 1,
      skip: 0,
    });
    const repository = {
      getLinkedEntries,
      getDefaultLocaleCode: vi.fn(),
      getEntry: vi.fn(),
      updateEntry: vi.fn(),
      publishEntry: vi.fn(),
    } as unknown as ContentRepository;
    const svc = new InboundReferenceService(repository);
    const c = await svc.getCount({ spaceId, environmentId, entryId: targetId });
    expect(c.totalLinkedEntries).toBe(100);
    expect(c.entryId).toBe(targetId);
  });
});

describe("RemoveIncomingLinksBatchService", () => {
  it("dry-run does not call update or publish", async () => {
    const entry = mockEntry();
    const getLinkedEntries = vi
      .fn()
      .mockResolvedValueOnce({ total: 1, items: [entry], limit: 1, skip: 0 })
      .mockResolvedValueOnce({ total: 1, items: [entry], limit: 20, skip: 0 });
    const getEntry = vi.fn().mockResolvedValue(entry);
    const updateEntry = vi.fn();
    const publishEntry = vi.fn();

    const repository = {
      getLinkedEntries,
      getEntry,
      updateEntry,
      publishEntry,
      getDefaultLocaleCode: vi.fn().mockResolvedValue("en-US"),
    } as unknown as ContentRepository;

    const svc = new RemoveIncomingLinksBatchService(repository);
    const result = await svc.execute({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      batchSize: 20,
      dryRun: true,
    });

    expect(result.processedInThisBatch).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.results[0].status).toBe("would-change");
    expect(result.results[0].removedCount).toBeGreaterThan(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextSkip).toBe(1);
    expect(updateEntry).not.toHaveBeenCalled();
    expect(publishEntry).not.toHaveBeenCalled();
  });

  it("update flow calls update when fields change", async () => {
    const entry = mockEntry();
    const getLinkedEntries = vi
      .fn()
      .mockResolvedValueOnce({ total: 1, items: [entry], limit: 1, skip: 0 })
      .mockResolvedValueOnce({ total: 1, items: [entry], limit: 20, skip: 0 });
    const getEntry = vi.fn().mockResolvedValue(entry);
    const updateEntry = vi.fn().mockResolvedValue({ ...entry, sys: { ...entry.sys, version: 4 } });
    const publishEntry = vi.fn();

    const repository = {
      getLinkedEntries,
      getEntry,
      updateEntry,
      publishEntry,
      getDefaultLocaleCode: vi.fn().mockResolvedValue("en-US"),
    } as unknown as ContentRepository;

    const svc = new RemoveIncomingLinksBatchService(repository);
    const result = await svc.execute({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      batchSize: 20,
      dryRun: false,
      publishStrategy: "none",
    });

    expect(updateEntry).toHaveBeenCalledTimes(1);
    expect(publishEntry).not.toHaveBeenCalled();
    expect(result.results[0].status).toBe("changed");
  });

  it("respects batchSize and skip for one batch only", async () => {
    const e0 = mockEntry({ sys: { ...mockEntry().sys, id: "e0" } });
    const e1 = mockEntry({ sys: { ...mockEntry().sys, id: "e1" } });
    const e2 = mockEntry({ sys: { ...mockEntry().sys, id: "e2" } });
    const getLinkedEntries = vi
      .fn()
      .mockResolvedValueOnce({ total: 5, items: [e0], limit: 1, skip: 0 })
      .mockResolvedValueOnce({ total: 5, items: [e1, e2], limit: 2, skip: 2 });
    const getEntry = vi.fn().mockImplementation((input: { entryId: string }) => {
      if (input.entryId === "e1") return Promise.resolve(e1);
      return Promise.resolve(e2);
    });
    const updateEntry = vi.fn().mockImplementation((a: { entryId: string }) => Promise.resolve(a));

    const repository = {
      getLinkedEntries,
      getEntry,
      updateEntry,
      publishEntry: vi.fn(),
      getDefaultLocaleCode: vi.fn().mockResolvedValue("en-US"),
    } as unknown as ContentRepository;

    const svc = new RemoveIncomingLinksBatchService(repository);
    const result = await svc.execute({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      batchSize: 2,
      skip: 2,
      dryRun: true,
    });

    expect(result.processedInThisBatch).toBe(2);
    expect(result.nextSkip).toBe(4);
    expect(result.hasMore).toBe(true);
    expect(result.remainingEstimate).toBe(1);
    expect(getLinkedEntries).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 2, limit: 2 }),
    );
  });

  it("partial failure: one entry fails without stopping batch", async () => {
    const e1 = mockEntry({ sys: { ...mockEntry().sys, id: "ok" } });
    const e2 = mockEntry({ sys: { ...mockEntry().sys, id: "bad" } });
    const getLinkedEntries = vi
      .fn()
      .mockResolvedValueOnce({ total: 2, items: [e1], limit: 1, skip: 0 })
      .mockResolvedValueOnce({ total: 2, items: [e1, e2], limit: 20, skip: 0 });
    const getEntry = vi.fn().mockImplementation((input: { entryId: string }) => {
      if (input.entryId === "bad") return Promise.reject(new Error("version mismatch"));
      return Promise.resolve(e1);
    });
    const updateEntry = vi.fn().mockResolvedValue(e1);

    const repository = {
      getLinkedEntries,
      getEntry,
      updateEntry,
      publishEntry: vi.fn(),
      getDefaultLocaleCode: vi.fn().mockResolvedValue("en-US"),
    } as unknown as ContentRepository;

    const svc = new RemoveIncomingLinksBatchService(repository);
    const result = await svc.execute({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      batchSize: 20,
    });

    expect(result.failed).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.results.find((r) => r.entryId === "bad")?.status).toBe("failed");
  });

  it("zero inbound links yields empty results", async () => {
    const getLinkedEntries = vi.fn().mockResolvedValue({
      total: 0,
      items: [],
      limit: 1,
      skip: 0,
    });
    const repository = {
      getLinkedEntries,
      getEntry: vi.fn(),
      updateEntry: vi.fn(),
      publishEntry: vi.fn(),
      getDefaultLocaleCode: vi.fn().mockResolvedValue("en-US"),
    } as unknown as ContentRepository;

    const svc = new RemoveIncomingLinksBatchService(repository);
    const result = await svc.execute({
      spaceId,
      environmentId,
      targetEntryId: targetId,
      batchSize: 20,
    });

    expect(result.totalLinkedEntries).toBe(0);
    expect(result.processedInThisBatch).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

describe("runRemoveIncomingLinksUntilComplete", () => {
  it("chains batches until hasMore is false", async () => {
    const batches = [
      {
        targetEntryId: targetId,
        totalLinkedEntries: 3,
        batchSizeUsed: 2,
        skipUsed: 0,
        processedInThisBatch: 2,
        nextSkip: 2,
        hasMore: true,
        remainingEstimate: 1,
        changed: 2,
        unchanged: 0,
        failed: 0,
        results: [],
      },
      {
        targetEntryId: targetId,
        totalLinkedEntries: 3,
        batchSizeUsed: 2,
        skipUsed: 2,
        processedInThisBatch: 1,
        nextSkip: 3,
        hasMore: false,
        remainingEstimate: 0,
        changed: 1,
        unchanged: 0,
        failed: 0,
        results: [],
      },
    ];
    const execute = vi.fn().mockImplementation(async (input: { skip?: number }) => {
      return input.skip ? batches[1]! : batches[0]!;
    });

    const { rounds, final } = await runRemoveIncomingLinksUntilComplete(execute, {
      spaceId,
      environmentId,
      targetEntryId: targetId,
      batchSize: 2,
    });

    expect(rounds).toHaveLength(2);
    expect(final.hasMore).toBe(false);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
