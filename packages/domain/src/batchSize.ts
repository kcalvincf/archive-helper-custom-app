import {
  DEFAULT_UNLINK_BATCH_SIZE,
  MAX_UNLINK_BATCH_SIZE,
} from "@archive-helper/shared-types";
import { ValidationError } from "./validation.js";

export type ResolveUnlinkBatchSizeInput = {
  explicit?: number | null | undefined;
  installationDefault?: number | null | undefined;
  envOrConfigDefault?: number | null | undefined;
};

/**
 * Precedence: explicit action parameter → installation/config default → {@link DEFAULT_UNLINK_BATCH_SIZE}.
 * Clamped to [1, {@link MAX_UNLINK_BATCH_SIZE}].
 */
export function resolveUnlinkBatchSize(input: ResolveUnlinkBatchSizeInput): number {
  const tryUse = (raw: number | null | undefined, label: string): number | undefined => {
    if (raw === undefined || raw === null || Number.isNaN(raw)) return undefined;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) {
      throw new ValidationError(`${label} must be a positive integer`);
    }
    return Math.min(n, MAX_UNLINK_BATCH_SIZE);
  };

  const fromExplicit = tryUse(input.explicit, "batchSize");
  if (fromExplicit !== undefined) return fromExplicit;

  const fromInstall = tryUse(input.installationDefault, "defaultUnlinkBatchSize");
  if (fromInstall !== undefined) return fromInstall;

  const fromEnv = tryUse(input.envOrConfigDefault, "defaultUnlinkBatchSize");
  if (fromEnv !== undefined) return fromEnv;

  return DEFAULT_UNLINK_BATCH_SIZE;
}
