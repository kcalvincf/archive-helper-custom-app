"use strict";

/**
 * Contentful app bundle uploads require **index.html** at the archive root alongside Functions.
 * `contentful-app-scripts build-functions` only writes JS under `build/…`; this copies the sidebar
 * SPA (`apps/sidebar/build`) into `build/` after that step.
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const sidebarBuild = path.join(repoRoot, "apps/sidebar/build");
const outDir = path.join(repoRoot, "build");

const indexSrc = path.join(sidebarBuild, "index.html");
if (!fs.existsSync(indexSrc)) {
  console.error(
    "Missing apps/sidebar/build/index.html. Run first: npm run build -w @archive-helper/sidebar",
  );
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.copyFileSync(indexSrc, path.join(outDir, "index.html"));

const assetsSrc = path.join(sidebarBuild, "assets");
const assetsDest = path.join(outDir, "assets");
if (fs.existsSync(assetsSrc)) {
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });
} else {
  console.warn("No apps/sidebar/build/assets — sidebar build may be incomplete.");
}

console.log("Staged sidebar into build/ (index.html + assets/) for Contentful upload.");
