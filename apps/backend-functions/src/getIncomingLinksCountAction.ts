import type { FunctionEventContext, FunctionEventHandler } from "@contentful/node-apps-toolkit";
import { FunctionTypeEnum } from "@contentful/node-apps-toolkit";
import { FunctionsCmaContentRepository } from "@archive-helper/contentful-adapters";
import { createLogger, getIncomingLinksCountAppAction, InboundReferenceService } from "@archive-helper/domain";
import type { PlainClientAPI } from "contentful-management";
import contentfulManagement from "contentful-management";
import { logAppActionCall } from "./logAppActionInvocation.js";

function resolveCma(context: FunctionEventContext): PlainClientAPI {
  if (context.cma) {
    return context.cma;
  }
  if (context.cmaClientOptions) {
    return contentfulManagement.createClient(context.cmaClientOptions, { type: "plain" });
  }
  throw new Error("Function context missing CMA client (expected context.cma or context.cmaClientOptions)");
}

/**
 * Thin Contentful Function handler for App Action `getIncomingLinksCount`.
 */
export const handler: FunctionEventHandler = async (event, context) => {
  if (event.type !== FunctionTypeEnum.AppActionCall) {
    throw new Error(`Unsupported function event type: ${String((event as { type?: string }).type)}`);
  }

  logAppActionCall(event, context);

  const body = event.body as { entryId?: string; previewSize?: number };
  const cma = resolveCma(context);
  const log = createLogger("functions.getIncomingLinksCount");
  const repository = new FunctionsCmaContentRepository(cma, log);
  const inbound = new InboundReferenceService(repository, log);

  const entryId = typeof body.entryId === "string" ? body.entryId : "";
  return getIncomingLinksCountAppAction(
    { spaceId: context.spaceId, environmentId: context.environmentId },
    { entryId, previewSize: body.previewSize },
    inbound,
  );
};
