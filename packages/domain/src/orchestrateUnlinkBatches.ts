import type { RemoveIncomingLinksInput, RemoveIncomingLinksResult } from "@archive-helper/shared-types";

export type UnlinkBatchExecutor = (input: RemoveIncomingLinksInput) => Promise<RemoveIncomingLinksResult>;

/**
 * Runs {@link RemoveIncomingLinksBatchService}-style invocations until `hasMore` is false.
 * Intended for custom orchestrators, scripts, and tests — not for Contentful Functions (use Automations instead).
 *
 * @param maxRounds Safety cap to avoid infinite loops (default 10_000).
 */
export async function runRemoveIncomingLinksUntilComplete(
  executeBatch: UnlinkBatchExecutor,
  base: RemoveIncomingLinksInput,
  maxRounds = 10_000,
): Promise<{ rounds: RemoveIncomingLinksResult[]; final: RemoveIncomingLinksResult }> {
  const rounds: RemoveIncomingLinksResult[] = [];
  let skip = base.skip ?? 0;

  for (let i = 0; i < maxRounds; i += 1) {
    const result = await executeBatch({ ...base, skip });
    rounds.push(result);
    if (!result.hasMore) {
      return { rounds, final: result };
    }
    skip = result.nextSkip;
  }

  throw new Error(
    `runRemoveIncomingLinksUntilComplete exceeded maxRounds (${maxRounds}); last nextSkip=${String(rounds.at(-1)?.nextSkip)}`,
  );
}
