"use strict";

const path = require("node:path");

/**
 * Maps Node built-in specifiers to local shims so `platform: "browser"` builds can complete.
 * `http2-wrapper` / `got` reference `http2`, which is not on disk.
 */
function stubNodeBuiltinsPlugin() {
  const stubDir = __dirname;
  const stubs = {
    http2: path.join(stubDir, "http2-stub.js"),
  };

  return {
    name: "stub-node-builtins",
    setup(build) {
      for (const [builtin, stubPath] of Object.entries(stubs)) {
        build.onResolve({ filter: new RegExp(`^${builtin}$`) }, () => ({
          path: stubPath,
        }));
      }
    },
  };
}

module.exports = { stubNodeBuiltinsPlugin };
