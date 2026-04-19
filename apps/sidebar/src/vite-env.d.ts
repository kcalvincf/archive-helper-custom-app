/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTENTFUL_APP_DEFINITION_ID: string;
  readonly VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID: string;
  /** Optional: App Action ID for getIncomingLinksCount (otherwise sidebar uses CMA count). */
  readonly VITE_CONTENTFUL_APP_ACTION_GET_INCOMING_LINKS_COUNT_ID?: string;
  /** Optional default batch size for unlink (1–100); falls back to instance param or 20. */
  readonly VITE_DEFAULT_UNLINK_BATCH_SIZE?: string;
  /** Set to "true" to republish after unlink (local dev); default draft-only when unset. */
  readonly VITE_CONTENTFUL_REPUBLISH_AFTER_UNLINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
