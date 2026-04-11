import { DEFAULT_BOOK_TEMPLATE_ID, LAYOUT_CATALOG } from "./manifest";
import type {
  BookTemplateRecord,
  LayoutCatalog,
  LayoutRecord,
  PageRole,
  ProjectPageGeometry,
  RoleAssignment,
} from "./types";

export function getLayoutCatalog(): LayoutCatalog {
  return LAYOUT_CATALOG;
}

export function getLayoutCatalogVersion(): string {
  return LAYOUT_CATALOG.catalogVersion;
}

export function listBookTemplateIds(): string[] {
  return Object.keys(LAYOUT_CATALOG.bookTemplates);
}

export function normalizeBookTemplateId(raw: string | null | undefined): string {
  if (raw && raw in LAYOUT_CATALOG.bookTemplates) return raw;
  return DEFAULT_BOOK_TEMPLATE_ID;
}

function geometryAllows(rule: { pageSizes: readonly string[]; orientations: readonly string[] }, g: ProjectPageGeometry) {
  return rule.pageSizes.includes(g.size) && rule.orientations.includes(g.orientation);
}

export function layoutMatchesGeometry(layout: LayoutRecord, geometry: ProjectPageGeometry): boolean {
  return geometryAllows(layout.geometry, geometry);
}

export function resolveCanonicalLayoutId(layoutId: string, catalog: LayoutCatalog = LAYOUT_CATALOG): string {
  const seen = new Set<string>();
  let id = layoutId;
  for (;;) {
    if (seen.has(id)) {
      throw new Error(`replacedBy cycle involving ${layoutId}`);
    }
    seen.add(id);
    const row = catalog.layouts[id];
    if (!row) {
      throw new Error(`Unknown layout id: ${id}`);
    }
    const next = row.replacedBy;
    if (!next) return id;
    id = next;
  }
}

function eligiblePoolMembers(poolId: string, geometry: ProjectPageGeometry, catalog: LayoutCatalog): string[] {
  const pool = catalog.pools[poolId];
  if (!pool) return [];
  const out: string[] = [];
  const dedupe = new Set<string>();
  for (const layoutId of pool.memberLayoutIds) {
    if (!catalog.layouts[layoutId]) continue;
    const canonical = resolveCanonicalLayoutId(layoutId, catalog);
    const layout = catalog.layouts[canonical];
    if (!layout) continue;
    if (!layout.tags.includes(pool.layoutTag)) continue;
    if (!layoutMatchesGeometry(layout, geometry)) continue;
    if (dedupe.has(canonical)) continue;
    dedupe.add(canonical);
    out.push(canonical);
  }
  return out;
}

function stableIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

function resolveRoleToLayoutId(
  role: PageRole,
  assignment: RoleAssignment,
  context: { projectId: string; bookTemplateId: string; geometry: ProjectPageGeometry },
  catalog: LayoutCatalog,
): string {
  if (assignment.kind === "fixed") {
    return resolveCanonicalLayoutId(assignment.layoutId, catalog);
  }
  const members = eligiblePoolMembers(assignment.poolId, context.geometry, catalog);
  if (members.length === 0) {
    throw new Error(`No eligible layouts for pool ${assignment.poolId} (${role})`);
  }
  const pool = catalog.pools[assignment.poolId];
  if (pool.selection === "first_compatible") return members[0];
  if (pool.selection === "single") {
    if (members.length !== 1) {
      throw new Error(`Pool ${assignment.poolId} expected a single eligible member`);
    }
    return members[0];
  }
  const seed = `${context.projectId}:${context.bookTemplateId}:${role}`;
  const idx = stableIndex(seed, members.length);
  return members[idx];
}

/** Stable keys for MVP skeleton assignments (Preview/PDF expand per deliverable later). */
const MVP_ROLE_KEYS: PageRole[] = ["cover", "toc", "chapter_opener", "body"];

export function computeInitialLayoutAssignments(context: {
  projectId: string;
  bookTemplateId: string;
  geometry: ProjectPageGeometry;
  catalog?: LayoutCatalog;
}): Record<string, string> {
  const catalog = context.catalog ?? LAYOUT_CATALOG;
  const templateId = normalizeBookTemplateId(context.bookTemplateId);
  const templates = catalog.bookTemplates as Record<string, BookTemplateRecord>;
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Unknown book template: ${templateId}`);
  }
  if (template.compatibleGeometry && !geometryAllows(template.compatibleGeometry, context.geometry)) {
    throw new Error(`Book template ${templateId} is incompatible with page geometry`);
  }
  const out: Record<string, string> = {};
  for (const role of MVP_ROLE_KEYS) {
    const binding = template.roleBindings[role];
    if (!binding) continue;
    const layoutId = resolveRoleToLayoutId(role, binding, { ...context, bookTemplateId: templateId }, catalog);
    out[`main:${role}`] = layoutId;
  }
  return out;
}

export function bookTemplateIdsForGeometry(geometry: ProjectPageGeometry, catalog: LayoutCatalog = LAYOUT_CATALOG): string[] {
  return Object.entries(catalog.bookTemplates)
    .filter(([, tpl]) => {
      if (!tpl.compatibleGeometry) return true;
      return geometryAllows(tpl.compatibleGeometry, geometry);
    })
    .map(([id]) => id);
}

export type ManifestValidationIssue = { code: string; message: string };

export function validateManifest(catalog: LayoutCatalog = LAYOUT_CATALOG): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  if (!catalog.catalogVersion?.trim()) {
    issues.push({ code: "catalog_version", message: "catalogVersion is required" });
  }

  for (const [poolId, pool] of Object.entries(catalog.pools)) {
    for (const layoutId of pool.memberLayoutIds) {
      if (!catalog.layouts[layoutId]) {
        issues.push({ code: "pool_member", message: `Pool ${poolId} references missing layout ${layoutId}` });
        continue;
      }
      let canonical: string;
      try {
        canonical = resolveCanonicalLayoutId(layoutId, catalog);
      } catch (e) {
        issues.push({
          code: "pool_resolve",
          message: `Pool ${poolId} member ${layoutId}: ${e instanceof Error ? e.message : String(e)}`,
        });
        continue;
      }
      const layout = catalog.layouts[canonical];
      if (!layout.tags.includes(pool.layoutTag)) {
        issues.push({
          code: "pool_tag",
          message: `Pool ${poolId} member ${canonical} missing tag ${pool.layoutTag}`,
        });
      }
    }
  }

  for (const [tid, tpl] of Object.entries(catalog.bookTemplates)) {
    for (const [role, binding] of Object.entries(tpl.roleBindings)) {
      if (binding.kind === "fixed") {
        const id = resolveCanonicalLayoutId(binding.layoutId, catalog);
        if (!catalog.layouts[id]) {
          issues.push({ code: "template_fixed", message: `Template ${tid} role ${role} → missing layout ${binding.layoutId}` });
        }
      } else {
        if (!catalog.pools[binding.poolId]) {
          issues.push({ code: "template_pool", message: `Template ${tid} role ${role} → missing pool ${binding.poolId}` });
        }
      }
    }
  }

  for (const [id, layout] of Object.entries(catalog.layouts)) {
    if (!layout.replacedBy) continue;
    const target = layout.replacedBy;
    if (id === target) {
      issues.push({ code: "replaced_by_self", message: `Layout ${id} replaces itself` });
    }
    if (!catalog.layouts[target]) {
      issues.push({ code: "replaced_by_missing", message: `Layout ${id} replacedBy unknown target ${target}` });
      continue;
    }
    try {
      resolveCanonicalLayoutId(id, catalog);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("cycle")) {
        issues.push({ code: "replaced_by_cycle", message: `replacedBy cycle near layout ${id}` });
      } else {
        issues.push({ code: "replaced_by_resolve", message: msg });
      }
    }
  }

  return issues;
}
