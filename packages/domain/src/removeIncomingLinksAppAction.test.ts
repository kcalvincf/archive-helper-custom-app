import { describe, expect, it, vi } from "vitest";
import type { RemoveIncomingLinksBatchService } from "./removeIncomingLinksBatchService.js";
import { removeIncomingLinksAppAction } from "./removeIncomingLinksAppAction.js";

describe("removeIncomingLinksAppAction", () => {
  it("returns full batch result from the service", async () => {
    const full = {
      targetEntryId: "t1",
      totalLinkedEntries: 5,
      batchSizeUsed: 20,
      skipUsed: 0,
      processedInThisBatch: 2,
      nextSkip: 2,
      hasMore: true,
      remainingEstimate: 3,
      changed: 1,
      unchanged: 1,
      failed: 0,
      results: [],
    };
    const unlink = {
      execute: vi.fn().mockResolvedValue(full),
    } as unknown as RemoveIncomingLinksBatchService;

    const out = await removeIncomingLinksAppAction(
      { spaceId: "s", environmentId: "e" },
      { targetEntryId: "t1", dryRun: true },
      unlink,
    );

    expect(unlink.execute).toHaveBeenCalledWith({
      spaceId: "s",
      environmentId: "e",
      targetEntryId: "t1",
      batchSize: 20,
      skip: undefined,
      dryRun: true,
      publishStrategy: undefined,
      localeMode: undefined,
      contentTypeFilter: undefined,
    });
    expect(out).toEqual(full);
  });
});
