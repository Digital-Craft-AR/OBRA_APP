import type { LayoutCatalog } from "./types";

const bodySlots = [{ key: "hero", maxKb: 512, requiredForExport: false }] as const;

/** MVP catalog: shared by Preview (future) and PDF worker via the same package import. */
export const LAYOUT_CATALOG = {
  catalogVersion: "2026.04.11.1",
  layouts: {
    layout_cover_v1: {
      tags: ["cover"],
      geometry: {
        pageSizes: ["a4", "letter"],
        orientations: ["portrait", "landscape"],
      },
      slots: [{ key: "cover_art", maxKb: 2048, requiredForExport: false }],
    },
    layout_toc_v1: {
      tags: ["toc"],
      geometry: {
        pageSizes: ["a4", "letter"],
        orientations: ["portrait", "landscape"],
      },
      slots: [],
    },
    layout_opener_v1: {
      tags: ["chapter_opener"],
      geometry: {
        pageSizes: ["a4", "letter"],
        orientations: ["portrait", "landscape"],
      },
      slots: [],
    },
    layout_body_legacy: {
      tags: ["body"],
      geometry: {
        pageSizes: ["a4", "letter"],
        orientations: ["portrait", "landscape"],
      },
      slots: bodySlots,
      deprecated: true,
      replacedBy: "layout_body_a",
    },
    layout_body_a: {
      tags: ["body"],
      geometry: {
        pageSizes: ["a4", "letter"],
        orientations: ["portrait", "landscape"],
      },
      slots: bodySlots,
    },
    layout_body_b: {
      tags: ["body"],
      geometry: {
        pageSizes: ["a4", "letter"],
        orientations: ["portrait", "landscape"],
      },
      slots: bodySlots,
    },
  },
  pools: {
    pool_body_variety: {
      layoutTag: "body",
      memberLayoutIds: ["layout_body_a", "layout_body_b", "layout_body_legacy"],
      selection: "uniform_random",
    },
  },
  bookTemplates: {
    classic_fixed: {
      label: "Classic — fixed body",
      roleBindings: {
        cover: { kind: "fixed", layoutId: "layout_cover_v1" },
        toc: { kind: "fixed", layoutId: "layout_toc_v1" },
        chapter_opener: { kind: "fixed", layoutId: "layout_opener_v1" },
        body: { kind: "fixed", layoutId: "layout_body_a" },
      },
    },
    classic_pooled: {
      label: "Classic — pooled body",
      roleBindings: {
        cover: { kind: "fixed", layoutId: "layout_cover_v1" },
        toc: { kind: "fixed", layoutId: "layout_toc_v1" },
        chapter_opener: { kind: "fixed", layoutId: "layout_opener_v1" },
        body: { kind: "pool", poolId: "pool_body_variety" },
      },
    },
  },
} as const satisfies LayoutCatalog;

export const DEFAULT_BOOK_TEMPLATE_ID = "classic_fixed";

export type BookTemplateId = keyof typeof LAYOUT_CATALOG.bookTemplates;
