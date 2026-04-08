import deepEqual from "fast-deep-equal";
import type { RichTextNode } from "@archive-helper/shared-types";
import {
  getEmbeddedEntryId,
  isEntryLink,
  isPlainObject,
  isRichTextDocument,
} from "./linkHelpers.js";

export type RemoveRefsResult = {
  cleaned: unknown;
  removedCount: number;
  changed: boolean;
};

function transformRichTextContent(
  nodes: RichTextNode[],
  targetEntryId: string,
): { nodes: RichTextNode[]; removedCount: number; changed: boolean } {
  let removedCount = 0;
  let changed = false;
  const out: RichTextNode[] = [];

  for (const child of nodes) {
    const nt = child.nodeType;

    if (nt === "embedded-entry-block" || nt === "embedded-entry-inline") {
      const id = getEmbeddedEntryId(child);
      if (id === targetEntryId) {
        removedCount += 1;
        changed = true;
        continue;
      }
      out.push(child);
      continue;
    }

    if (nt === "entry-hyperlink") {
      const id = getEmbeddedEntryId(child);
      if (id === targetEntryId) {
        removedCount += 1;
        changed = true;
        const inner = child.content ?? [];
        const innerRes = transformRichTextContent(inner, targetEntryId);
        removedCount += innerRes.removedCount;
        if (innerRes.changed) changed = true;
        out.push(...innerRes.nodes);
        continue;
      }
    }

    const transformed = transformRichTextSubtree(child, targetEntryId);
    removedCount += transformed.removedCount;
    if (transformed.changed) changed = true;
    out.push(transformed.node);
  }

  return { nodes: out, removedCount, changed };
}

function transformRichTextSubtree(
  node: RichTextNode,
  targetEntryId: string,
): { node: RichTextNode; removedCount: number; changed: boolean } {
  if (!Array.isArray(node.content)) {
    return { node, removedCount: 0, changed: false };
  }

  const { nodes, removedCount, changed } = transformRichTextContent(node.content, targetEntryId);
  const same =
    !changed &&
    nodes.length === node.content.length &&
    nodes.every((n, i) => n === node.content![i]);
  if (same) {
    return { node, removedCount: 0, changed: false };
  }

  return {
    node: { ...node, content: nodes },
    removedCount,
    changed: true,
  };
}

function removeFromRichTextDocument(doc: RichTextNode, targetEntryId: string): RemoveRefsResult {
  const base = doc;
  const { nodes, removedCount, changed } = transformRichTextContent(base.content ?? [], targetEntryId);
  if (!changed) {
    return { cleaned: doc, removedCount: 0, changed: false };
  }
  return {
    cleaned: { ...base, content: nodes },
    removedCount,
    changed: true,
  };
}

export function removeTargetReferencesDeep(value: unknown, targetEntryId: string): RemoveRefsResult {
  if (value === null || value === undefined) {
    return { cleaned: value, removedCount: 0, changed: false };
  }

  if (isEntryLink(value) && value.sys.id === targetEntryId) {
    return { cleaned: null, removedCount: 1, changed: true };
  }

  if (Array.isArray(value)) {
    let removedCount = 0;
    const out: unknown[] = [];
    for (const item of value) {
      if (isEntryLink(item) && item.sys.id === targetEntryId) {
        removedCount += 1;
        continue;
      }
      const inner = removeTargetReferencesDeep(item, targetEntryId);
      removedCount += inner.removedCount;
      out.push(inner.cleaned);
    }
    const changed = !deepEqual(value, out);
    return { cleaned: out, removedCount, changed };
  }

  if (isRichTextDocument(value)) {
    return removeFromRichTextDocument(value, targetEntryId);
  }

  if (isPlainObject(value)) {
    let removedCount = 0;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const inner = removeTargetReferencesDeep(v, targetEntryId);
      removedCount += inner.removedCount;
      out[k] = inner.cleaned;
    }
    if (Object.keys(out).length === 0 && removedCount > 0) {
      return { cleaned: null, removedCount, changed: true };
    }
    const changed = !deepEqual(value, out);
    return { cleaned: out, removedCount, changed };
  }

  return { cleaned: value, removedCount: 0, changed: false };
}

export function hasEntryChanged(before: unknown, after: unknown): boolean {
  return !deepEqual(before, after);
}
