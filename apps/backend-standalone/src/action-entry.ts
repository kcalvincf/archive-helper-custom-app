/**
 * Sample entry point for serverless handlers that use a management token.
 *
 * ```ts
 * import { createAppServices } from "./app.js";
 * import { removeIncomingLinksActionHandler } from "@archive-helper/domain";
 *
 * export async function handler(event: { body: string }) {
 *   const services = createAppServices({ accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN! });
 *   const input = JSON.parse(event.body);
 *   return removeIncomingLinksActionHandler(input, services.unlink, {
 *     envOrConfigDefaultBatchSize: services.defaultUnlinkBatchSize,
 *   });
 * }
 * ```
 */
export { createAppServices } from "./app.js";
export {
  removeIncomingLinksActionHandler,
  removeIncomingLinksAppAction,
  getIncomingLinksCountActionHandler,
} from "@archive-helper/domain";
export type {
  AppActionRemoveLinksInput,
  AppActionRemoveLinksOutput,
  RemoveIncomingLinksInput,
  RemoveIncomingLinksResult,
  GetIncomingLinksCountActionInput,
  GetIncomingLinksCountActionResult,
} from "@archive-helper/shared-types";
