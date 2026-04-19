import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "./validation.js";
import type { InboundReferenceService } from "./inboundReferenceService.js";
import { getIncomingLinksCountActionHandler } from "./getIncomingLinksCountActionHandler.js";

describe("getIncomingLinksCountActionHandler", () => {
  it("validates ids", async () => {
    const inbound = { getCount: vi.fn() } as unknown as InboundReferenceService;
    await expect(
      getIncomingLinksCountActionHandler(
        { spaceId: "", environmentId: "e", entryId: "x" },
        inbound,
      ),
    ).rejects.toThrow(ValidationError);
    expect(inbound.getCount).not.toHaveBeenCalled();
  });

  it("delegates to inbound.getCount", async () => {
    const inbound = {
      getCount: vi.fn().mockResolvedValue({ entryId: "e1", totalLinkedEntries: 3 }),
    } as unknown as InboundReferenceService;
    const out = await getIncomingLinksCountActionHandler(
      { spaceId: "s", environmentId: "env", entryId: "e1" },
      inbound,
    );
    expect(out.totalLinkedEntries).toBe(3);
    expect(inbound.getCount).toHaveBeenCalledWith({
      spaceId: "s",
      environmentId: "env",
      entryId: "e1",
    });
  });
});
