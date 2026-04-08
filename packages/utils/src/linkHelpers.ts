import type { ContentfulEntryLink, RichTextNode } from "@archive-helper/shared-types";

const RICH_TEXT_NODE_TYPES = new Set([
  "embedded-entry-block",
  "embedded-entry-inline",
  "entry-hyperlink",
]);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEntryLink(value: unknown, targetEntryId?: string): value is ContentfulEntryLink {
  if (!isPlainObject(value)) return false;
  const sys = value.sys;
  if (!isPlainObject(sys)) return false;
  if (sys.type !== "Link" || sys.linkType !== "Entry") return false;
  if (typeof sys.id !== "string") return false;
  if (targetEntryId !== undefined) return sys.id === targetEntryId;
  return true;
}

export function getEmbeddedEntryId(node: RichTextNode): string | undefined {
  const data = node.data;
  if (!isPlainObject(data)) return undefined;
  const target = data.target;
  if (!isPlainObject(target)) return undefined;
  const sys = target.sys;
  if (!isPlainObject(sys) || typeof sys.id !== "string") return undefined;
  if (sys.type === "Link" && sys.linkType === "Entry") return sys.id;
  return undefined;
}

export function isRichTextEmbeddedEntryNode(
  node: unknown,
  targetEntryId?: string,
): node is RichTextNode {
  if (!isPlainObject(node)) return false;
  const nt = node.nodeType;
  if (typeof nt !== "string" || !RICH_TEXT_NODE_TYPES.has(nt)) return false;
  const id = getEmbeddedEntryId(node as RichTextNode);
  if (id === undefined) return false;
  if (targetEntryId !== undefined) return id === targetEntryId;
  return true;
}

export function isRichTextDocument(value: unknown): value is RichTextNode {
  return isPlainObject(value) && value.nodeType === "document" && Array.isArray(value.content);
}
