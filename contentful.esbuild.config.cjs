"use strict";

const { NodeGlobalsPolyfillPlugin } = require("@esbuild-plugins/node-globals-polyfill");
const { NodeModulesPolyfillPlugin } = require("@esbuild-plugins/node-modules-polyfill");
const { stubNodeBuiltinsPlugin } = require("./contentful-esbuild-stubs/stubNodeBuiltinsPlugin.cjs");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Contentful Functions run in a sandboxed JS runtime — not full Node. A `platform: "node"`
 * bundle leaves esbuild CJS shims that call `require("buffer")` at runtime, which fails with
 * "Dynamic require of buffer is not supported".
 *
 * Match Create Contentful App / `build-functions` defaults: **browser** target + Node polyfill
 * plugins so `buffer`, `process`, etc. are bundled as ESM.
 *
 * Entry points are still read from `contentful-app-manifest.json`.
 */
const manifestPath = path.join(__dirname, "contentful-app-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const entryPoints = manifest.functions.reduce((result, contentfulFunction) => {
  const fileProperties = path.posix.parse(contentfulFunction.entryFile);
  const buildAlias = path.posix.join(fileProperties.dir, fileProperties.name);
  const resolvedPath = path.posix.resolve(".", contentfulFunction.entryFile);
  let relativePath = path.posix.relative(".", resolvedPath);
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }
  result[buildAlias] = relativePath;
  return result;
}, {});

module.exports = {
  entryPoints,
  bundle: true,
  outdir: "build",
  format: "esm",
  target: "es2022",
  platform: "browser",
  define: {
    global: "globalThis",
  },
  plugins: [
    stubNodeBuiltinsPlugin(),
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin(),
  ],
  minify: process.env.CONTENTFUL_FUNCTIONS_NO_MINIFY !== "1",
  logLevel: "info",
};
