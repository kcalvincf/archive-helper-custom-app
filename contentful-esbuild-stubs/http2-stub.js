/**
 * Node's `http2` is not available in browser-style bundles. `got` (via @contentful/node-apps-toolkit)
 * resolves this at build time; CMA traffic typically uses HTTP/1.1 over `https`.
 */
export default {};
export const connect = () => {
  throw new Error("http2 is not available in this bundle");
};
export const createServer = () => {
  throw new Error("http2 is not available in this bundle");
};
export const constants = {};
