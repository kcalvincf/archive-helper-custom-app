export type AdapterLogFields = Record<string, string | number | boolean | undefined | null>;

/** Optional structured logger for CMA retries and diagnostics (never log secrets). */
export interface AdapterLogger {
  debug(msg: string, fields?: AdapterLogFields): void;
  info(msg: string, fields?: AdapterLogFields): void;
  warn(msg: string, fields?: AdapterLogFields): void;
  error(msg: string, fields?: AdapterLogFields): void;
}

export const noopAdapterLogger: AdapterLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
