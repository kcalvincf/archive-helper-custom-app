/**
 * Sample entry point for Contentful App Actions or serverless handlers.
 *
 * ```ts
 * import { createAppServices } from "./app.js";
 * import { removeIncomingLinksActionHandler } from "./actions/removeIncomingLinksActionHandler.js";
 *
 * export async function handler(event: { body: string }) {
 *   const services = createAppServices({ accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN! });
 *   const input = JSON.parse(event.body);
 *   return removeIncomingLinksActionHandler(input, services.unlink);
 * }
 * ```
 */
export { createAppServices } from "./app.js";
export { removeIncomingLinksActionHandler } from "./actions/removeIncomingLinksActionHandler.js";
export { removeIncomingLinksAppAction } from "./handlers/removeIncomingLinksAppAction.js";
export type {
  AppActionRemoveLinksInput,
  AppActionRemoveLinksOutput,
  RemoveIncomingLinksInput,
  RemoveIncomingLinksResult,
} from "@archive-helper/shared-types";
