import { describe, expect, it } from "vitest";
import {
  computeInitialLayoutAssignments,
  getLayoutCatalogVersion,
  resolveCanonicalLayoutId,
  validateManifest,
} from "@obra/layout-catalog";

describe("@obra/layout-catalog", () => {
  it("validates the bundled manifest with no issues", () => {
    expect(validateManifest()).toEqual([]);
  });

  it("follows replacedBy for deprecated layout ids", () => {
    expect(resolveCanonicalLayoutId("layout_body_legacy")).toBe("layout_body_a");
  });

  it("returns deterministic layout assignments for the same project id", () => {
    const geometry = { size: "a4" as const, orientation: "portrait" as const };
    const first = computeInitialLayoutAssignments({
      projectId: "proj_test_1",
      bookTemplateId: "classic_fixed",
      geometry,
    });
    const second = computeInitialLayoutAssignments({
      projectId: "proj_test_1",
      bookTemplateId: "classic_fixed",
      geometry,
    });
    expect(second).toEqual(first);
    expect(first["main:cover"]).toBe("layout_cover_v1");
    expect(first["main:body"]).toBe("layout_body_a");
  });

  it("exposes a catalog version for deploy alignment", () => {
    expect(getLayoutCatalogVersion()).toMatch(/^2026\./);
  });
});
