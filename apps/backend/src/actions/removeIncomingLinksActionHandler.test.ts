import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "../errors.js";
import type { RemoveIncomingLinksService } from "../services/RemoveIncomingLinksService.js";
import { removeIncomingLinksActionHandler } from "./removeIncomingLinksActionHandler.js";

describe("removeIncomingLinksActionHandler", () => {
  it("validates required ids", async () => {
    const unlink = { removeIncomingLinks: vi.fn() } as unknown as RemoveIncomingLinksService;
    await expect(
      removeIncomingLinksActionHandler({ spaceId: "", environmentId: "e", targetEntryId: "t" }, unlink),
    ).rejects.toThrow(ValidationError);
    expect(unlink.removeIncomingLinks).not.toHaveBeenCalled();
  });

  it("delegates to service after trim", async () => {
    const unlink = {
      removeIncomingLinks: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as RemoveIncomingLinksService;
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
    expect(unlink.removeIncomingLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: "s",
        environmentId: "master",
        targetEntryId: "abc",
        dryRun: true,
      }),
    );
  });
});
