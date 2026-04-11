export type PageSize = "a4" | "letter";
export type PageOrientation = "portrait" | "landscape";

export type ProjectPageGeometry = {
  size: PageSize;
  orientation: PageOrientation;
};

export type LayoutTag = "cover" | "toc" | "chapter_opener" | "body";

export type PageRole = LayoutTag;

export type LayoutGeometryRule = {
  pageSizes: readonly PageSize[];
  orientations: readonly PageOrientation[];
};

export type LayoutSlotSchema = {
  key: string;
  maxKb?: number;
  requiredForExport?: boolean;
};

export type LayoutRecord = {
  tags: readonly LayoutTag[];
  geometry: LayoutGeometryRule;
  slots: readonly LayoutSlotSchema[];
  deprecated?: boolean;
  replacedBy?: string;
};

export type PoolSelection = "uniform_random" | "first_compatible" | "single";

export type PoolRecord = {
  layoutTag: LayoutTag;
  memberLayoutIds: readonly string[];
  selection: PoolSelection;
};

export type AssignmentFixed = { kind: "fixed"; layoutId: string };
export type AssignmentPool = { kind: "pool"; poolId: string };
export type RoleAssignment = AssignmentFixed | AssignmentPool;

export type BookTemplateRecord = {
  label: string;
  roleBindings: Record<PageRole, RoleAssignment>;
  compatibleGeometry?: LayoutGeometryRule;
};

export type LayoutCatalog = {
  catalogVersion: string;
  layouts: Record<string, LayoutRecord>;
  pools: Record<string, PoolRecord>;
  bookTemplates: Record<string, BookTemplateRecord>;
};
