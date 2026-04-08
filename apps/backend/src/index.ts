export { createAppServices, type AppServices } from "./app.js";
export { createPlainClient } from "./contentful/createClient.js";
export { ContentfulEntryService } from "./contentful/ContentfulEntryService.js";
export { InboundReferenceService } from "./services/InboundReferenceService.js";
export { RemoveIncomingLinksService } from "./services/RemoveIncomingLinksService.js";
export { removeIncomingLinksActionHandler } from "./actions/removeIncomingLinksActionHandler.js";
export { removeIncomingLinksAppAction } from "./handlers/removeIncomingLinksAppAction.js";
export {
  removeTargetReferencesDeep,
  hasEntryChanged,
  type RemoveRefsResult,
  isEntryLink,
  isRichTextDocument,
  isRichTextEmbeddedEntryNode,
  getEmbeddedEntryId,
} from "@archive-helper/utils";
export { createLogger, type Logger } from "./utils/logger.js";
export { aggregateUnlinkStats, buildUnlinkSummaryMessage } from "./utils/resultSummary.js";
export { createHttpRouter } from "./http/routes.js";
export { ValidationError } from "./errors.js";
export type {
  AppActionRemoveLinksInput,
  AppActionRemoveLinksOutput,
  ContentfulConfig,
  EntryUnlinkResult,
  GetLinkedEntryCountInput,
  GetLinkedEntryCountResult,
  InboundLinkCountResult,
  InvokeRemoveLinksBody,
  RemoveIncomingLinksInput,
  RemoveIncomingLinksResult,
} from "@archive-helper/shared-types";
