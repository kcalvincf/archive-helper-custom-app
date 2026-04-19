import { describe, expect, it } from "vitest";
import { FunctionTypeEnum } from "@contentful/node-apps-toolkit";
import { handler } from "./removeIncomingLinksAction.js";

describe("removeIncomingLinksAction handler", () => {
  it("rejects unsupported function event types", async () => {
    await expect(
      handler(
        { type: FunctionTypeEnum.AppEventFilter, body: {} } as never,
        { spaceId: "s", environmentId: "e" } as never,
      ),
    ).rejects.toThrow(/Unsupported function event type/);
  });
});
