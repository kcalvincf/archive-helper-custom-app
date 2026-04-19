import type { FunctionEventContext, FunctionEventHandler } from "@contentful/node-apps-toolkit";
import { FunctionTypeEnum } from "@contentful/node-apps-toolkit";
import { FunctionsCmaContentRepository } from "@archive-helper/contentful-adapters";
import {
  createLogger,
  removeIncomingLinksAppAction,
  RemoveIncomingLinksBatchService,
} from "@archive-helper/domain";
import type { AppActionRemoveLinksInput, ArchiveHelperInstallationParameters } from "@archive-helper/shared-types";
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
 * Thin Contentful Function handler for batched App Action `removeIncomingLinks`.
 */
export const handler: FunctionEventHandler = async (event, context) => {
  if (event.type !== FunctionTypeEnum.AppActionCall) {
    throw new Error(`Unsupported function event type: ${String((event as { type?: string }).type)}`);
  }

  logAppActionCall(event, context);

  const body = event.body as AppActionRemoveLinksInput & Record<string, unknown>;
  const cma = resolveCma(context);
  const log = createLogger("functions.removeIncomingLinks");
  const repository = new FunctionsCmaContentRepository(cma, log);
  const unlink = new RemoveIncomingLinksBatchService(repository, log);

  const installation = context.appInstallationParameters as ArchiveHelperInstallationParameters | undefined;
  const installationDefault =
    typeof installation?.defaultUnlinkBatchSize === "number" ? installation.defaultUnlinkBatchSize : undefined;

  return removeIncomingLinksAppAction(
    { spaceId: context.spaceId, environmentId: context.environmentId },
    {
      targetEntryId: typeof body.targetEntryId === "string" ? body.targetEntryId : "",
      batchSize: typeof body.batchSize === "number" ? body.batchSize : undefined,
      skip: typeof body.skip === "number" ? body.skip : undefined,
      dryRun: body.dryRun,
      publishStrategy: body.publishStrategy,
      localeMode: body.localeMode,
      contentTypeFilter: Array.isArray(body.contentTypeFilter)
        ? (body.contentTypeFilter as string[])
        : undefined,
    },
    unlink,
    { installationDefaultBatchSize: installationDefault },
  );
};
