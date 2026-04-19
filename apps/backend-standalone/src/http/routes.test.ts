import { describe, expect, it, vi } from "vitest";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { AppServices } from "../app.js";
import { createHttpRouter } from "./routes.js";

async function withTestServer(services: AppServices, run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use(createHttpRouter(services));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

const sampleBatchResult = {
  targetEntryId: "t",
  totalLinkedEntries: 0,
  batchSizeUsed: 20,
  skipUsed: 0,
  processedInThisBatch: 0,
  nextSkip: 0,
  hasMore: false,
  remainingEstimate: 0,
  changed: 0,
  unchanged: 0,
  failed: 0,
  results: [],
};

describe("createHttpRouter", () => {
  it("GET /linked-entry-count uses inbound.getCount via domain handler", async () => {
    const getCount = vi.fn().mockResolvedValue({
      entryId: "e1",
      totalLinkedEntries: 7,
    });
    const services = {
      inbound: { getCount },
      unlink: { execute: vi.fn() },
    } as unknown as AppServices;

    await withTestServer(services, async (base) => {
      const res = await fetch(
        `${base}/linked-entry-count?spaceId=s1&environmentId=master&entryId=e1&previewSize=0`,
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { totalLinkedEntries: number };
      expect(json.totalLinkedEntries).toBe(7);
      expect(getCount).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: "s1",
          environmentId: "master",
          entryId: "e1",
        }),
      );
    });
  });

  it("POST /remove-incoming-links calls domain action handler via execute", async () => {
    const execute = vi.fn().mockResolvedValue(sampleBatchResult);
    const services = {
      inbound: { getCount: vi.fn() },
      unlink: { execute },
    } as unknown as AppServices;

    await withTestServer(services, async (base) => {
      const res = await fetch(`${base}/remove-incoming-links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spaceId: "s",
          environmentId: "master",
          targetEntryId: "t",
          dryRun: true,
        }),
      });
      expect(res.status).toBe(200);
      await res.json();
      expect(execute).toHaveBeenCalled();
    });
  });
});
