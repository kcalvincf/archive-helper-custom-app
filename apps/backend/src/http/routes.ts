import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { ValidationError } from "../errors.js";
import type { AppServices } from "../app.js";
import type {
  GetLinkedEntryCountInput,
  InvokeRemoveLinksBody,
  RemoveIncomingLinksInput,
} from "@archive-helper/shared-types";
import { removeIncomingLinksActionHandler } from "../actions/removeIncomingLinksActionHandler.js";
import { removeIncomingLinksAppAction } from "../handlers/removeIncomingLinksAppAction.js";

function parseIntParam(v: unknown, fallback: number): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Sample REST surface for sidebar UI and manual testing.
 */
export function createHttpRouter(services: AppServices): Router {
  const r = createRouter();

  r.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  r.get("/linked-entry-count", async (req: Request, res: Response) => {
    try {
      const input: GetLinkedEntryCountInput = {
        spaceId: String(req.query.spaceId ?? ""),
        environmentId: String(req.query.environmentId ?? ""),
        entryId: String(req.query.entryId ?? ""),
        previewSize: parseIntParam(req.query.previewSize, 0),
      };
      if (!input.spaceId.trim() || !input.environmentId.trim() || !input.entryId.trim()) {
        throw new ValidationError("spaceId, environmentId, and entryId are required query parameters");
      }
      const result = await services.inbound.getLinkedEntryCount(input);
      res.json(result);
    } catch (e) {
      sendError(res, e);
    }
  });

  r.post("/remove-incoming-links", async (req: Request, res: Response) => {
    try {
      const body = req.body as RemoveIncomingLinksInput;
      const result = await removeIncomingLinksActionHandler(body, services.unlink);
      res.json(result);
    } catch (e) {
      sendError(res, e);
    }
  });

  /** App Action / Automation webhook shape: same parameters + space + environment. */
  r.post("/app-actions/remove-incoming-links", async (req: Request, res: Response) => {
    try {
      const body = req.body as InvokeRemoveLinksBody;
      if (!body.spaceId?.trim() || !body.environmentId?.trim() || !body.targetEntryId?.trim()) {
        throw new ValidationError("spaceId, environmentId, and targetEntryId are required");
      }
      const result = await removeIncomingLinksAppAction(
        { spaceId: body.spaceId.trim(), environmentId: body.environmentId.trim() },
        {
          targetEntryId: body.targetEntryId.trim(),
          dryRun: body.dryRun,
          publishStrategy: body.publishStrategy,
        },
        services.unlink,
      );
      res.json(result);
    } catch (e) {
      sendError(res, e);
    }
  });

  return r;
}

function sendError(res: Response, e: unknown): void {
  if (e instanceof ValidationError) {
    res.status(e.statusCode).json({ error: e.message });
    return;
  }
  const message = e instanceof Error ? e.message : "Internal error";
  res.status(500).json({ error: message });
}
