import { describe, expect, it } from "vitest";
import { DEFAULT_UNLINK_BATCH_SIZE, MAX_UNLINK_BATCH_SIZE } from "@archive-helper/shared-types";
import { resolveUnlinkBatchSize } from "./batchSize.js";
import { ValidationError } from "./validation.js";

describe("resolveUnlinkBatchSize", () => {
  it("uses explicit batchSize first", () => {
    expect(
      resolveUnlinkBatchSize({
        explicit: 5,
        installationDefault: 99,
        envOrConfigDefault: 1,
      }),
    ).toBe(5);
  });

  it("clamps to MAX_UNLINK_BATCH_SIZE", () => {
    expect(resolveUnlinkBatchSize({ explicit: 500 })).toBe(MAX_UNLINK_BATCH_SIZE);
  });

  it("falls back to installation then env then default", () => {
    expect(resolveUnlinkBatchSize({ installationDefault: 15 })).toBe(15);
    expect(resolveUnlinkBatchSize({ envOrConfigDefault: 12 })).toBe(12);
    expect(resolveUnlinkBatchSize({})).toBe(DEFAULT_UNLINK_BATCH_SIZE);
  });

  it("rejects non-positive explicit", () => {
    expect(() => resolveUnlinkBatchSize({ explicit: 0 })).toThrow(ValidationError);
  });
});
