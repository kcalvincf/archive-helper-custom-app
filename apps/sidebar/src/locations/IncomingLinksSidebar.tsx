import { useEffect, useState } from "react";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import {
  Box,
  Button,
  Flex,
  Form,
  FormControl,
  List,
  ListItem,
  Note,
  Spinner,
  Stack,
  Subheading,
  Text,
  TextInput,
} from "@contentful/f36-components";
import { MAX_UNLINK_BATCH_SIZE } from "@archive-helper/shared-types";
import { useIncomingLinkCount } from "../hooks/useIncomingLinkCount.js";
import { useRemoveIncomingLinks } from "../hooks/useRemoveIncomingLinks.js";

export function IncomingLinksSidebar({ sdk }: { sdk: SidebarAppSDK }) {
  const { state: countState, refresh } = useIncomingLinkCount(sdk);
  const {
    busy,
    result,
    error,
    republishAfterUnlink,
    skip,
    batchSize,
    setBatchSize,
    // resetBatchProgress,
    previewUnlink,
    removeLinks,
    clearFeedback,
  } = useRemoveIncomingLinks(sdk);

  const [batchInput, setBatchInput] = useState(String(batchSize));

  useEffect(() => {
    setBatchInput(String(batchSize));
  }, [batchSize]);

  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk]);

  const onPreview = async () => {
    await previewUnlink();
  };

  const onExecute = async () => {
    await removeLinks();
    await refresh();
  };

  const total = countState.status === "ready" ? countState.total : null;
  const countReady = countState.status === "ready";

  return (
    <Box padding="spacingM" width="full" style={{ maxWidth: "100%" }}>
      <Stack spacing="spacingM" flexDirection="column" alignItems="stretch">
        <Subheading>Archive Helper</Subheading>

        <Box>
          {countState.status === "loading" && (
            <Flex marginTop="spacingS" alignItems="center" gap="spacingS">
              <Spinner size="small" />
              <Text>Loading count…</Text>
            </Flex>
          )}
          {countState.status === "error" && (
            <Box marginTop="spacingS">
              <Note variant="negative">{countState.message}</Note>
            </Box>
          )}
          {countReady && total !== null && total === 0 ? 
          (
              <Text marginTop="spacingS" fontSize="fontSizeL" fontWeight="fontWeightDemiBold">
                No inbound entry links
              </Text>
          ) : (
            <Text marginTop="spacingS" fontColor="green600" fontWeight="fontWeightDemiBold">
                {total} links found
            </Text>
          )}
        </Box>

        <Form>
          <FormControl marginBottom="none">
            <FormControl.Label>Batch size (max {MAX_UNLINK_BATCH_SIZE})</FormControl.Label>
            <TextInput
              type="number"
              value={batchInput}
              isDisabled={busy}
              onChange={(e) => setBatchInput(e.target.value)}
              onBlur={() => {
                const n = Number.parseInt(batchInput, 10);
                setBatchSize(Number.isFinite(n) ? n : batchSize);
              }}
            />
            <FormControl.HelpText>
              ** Each run processes {batchSize} links (starting at skip {skip})**
            </FormControl.HelpText>
          </FormControl>
        </Form>

        <Stack spacing="spacingS" flexDirection="column">
          <Button
            variant="secondary"
            isDisabled={busy || countState.status === "loading" || !countReady}
            onClick={() => void onPreview()}
          >
            Validate Batch
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || countState.status === "loading" || !countReady || total === 0}
            onClick={() => void onExecute()}
          >
            Remove References
          </Button>
          {/* <Button variant="transparent" isDisabled={busy} onClick={() => resetBatchProgress()}>
            Reset batch progress (skip → 0)
          </Button> */}
          <Text fontColor="green600" fontSize="fontSizeS" fontWeight="fontWeightDemiBold">
            {republishAfterUnlink
              ? "** AUTO PUBLISH **"
              : "** NO AUTO PUBLISH **"}
          </Text>
        </Stack>
        {busy && (
          <Flex alignItems="center" gap="spacingS">
            <Spinner size="small" />
            <Text>Running App Action…</Text>
          </Flex>
        )}

        {error && (
          <Note variant="negative" title="Error">
            {error}
          </Note>
        )}

        {result && (
          <Note variant="positive" title="Last batch">
            <Stack spacing="spacingS" flexDirection="column">
              <Text>
                Total inbound (CMA): {result.totalLinkedEntries}. This batch: processed{" "}
                {result.processedInThisBatch} (skip used {result.skipUsed}, batch size {result.batchSizeUsed}).
                Changed: {result.changed}, unchanged: {result.unchanged}, failed: {result.failed}.
              </Text>
              <Text>
                Next skip: {result.nextSkip}. Remaining (estimate): {result.remainingEstimate}.{" "}
                {result.hasMore ? "More batches may be required." : "CMA reports no further linking entries."}
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
              <Button variant="transparent" size="small" onClick={() => clearFeedback()}>
                Dismiss summary
              </Button>
            </Stack>
          </Note>
        )}
      </Stack>
    </Box>
  );
}
