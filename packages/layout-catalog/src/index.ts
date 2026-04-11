export type {
  AssignmentFixed,
  AssignmentPool,
  BookTemplateRecord,
  LayoutCatalog,
  LayoutRecord,
  LayoutTag,
  PageRole,
  PageOrientation,
  PageSize,
  ProjectPageGeometry,
  RoleAssignment,
} from "./types";
export { DEFAULT_BOOK_TEMPLATE_ID, LAYOUT_CATALOG } from "./manifest";
export type { BookTemplateId } from "./manifest";
export {
  bookTemplateIdsForGeometry,
  computeInitialLayoutAssignments,
  getLayoutCatalog,
  getLayoutCatalogVersion,
  layoutMatchesGeometry,
  listBookTemplateIds,
  normalizeBookTemplateId,
  resolveCanonicalLayoutId,
  validateManifest,
} from "./registry";
export type { ManifestValidationIssue } from "./registry";
