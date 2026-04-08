import { describe, expect, it, vi } from "vitest";
import { removeIncomingLinksAppAction } from "./removeIncomingLinksAppAction.js";
import type { RemoveIncomingLinksService } from "../services/RemoveIncomingLinksService.js";

describe("removeIncomingLinksAppAction", () => {
  it("maps service output to App Action contract (drops targetEntryId)", async () => {
    const unlink = {
      removeIncomingLinks: vi.fn().mockResolvedValue({
        targetEntryId: "t1",
        totalLinkedEntries: 5,
        scanned: 2,
        changed: 1,
        unchanged: 1,
        failed: 0,
        results: [],
      }),
    } as unknown as RemoveIncomingLinksService;

    const out = await removeIncomingLinksAppAction(
      { spaceId: "s", environmentId: "e" },
      { targetEntryId: "t1", dryRun: true },
      unlink,
    );

    expect(unlink.removeIncomingLinks).toHaveBeenCalledWith({
      spaceId: "s",
      environmentId: "e",
      targetEntryId: "t1",
      dryRun: true,
      publishStrategy: undefined,
    });
    expect(out).toEqual({
      totalLinkedEntries: 5,
      scanned: 2,
      changed: 1,
      unchanged: 1,
      failed: 0,
      results: [],
    });
    expect(out).not.toHaveProperty("targetEntryId");
  });
});
