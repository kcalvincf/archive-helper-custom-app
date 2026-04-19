import { describe, expect, it } from "vitest";
import { hasEntryChanged, removeTargetReferencesDeep } from "./removeTargetReferencesDeep.js";

const TARGET = "catFlexSeoSmartphones";

describe("removeTargetReferencesDeep", () => {
  it("removes single direct link", () => {
    const before = {
      sys: { type: "Link", linkType: "Entry", id: TARGET },
    };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.cleaned).toBeNull();
    expect(r.removedCount).toBe(1);
    expect(r.changed).toBe(true);
  });

  it("removes link from array of links", () => {
    const before = [
      { sys: { type: "Link", linkType: "Entry", id: "entryA" } },
      { sys: { type: "Link", linkType: "Entry", id: TARGET } },
    ];
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.cleaned).toEqual([{ sys: { type: "Link", linkType: "Entry", id: "entryA" } }]);
    expect(r.removedCount).toBe(1);
    expect(r.changed).toBe(true);
  });

  it("removes multiple occurrences", () => {
    const before = {
      a: { sys: { type: "Link", linkType: "Entry", id: TARGET } },
      b: [{ sys: { type: "Link", linkType: "Entry", id: TARGET } }],
    };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.removedCount).toBe(2);
    expect(r.cleaned).toEqual({ a: null, b: [] });
  });

  it("removes rich text embedded-entry-block", () => {
    const doc = {
      nodeType: "document",
      data: {},
      content: [
        {
          nodeType: "embedded-entry-block",
          data: {
            target: {
              sys: { id: TARGET, type: "Link", linkType: "Entry" },
            },
          },
          content: [],
        },
        { nodeType: "paragraph", data: {}, content: [] },
      ],
    };
    const r = removeTargetReferencesDeep(doc, TARGET);
    expect(r.removedCount).toBe(1);
    expect((r.cleaned as { content: unknown[] }).content).toHaveLength(1);
    expect((r.cleaned as { content: { nodeType: string }[] }).content[0].nodeType).toBe("paragraph");
  });

  it("removes rich text embedded-entry-inline", () => {
    const doc = {
      nodeType: "document",
      data: {},
      content: [
        {
          nodeType: "paragraph",
          data: {},
          content: [
            { nodeType: "text", value: "x", marks: [], data: {} },
            {
              nodeType: "embedded-entry-inline",
              data: {
                target: {
                  sys: { id: TARGET, type: "Link", linkType: "Entry" },
                },
              },
              content: [],
            },
          ],
        },
      ],
    };
    const r = removeTargetReferencesDeep(doc, TARGET);
    expect(r.removedCount).toBe(1);
    const p = (r.cleaned as { content: { content: unknown[] }[] }).content[0];
    expect(p.content).toHaveLength(1);
  });

  it("removes rich text entry-hyperlink (unwraps inner content)", () => {
    const doc = {
      nodeType: "document",
      data: {},
      content: [
        {
          nodeType: "paragraph",
          data: {},
          content: [
            {
              nodeType: "entry-hyperlink",
              data: {
                target: {
                  sys: { id: TARGET, type: "Link", linkType: "Entry" },
                },
              },
              content: [{ nodeType: "text", value: "Hello", marks: [], data: {} }],
            },
          ],
        },
      ],
    };
    const r = removeTargetReferencesDeep(doc, TARGET);
    expect(r.removedCount).toBe(1);
    const para = (r.cleaned as { content: { content: unknown[] }[] }).content[0];
    expect(para.content[0]).toMatchObject({ nodeType: "text", value: "Hello" });
  });

  it("leaves unrelated links untouched", () => {
    const before = { sys: { type: "Link", linkType: "Entry", id: "other" } };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.cleaned).toEqual(before);
    expect(r.removedCount).toBe(0);
    expect(r.changed).toBe(false);
  });

  it("handles nested arrays/objects", () => {
    const before = {
      nested: [
        {
          deep: { sys: { type: "Link", linkType: "Entry", id: TARGET } },
        },
      ],
    };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.removedCount).toBe(1);
    expect(r.cleaned).toEqual({ nested: [{ deep: null }] });
  });

  it("returns correct removedCount for combined shapes", () => {
    const before = {
      x: { sys: { type: "Link", linkType: "Entry", id: TARGET } },
      y: [{ sys: { type: "Link", linkType: "Entry", id: TARGET } }],
    };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.removedCount).toBe(2);
  });

  it("reports unchanged when nothing matched", () => {
    const before = { foo: "bar", n: 1 };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.cleaned).toEqual(before);
    expect(r.removedCount).toBe(0);
    expect(r.changed).toBe(false);
  });

  it("keeps empty arrays after removal", () => {
    const before = [{ sys: { type: "Link", linkType: "Entry", id: TARGET } }];
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.cleaned).toEqual([]);
  });

  it("does not treat Asset links as Entry links", () => {
    const before = { sys: { type: "Link", linkType: "Asset", id: TARGET } };
    const r = removeTargetReferencesDeep(before, TARGET);
    expect(r.removedCount).toBe(0);
    expect(r.changed).toBe(false);
  });
});

describe("hasEntryChanged", () => {
  it("detects structural change", () => {
    expect(hasEntryChanged({ a: 1 }, { a: 2 })).toBe(true);
    expect(hasEntryChanged({ a: 1 }, { a: 1 })).toBe(false);
  });
});
