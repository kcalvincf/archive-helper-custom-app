import { useCallback, useEffect, useState } from "react";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import type {
  AppActionRemoveLinksOutput,
  ArchiveHelperInstanceParameters,
} from "@archive-helper/shared-types";
import { DEFAULT_UNLINK_BATCH_SIZE, MAX_UNLINK_BATCH_SIZE } from "@archive-helper/shared-types";

function getAppActionConfig(sdk: SidebarAppSDK): { appDefinitionId: string; appActionId: string } {
  const instance = sdk.parameters.instance as ArchiveHelperInstanceParameters | undefined;
  const appDefinitionId =
    instance?.appDefinitionId?.trim() ||
    (import.meta.env.VITE_CONTENTFUL_APP_DEFINITION_ID as string | undefined)?.trim() ||
    sdk.ids.app?.trim() ||
    "";
  const appActionId =
    instance?.appActionRemoveLinksId?.trim() ||
    (import.meta.env.VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID as string | undefined)?.trim() ||
    "";
  return { appDefinitionId, appActionId };
}

function missingAppActionConfigMessage(appDefinitionId: string, appActionId: string): string {
  const gaps: string[] = [];
  if (!appDefinitionId) {
    gaps.push(
      "app definition ID (expected from the running app via sdk.ids.app — if missing, set instance parameter appDefinitionId or VITE_CONTENTFUL_APP_DEFINITION_ID)",
    );
  }
  if (!appActionId) {
    gaps.push(
      'unlink App Action ID — create an App Action on this app definition, copy its ID, then set instance parameter appActionRemoveLinksId or VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID in apps/sidebar/.env for local dev',
    );
  }
  return `Missing App Action configuration: ${gaps.join("; ")}. See docs/CONFIGURATION.md (sidebar environment).`;
}

/** Instance parameter `republishAfterUnlink` or VITE_CONTENTFUL_REPUBLISH_AFTER_UNLINK=true for local dev. */
export function resolveRepublishAfterUnlink(sdk: SidebarAppSDK): boolean {
  const instance = sdk.parameters.instance as ArchiveHelperInstanceParameters | undefined;
  if (instance?.republishAfterUnlink === true) return true;
  const v = import.meta.env.VITE_CONTENTFUL_REPUBLISH_AFTER_UNLINK?.toLowerCase();
  return v === "true";
}

function clampBatchSize(n: number): number {
  if (!Number.isFinite(n) || n < 1) return DEFAULT_UNLINK_BATCH_SIZE;
  return Math.min(Math.floor(n), MAX_UNLINK_BATCH_SIZE);
}

/** Default batch size for sidebar runs (instance → Vite → 20). */
export function resolveDefaultUnlinkBatchSize(sdk: SidebarAppSDK): number {
  const instance = sdk.parameters.instance as ArchiveHelperInstanceParameters | undefined;
  const fromInstance = instance?.defaultUnlinkBatchSize;
  if (typeof fromInstance === "number" && Number.isFinite(fromInstance)) {
    return clampBatchSize(fromInstance);
  }
  const raw = import.meta.env.VITE_DEFAULT_UNLINK_BATCH_SIZE;
  if (raw !== undefined && raw !== "") {
    return clampBatchSize(Number.parseInt(String(raw), 10));
  }
  return DEFAULT_UNLINK_BATCH_SIZE;
}

async function invokeRemoveLinks(
  sdk: SidebarAppSDK,
  params: {
    dryRun: boolean;
    publishStrategy: "none" | "republish-if-published";
    skip: number;
    batchSize: number;
  },
): Promise<AppActionRemoveLinksOutput> {
  const { appDefinitionId, appActionId } = getAppActionConfig(sdk);
  if (!appDefinitionId || !appActionId) {
    throw new Error(missingAppActionConfigMessage(appDefinitionId, appActionId));
  }

  const targetEntryId = sdk.entry.getSys().id;
  const call = await sdk.cma.appActionCall.createWithResult(
    {
      spaceId: sdk.ids.space,
      environmentId: sdk.ids.environment,
      appDefinitionId,
      appActionId,
    },
    {
      parameters: {
        targetEntryId,
        dryRun: params.dryRun,
        publishStrategy: params.publishStrategy,
        skip: params.skip,
        batchSize: params.batchSize,
      },
    },
  );

  const { status } = call.sys;
  if (status !== "succeeded") {
    const detail =
      status === "failed" && "error" in call.sys && call.sys.error != null
        ? JSON.stringify(call.sys.error)
        : status;
    throw new Error(`App Action did not succeed (${detail})`);
  }

  return call.sys.result as AppActionRemoveLinksOutput;
}

export function useRemoveIncomingLinks(sdk: SidebarAppSDK): {
  busy: boolean;
  result: AppActionRemoveLinksOutput | null;
  error: string | null;
  republishAfterUnlink: boolean;
  skip: number;
  batchSize: number;
  setBatchSize: (n: number) => void;
  resetBatchProgress: () => void;
  previewUnlink: () => Promise<void>;
  removeLinks: () => Promise<void>;
  clearFeedback: () => void;
} {
  const republishAfterUnlink = resolveRepublishAfterUnlink(sdk);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AppActionRemoveLinksOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [batchSize, setBatchSizeState] = useState(() => resolveDefaultUnlinkBatchSize(sdk));

  const entryId = sdk.entry.getSys().id;

  useEffect(() => {
    setSkip(0);
    setResult(null);
    setError(null);
    setBatchSizeState(resolveDefaultUnlinkBatchSize(sdk));
  }, [entryId, sdk]);

  const setBatchSize = useCallback((n: number) => {
    setBatchSizeState(clampBatchSize(n));
  }, []);

  const resetBatchProgress = useCallback(() => {
    setSkip(0);
    setResult(null);
    setError(null);
  }, []);

  const clearFeedback = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const previewUnlink = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await invokeRemoveLinks(sdk, {
        dryRun: true,
        publishStrategy: "none",
        skip,
        batchSize,
      });
      setResult(out);
      sdk.notifier.success("Preview completed.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      sdk.notifier.error("Preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const removeLinks = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const publishStrategy = republishAfterUnlink ? "republish-if-published" : "none";
      const out = await invokeRemoveLinks(sdk, {
        dryRun: false,
        publishStrategy,
        skip,
        batchSize,
      });
      setResult(out);
      if (out.hasMore) {
        setSkip(out.nextSkip);
        sdk.notifier.success(`Batch complete — ${out.remainingEstimate} linking entries estimated remaining.`);
      } else {
        setSkip(0);
        sdk.notifier.success("No more inbound batches reported by CMA for this target.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      sdk.notifier.error("Remove links failed.");
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    result,
    error,
    republishAfterUnlink,
    skip,
    batchSize,
    setBatchSize,
    resetBatchProgress,
    previewUnlink,
    removeLinks,
    clearFeedback,
  };
}
