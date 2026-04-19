import { useCallback, useEffect, useState } from "react";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import type { ArchiveHelperInstanceParameters, GetIncomingLinksCountActionResult } from "@archive-helper/shared-types";

export type IncomingLinkCountState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entryId: string; total: number };

function getAppDefinitionId(sdk: SidebarAppSDK): string {
  const instance = sdk.parameters.instance as ArchiveHelperInstanceParameters | undefined;
  return (
    instance?.appDefinitionId?.trim() ||
    (import.meta.env.VITE_CONTENTFUL_APP_DEFINITION_ID as string | undefined)?.trim() ||
    sdk.ids.app?.trim() ||
    ""
  );
}

function getCountActionId(sdk: SidebarAppSDK): string {
  const instance = sdk.parameters.instance as ArchiveHelperInstanceParameters | undefined;
  return (
    instance?.appActionGetIncomingLinksCountId?.trim() ||
    (import.meta.env.VITE_CONTENTFUL_APP_ACTION_GET_INCOMING_LINKS_COUNT_ID as string | undefined)?.trim() ||
    ""
  );
}

/**
 * Inbound link total via optional `getIncomingLinksCount` App Action, else CMA `links_to_entry` + `total`.
 */
export function useIncomingLinkCount(sdk: SidebarAppSDK): {
  state: IncomingLinkCountState;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<IncomingLinkCountState>({ status: "idle" });

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const entryId = sdk.entry.getSys().id;
      const appDefinitionId = getAppDefinitionId(sdk);
      const appActionId = getCountActionId(sdk);

      if (appDefinitionId && appActionId) {
        const call = await sdk.cma.appActionCall.createWithResult(
          {
            spaceId: sdk.ids.space,
            environmentId: sdk.ids.environment,
            appDefinitionId,
            appActionId,
          },
          {
            parameters: {
              entryId,
            },
          },
        );
        console.log("call", JSON.stringify(call));
        if (call.sys.status !== "succeeded") {
          throw new Error(`Count App Action did not succeed (${call.sys.status})`);
        }
        const out = call.sys.result as GetIncomingLinksCountActionResult;
        setState({ status: "ready", entryId: out.entryId, total: out.totalLinkedEntries });
        return;
      }

      const res = await sdk.cma.entry.getMany({
        spaceId: sdk.ids.space,
        environmentId: sdk.ids.environment,
        query: {
          links_to_entry: entryId,
          limit: 1,
        },
      });
      setState({ status: "ready", entryId, total: res.total });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, [sdk]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, refresh };
}
