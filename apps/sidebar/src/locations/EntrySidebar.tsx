import { useCallback, useEffect, useState } from "react";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import {
  Box,
  Button,
  Flex,
  List,
  ListItem,
  Note,
  Spinner,
  Stack,
  Subheading,
  Text,
} from "@contentful/f36-components";
import type {
  AppActionRemoveLinksOutput,
  ArchiveHelperInstanceParameters,
} from "@archive-helper/shared-types";

type LoadState = "idle" | "loading" | "error" | "ready";

function getAppActionConfig(sdk: SidebarAppSDK): { appDefinitionId: string; appActionId: string } {
  const instance = sdk.parameters.instance as ArchiveHelperInstanceParameters | undefined;
  const appDefinitionId =
    instance?.appDefinitionId ?? import.meta.env.VITE_CONTENTFUL_APP_DEFINITION_ID ?? "";
  const appActionId =
    instance?.appActionRemoveLinksId ?? import.meta.env.VITE_CONTENTFUL_APP_ACTION_REMOVE_LINKS_ID ?? "";
  return { appDefinitionId, appActionId };
}

async function fetchInboundLinkTotal(sdk: SidebarAppSDK): Promise<{ entryId: string; total: number }> {
  const entryId = sdk.entry.getSys().id;
  const res = await sdk.cma.entry.getMany({
    spaceId: sdk.ids.space,
    environmentId: sdk.ids.environment,
    query: {
      links_to_entry: entryId,
      limit: 1,
    },
  });
  return { entryId, total: res.total };
}

async function invokeRemoveLinks(
  sdk: SidebarAppSDK,
  dryRun: boolean,
  publishStrategy: "none" | "republish-if-published",
): Promise<AppActionRemoveLinksOutput> {
  const { appDefinitionId, appActionId } = getAppActionConfig(sdk);
  if (!appDefinitionId || !appActionId) {
    throw new Error(
      "Missing App Action configuration. Set installation parameters (appDefinitionId, appActionRemoveLinksId) or Vite env vars — see docs/CONFIGURATION.md.",
    );
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
        dryRun,
        publishStrategy,
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

export function EntrySidebar({ sdk }: { sdk: SidebarAppSDK }) {
  const [countState, setCountState] = useState<LoadState>("idle");
  const [total, setTotal] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AppActionRemoveLinksOutput | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCount = useCallback(async () => {
    setCountState("loading");
    setCountError(null);
    try {
      const { total: t } = await fetchInboundLinkTotal(sdk);
      setTotal(t);
      setCountState("ready");
    } catch (e) {
      setCountState("error");
      setCountError(e instanceof Error ? e.message : String(e));
    }
  }, [sdk]);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  const onPreview = async () => {
    setBusy(true);
    setActionError(null);
    setResult(null);
    try {
      const out = await invokeRemoveLinks(sdk, true, "none");
      setResult(out);
      sdk.notifier.success("Preview completed.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      sdk.notifier.error("Preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const onExecute = async () => {
    setBusy(true);
    setActionError(null);
    setResult(null);
    try {
      const out = await invokeRemoveLinks(sdk, false, "republish-if-published");
      setResult(out);
      sdk.notifier.success("Inbound links removed where possible.");
      await loadCount();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      sdk.notifier.error("Remove links failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box padding="spacingM">
      <Stack spacing="spacingM" flexDirection="column" alignItems="stretch">
        <Subheading>Archive helper</Subheading>

        <Box>
          {countState === "loading" && (
            <Flex marginTop="spacingS" alignItems="center" gap="spacingS">
              <Spinner size="small" />
              <Text>Loading count…</Text>
            </Flex>
          )}
          {countState === "error" && countError && (
            <Box marginTop="spacingS">
              <Note variant="negative">{countError}</Note>
            </Box>
          )}
          {countState === "ready" && total !== null && (
            <Text marginTop="spacingS" fontSize="fontSizeXl" fontWeight="fontWeightDemiBold">
              {total === 0 ? "No inbound entry links" : `${total} links found`}
            </Text>
          )}
        </Box>

        <Stack spacing="spacingS" flexDirection="column">
          <Button
            variant="secondary"
            isDisabled={busy || countState !== "ready"}
            onClick={() => void onPreview()}
          >
            Preview unlink impact
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || countState !== "ready" || total === 0}
            onClick={() => void onExecute()}
          >
            Remove links
          </Button>
        </Stack>
        {busy && (
          <Flex alignItems="center" gap="spacingS">
            <Spinner size="small" />
            <Text>Running App Action…</Text>
          </Flex>
        )}

        {actionError && (
          <Note variant="negative" title="Error">
            {actionError}
          </Note>
        )}

        {result && (
          <Note variant="positive" title="Last run">
            <Stack spacing="spacingS" flexDirection="column">
              <Text>
                Total inbound (CMA): {result.totalLinkedEntries}. Scanned: {result.scanned}. Changed:{" "}
                {result.changed}, unchanged: {result.unchanged}, failed: {result.failed}.
              </Text>
              {result.results.length > 0 && (
                <List as="ol">
                  {result.results.slice(0, 12).map((r) => (
                    <ListItem key={r.entryId}>
                      <Text>
                        {r.entryId} — {r.status}
                        {r.removedCount ? ` (${r.removedCount} refs)` : ""}
                        {r.message ? ` — ${r.message}` : ""}
                      </Text>
                    </ListItem>
                  ))}
                </List>
              )}
              {result.results.length > 12 && (
                <Text fontColor="gray600">…and {result.results.length - 12} more</Text>
              )}
            </Stack>
          </Note>
        )}
      </Stack>
    </Box>
  );
}
