import type { Logger } from "../utils/logger.js";

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const anyErr = err as { status?: number; statusCode?: number };
  return anyErr.status ?? anyErr.statusCode;
}

/**
 * Retries transient Contentful / network failures with bounded exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { logger: Logger; operation: string; maxAttempts?: number },
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt += 1;
      const status = getStatus(err);
      const retryable = status === undefined || RETRYABLE_STATUS.has(status);
      if (!retryable || attempt >= maxAttempts) {
        throw err;
      }
      const delayMs = Math.min(30_000, 500 * 2 ** (attempt - 1));
      options.logger.warn("contentful.retry", {
        operation: options.operation,
        attempt,
        maxAttempts,
        delayMs,
        status: status ?? "unknown",
      });
      await sleep(delayMs);
    }
  }
  throw lastError;
}
