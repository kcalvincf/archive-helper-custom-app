import type { FunctionEventContext } from "@contentful/node-apps-toolkit";
import { FunctionTypeEnum } from "@contentful/node-apps-toolkit";
type AppActionCallEvent = {
    type: typeof FunctionTypeEnum.AppActionCall;
    body: unknown;
};
/**
 * Logs a safe, JSON-serializable snapshot of the invocation (no CMA client / tokens).
 */
export declare function logAppActionCall(event: AppActionCallEvent, context: FunctionEventContext): void;
export {};
//# sourceMappingURL=logAppActionInvocation.d.ts.map