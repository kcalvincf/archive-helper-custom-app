/**
 * Contentful Function entry: kept under `functions/` so `build-functions` output matches
 * `contentful-app-manifest.json` `path` (`functions/removeIncomingLinks.js`).
 */
export { handler } from "../apps/backend-functions/src/removeIncomingLinksAction.ts";
