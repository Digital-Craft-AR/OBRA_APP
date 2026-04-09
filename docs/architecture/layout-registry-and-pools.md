# Layout registry, book templates, and pools (engineering)

**Version:** 1.1  
**Last update:** April 2026  
**Product reference:** `[features/wizard-preview/wizard-preview.md](../../features/wizard-preview/wizard-preview.md)`  
**Scope:** Physical implementation of `**book_template_id`**, the **layout registry**, **tagged pools** (as building blocks), shared packaging for **Preview + PDF**, **CI validation**, and `**replacedBy` resolution**.

---

## 1) Goals

- **Single source of truth** in the **monorepo** for MVP (not Postgres-editable catalog rows).
- **Creators pick a pre-assembled book template** (`book_template_id` on the project), not a per-page random layout UX.
- **Same behavior** in **in-app preview** and **PDF generation** (shared module import).
- **Declarative manifest** (book templates, layouts, pools, slot schemas, geometry rules) **separate from** per-layout `render` implementations.
- **Stable persistence:** logical pages store `**layout_variant_id`** once resolved; optional `**layout_catalog_version**` / template version for deploy alignment; **no per-page RNG seed** in MVP.
- **Safe removal:** retired layout ids map through `**replacedBy`** at render time; CI prevents orphan ids and replacement cycles.

---

## 2) Repository layout (recommended)

Place a **shared package** under the monorepo so both the Vite app and the PDF worker (Edge Function bundle or Node entry) depend on one artifact. Exact folder names are flexible; the **invariant** is: **one package**, **two consumers** (browser build + PDF worker build).

Suggested shape:

- Manifest module(s): `bookTemplates`, `layouts`, `pools`, `catalogVersion`.
- `registry.ts`: resolve `book_template_id` + page role → layout id; `resolveLayoutId`; pool helpers; `validateManifest`.
- `renderers/`: one implementation per `layoutId`.
- `index.ts`: public exports.

---

## 3) Manifest format

The manifest is **data-only** (TypeScript `as const` object, or JSON loaded and parsed). Render functions are **registered by layout id** in code.

### 3.1 Top level


| Field            | Required | Description                                                                                                                         |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `catalogVersion` | yes      | Bump when template bindings, pool membership, or layout contracts change in a breaking way. Exposed via API for mismatch detection. |
| `layouts`        | yes      | Map of `layoutId` → layout record.                                                                                                  |
| `pools`          | yes      | Map of `poolId` → pool record (optional **internal** building blocks; see §5).                                                      |
| `bookTemplates`  | yes      | Map of `bookTemplateId` → book template record (see §4).                                                                            |


### 3.2 Layout record


| Field        | Required | Description                                                                                                                                                                       |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tags`       | yes      | Non-empty array of **layout tags**: `cover`, `toc`, `chapter_opener`, `continuation`, `body`, etc. Default convention: **one primary tag** per layout unless product allows more. |
| `geometry`   | yes      | Supported **page sizes** and **orientations** (must match project design for that layout to be eligible).                                                                         |
| `slots`      | yes      | **Slot schema** array: stable `key`, constraints (`maxKb`, max width/height, aspect hints), and whether required for export.                                                      |
| `deprecated` | no       | If true, **new** assignments should not target this id; persisted ids still resolve.                                                                                              |
| `replacedBy` | no       | Target `layoutId` for runtime resolution (§7).                                                                                                                                    |


### 3.3 Pool record (tagged internal pool)

Pools are **named** buckets used **inside book templates** when a role allows variation (e.g. body pages). They are **not** the primary product surface—the **book template** is.


| Field             | Required | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `layoutTag`       | yes      | Every `memberLayoutId` must include this tag on the resolved layout. |
| `memberLayoutIds` | yes      | Candidate layout ids (order may matter for `first_compatible`).      |
| `selection`       | yes      | `uniform_random` | `first_compatible` | `single` (see §5).           |


### 3.4 Pool naming conventions

- Stable `**poolId`** strings; referenced only from **book template** role rules, not from end-user UI.
- **Product rule:** Cover and TOC/index are assigned by the **template** (fixed layouts), not by ad-hoc random pools outside template scope.

---

## 4) Book templates (`book_template_id`)

### 4.1 Product binding

- Each **project** persists `**book_template_id`** (chosen in **Structure / Design**, aligned with `wizard-shared` when that flow defines the picker).
- Preview and PDF **resolve** which `layoutId` applies to each **logical page** by:  
`**book_template_id`** + **project geometry** + **page role** (and indices such as body page ordinal inside a chapter, if the template defines rotation).

### 4.2 Book template record


| Field                | Required | Description                                                                                                                                         |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`              | no       | Internal / design-system label (not necessarily user-facing).                                                                                       |
| `roleBindings`       | yes      | Map from **page role** (product-defined enum, e.g. `cover`, `toc`, `chapter_opener`, `continuation`, `body`) to an **assignment rule** (see below). |
| `compatibleGeometry` | optional | If set, template is only offerable when project page size/orientation is allowed; otherwise validate per-layout at resolve time.                    |


### 4.3 Assignment rule (per role)

Exactly one strategy per bound role:

1. `**fixed`**: single `layoutId` (no pool). Used for predictable pages (cover, TOC, opener, or a template that fixes body layout).
2. `**pool**`: `poolId` reference + same **selection** semantics as §5 (e.g. `uniform_random` for body pages inside an otherwise fixed template).

Templates may use `**fixed` for all roles** (fully deterministic book) or mix `**fixed` + `pool`** (e.g. fixed opener, pooled body).

### 4.4 Persistence of resolved layouts

- On **first materialization** of a logical page (or first visit to Preview), run the **resolver** and persist `**layout_variant_id`** on that entity so refreshes do not reshuffle—unless product explicitly re-runs assignment (e.g. after template change).
- `**replacedBy**` still applies when reading persisted ids (§7).

### 4.5 Changing `book_template_id` on an existing project

Product policy (document in API/UX): warn that **slot keys / layouts may differ**; may require **re-resolving** pages, **invalidating** mismatched image slots, or blocking until user confirms. Out of scope to fully specify here—must be explicit before shipping template switching.

---

## 5) Selection modes (pools)


| `selection`        | Behavior                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `uniform_random`   | Among resolved, geometry-eligible members, pick uniformly when first assigning; **persist** chosen id. |
| `first_compatible` | First eligible member after filters.                                                                   |
| `single`           | Exactly one eligible member after filters, else **CI/build fails**.                                    |


**Geometry filter:** drop members whose layout `geometry` does not include the project’s page size and orientation.

---

## 6) Renderer registration

- **Manifest does not import React/DOM.** A separate module maps `layoutId` → `renderPage(context)`.
- **CI must verify:** every layout id referenced from **book templates** and **pools** has a renderer; every renderer key exists in `layouts`; slot usage matches manifest (strict or allowlisted policy—pick one and test).

---

## 7) `resolveLayoutId` (deprecation)

1. Let `id` be the persisted layout id.
2. While `layouts[id].replacedBy` is set, set `id = layouts[id].replacedBy` (detect **cycles** in CI).
3. If `layouts[id]` is missing, **fail loudly** in development/staging; in production, log and fall back to a **product-defined default** for that tag.

---

## 8) Deploy alignment (preview vs PDF worker)

- **Risk:** Frontend and PDF worker ship different `catalogVersion`.
- **Mitigations:** release **together** when possible; API returns `**layout_catalog_version`** (and optionally **book template catalog version**) with the render model; client or worker **refuses** or errors on unsupported combinations.

---

## 9) CI / unit test checklist

1. **Manifest schema valid:** `bookTemplates`, `layouts`, `pools` consistent; no dangling references.
2. **Book template coverage:** every `roleBindings` entry references valid `layoutId` or `poolId`.
3. **Renderer coverage** for all referenced layout ids.
4. **Pool integrity** for each pool and supported project geometry (at least one eligible member when product claims support), or document limitations.
5. `**replacedBy` graph:** acyclic; targets exist.
6. **Tag consistency:** pool members match `pool.layoutTag` after resolution.

---

## 10) Related documents

- `[features/wizard-preview/wizard-preview.md](../../features/wizard-preview/wizard-preview.md)` — product behavior, user stories, render pipeline expectations.
- `[ARQUITECTURA_Obra.md](../../ARQUITECTURA_Obra.md)` — system hub; PDF via Puppeteer / Edge Functions.
- `[docs/architecture/backend.md](backend.md)` — API and worker boundaries when exposing render model.
- `[docs/architecture/frontend.md](frontend.md)` — Preview shell and iframe rendering.