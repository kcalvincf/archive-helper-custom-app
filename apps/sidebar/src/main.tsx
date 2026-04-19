import { GlobalStyles } from "@contentful/f36-components";
import { init, locations } from "@contentful/app-sdk";
import { createRoot } from "react-dom/client";
import { IncomingLinksSidebar } from "./locations/IncomingLinksSidebar.js";
import type { SidebarAppSDK } from "@contentful/app-sdk";

const el = document.getElementById("root");

init((sdk) => {
  if (!el) return;

  if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    createRoot(el).render(
      <>
        <GlobalStyles />
        <IncomingLinksSidebar sdk={sdk as SidebarAppSDK} />
      </>,
    );
    return;
  }

  createRoot(el).render(
    <p style={{ padding: 16, fontFamily: "sans-serif" }}>
      This location is not supported. Open the app from an entry sidebar.
    </p>,
  );
});
