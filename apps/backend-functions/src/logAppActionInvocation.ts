import type { FunctionEventContext } from "@contentful/node-apps-toolkit";
import { FunctionTypeEnum } from "@contentful/node-apps-toolkit";

type AppActionCallEvent = {
  type: typeof FunctionTypeEnum.AppActionCall;
  body: unknown;
};

/**
 * Logs a safe, JSON-serializable snapshot of the invocation (no CMA client / tokens).
 */
export function logAppActionCall(event: AppActionCallEvent, context: FunctionEventContext): void {
  const call = {
    type: event.type,
    body: event.body,
    spaceId: context.spaceId,
    environmentId: context.environmentId,
    appInstallationParameters: context.appInstallationParameters,
  };
  console.log("call", JSON.stringify(call));
}
