/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTENTFUL_APP_DEFINITION_ID: string;
  readonly VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
