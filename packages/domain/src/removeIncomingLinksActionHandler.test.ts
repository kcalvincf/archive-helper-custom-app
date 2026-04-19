import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "./validation.js";
import type { RemoveIncomingLinksBatchService } from "./removeIncomingLinksBatchService.js";
import { removeIncomingLinksActionHandler } from "./removeIncomingLinksActionHandler.js";

describe("removeIncomingLinksActionHandler", () => {
  it("validates required ids", async () => {
    const unlink = { execute: vi.fn() } as unknown as RemoveIncomingLinksBatchService;
    await expect(
      removeIncomingLinksActionHandler({ spaceId: "", environmentId: "e", targetEntryId: "t" }, unlink),
    ).rejects.toThrow(ValidationError);
    expect(unlink.execute).not.toHaveBeenCalled();
  });

  it("delegates to service after trim", async () => {
    const unlink = {
      execute: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as RemoveIncomingLinksBatchService;
    const out = await removeIncomingLinksActionHandler(
      {
        spaceId: "  s  ",
        environmentId: " master ",
        targetEntryId: " abc ",
        dryRun: true,
      },
      unlink,
    );
    expect(out).toEqual({ ok: true });
    expect(unlink.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: "s",
        environmentId: "master",
        targetEntryId: "abc",
        dryRun: true,
        batchSize: 20,
      }),
    );
  });
});
