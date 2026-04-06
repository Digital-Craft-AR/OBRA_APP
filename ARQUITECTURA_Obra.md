# Obra architecture (hub)

**Version:** 2.0  
**Date:** April 2026  
**Stack:** React + Vite + TypeScript · Supabase · Claude API · Gemini API · Vercel

This file is the architecture entry point. Detailed implementation is split by domain:

- Backend architecture: [`docs/architecture/backend.md`](docs/architecture/backend.md)
- Frontend architecture: [`docs/architecture/frontend.md`](docs/architecture/frontend.md)
- Business logic architecture: [`docs/architecture/business_logic.md`](docs/architecture/business_logic.md)
- Canonical project/ebook data model (shared appendix): [`docs/architecture/project-ebook-data-model.md`](docs/architecture/project-ebook-data-model.md)

## 1) System summary

Obra uses a browser frontend (React) that talks to Supabase for auth, data, storage, and Edge Functions.
External providers (Claude, Gemini, Puppeteer, Mercado Pago webhooks) are integrated from backend functions only, never from the client.

```text
Browser (React/Vite)
  -> Supabase (Auth + Postgres + Storage + Edge Functions)
    -> Claude API (text)
    -> Gemini API (images)
    -> Puppeteer (PDF)
    -> Mercado Pago webhooks
```

## 2) Domain split

### Backend

Owns data persistence, RLS, storage paths, edge-function orchestration, idempotency, and operational reliability.

Read: [`docs/architecture/backend.md`](docs/architecture/backend.md)

### Frontend

Owns route/module composition, state management, i18n rendering, wizard/editor/preview UX, and client-side quality constraints.

Read: [`docs/architecture/frontend.md`](docs/architecture/frontend.md)

### Business logic

Owns lifecycle and invariant rules across the three-step journey (Structure, Content, Preview), including phase transitions, reset/duplicate semantics, and credit-success behavior.

Read: [`docs/architecture/business_logic.md`](docs/architecture/business_logic.md)

## 3) Primary references

- Product source of truth: [`PRD_Obra.md`](PRD_Obra.md)
- Feature-level specs:
  - [`features/wizard-shared/wizard-shared.md`](features/wizard-shared/wizard-shared.md)
  - [`features/wizard-ai-generation/wizard-ai-generation.md`](features/wizard-ai-generation/wizard-ai-generation.md)
  - [`features/wizard-upload/wizard-upload.md`](features/wizard-upload/wizard-upload.md)
  - [`features/wizard-preview/wizard-preview.md`](features/wizard-preview/wizard-preview.md)
- UI rules and tokens: [`CONVENCIONES.md`](CONVENCIONES.md)
- Engineering context: [`CLAUDE.md`](CLAUDE.md)
- Operational docs index: [`docs/README.md`](docs/README.md)

When product and architecture docs diverge, `PRD_Obra.md` and feature specs win for product behavior.
# Arquitectura Técnica — Obra (obra.app)
**Versión:** 1.1  
**Fecha:** Abril 2026  
**Stack:** React + Vite + TypeScript · Supabase · Claude API · Gemini API (Nano Banana) · Vercel  
**Referencias:** `PRD_Obra.md` (producto y negocio), `CONVENCIONES.md` (UI), documentación interna en `docs/`.

---

## 1. Visión general del sistema

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTE (Browser)                  │
│              React + Vite + TypeScript               │
│           shadcn/ui · Tailwind · i18next             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│                  SUPABASE (BaaS)                     │
│  Auth · PostgreSQL · Storage · Edge Functions        │
└──────┬───────────────┬──────────────────┬───────────┘
       │               │                  │
┌──────▼──────┐ ┌──────▼──────┐ ┌────────▼────────┐
│ Claude API  │ │ Gemini API  │ │   Puppeteer     │
│ (contenido) │ │(Nano Banana)│ │  (export PDF)   │
└─────────────┘ └─────────────┘ └─────────────────┘
```

El frontend React se comunica exclusivamente con Supabase. Supabase expone Edge Functions que actúan como proxy seguro hacia las APIs externas (Claude, Gemini API / Nano Banana para imágenes, Puppeteer). Las API keys nunca se exponen al cliente.

### 1.1 Datos, hosting y residencia

- **Empresa:** Argentina (usuarios en AR y BR: ver **PRD §15** — privacidad, LGPD, Términos).
- **Frontend:** despliegue en **Vercel** (edge/CDN según configuración del proyecto).
- **Datos y lógica BaaS:** **Supabase** — al crear el proyecto en el dashboard de Supabase, elegir **región LATAM** (p. ej. Sudamérica) si está disponible; documentar la región y el identificador del proyecto en **`docs/infrastructure/supabase.md`**.
- **APIs de IA:** Anthropic, Google Gemini (imágenes vía Nano Banana / Gemini API) — datos de contenido procesados según política de privacidad; sin claves en cliente.

### 1.2 Notificaciones (PRD §11 — modelo B)

- **Correo de cuenta:** plantillas **Supabase Auth** (reset, verificación, etc.). **Verificación:** email/contraseña requiere `email_confirmed_at` **antes** de exponer checkout de suscripción; pantalla dedicada si el usuario entra sin verificar — ver **PRD §11 Adquisición**.
- **Auth multi-proveedor:** **Supabase Auth** con **identity linking** (email + OAuth, p. ej. Google) hacia **un `user_id`**; misma regla de negocio que **PRD §11** — vinculación de identidades; evitar duplicados por mismo email verificado.
- **Pagos:** **Mercado Pago** (comprobantes / avisos según su flujo); **webhooks** MP → Edge Function que actualiza estado de suscripción y dispara **avisos in-app** (créditos, renovación, fallo de cobro).

### 1.3 Observabilidad (PRD §9 — modelo B)

- **Logs:** **Vercel** + **Supabase** (Edge Functions, DB); sin agregador unificado obligatorio en v1.0.
- **Alertas:** fallos de **webhooks MP**, picos **5xx** en funciones, umbral de **costo IA** diario — canales y umbrales según PRD.
- **Logging en código:** estructurado cuando sea posible; **sin** texto de prompts completos, contenido de ebooks ni PII en claro (ids y códigos de error).

### 1.4 Backups y recuperación (PRD §15 D — modelo B)

- **Supabase:** activar **PITR** u opción equivalente **según plan**; revisar documentación del tier al provisionar.
- **Copias externas:** job programado (CI o cron) con **dump lógico** periódico + plan para **Storage**; destino **cifrado** fuera de la única cuenta de producción (ver PRD).
- **Runbook:** procedimiento interno de restauración y **prueba** periódica en staging.

### 1.5 Incidentes y proveedores externos (PRD §9 — modelo B)

- **Runbook interno:** **`docs/operations/incident-runbook.md`** — comprobar estado en paneles de **IA**, **pagos**, **Supabase**, **Vercel**; si el fallo es largo, preparar **banner** en app; **email masivo** solo si afecta cobros o datos.
- **Status page pública:** fuera del MVP (post-MVP).
- **Idempotencia / créditos:** el backend solo confirma consumo de créditos tras **éxito** de la operación (alinear con PRD).

### 1.6 Lanzamiento (PRD §16 — soft launch)

- **Soft launch:** tráfico y pagos permitidos; **marketing agresivo** solo tras el **checklist “listo para cobrar”** del PRD.
- El equipo marca en revisión conjunta los ítems del checklist antes de escalar adquisición.
- **Smoke manual pre-producción:** **`docs/operations/smoke-test.md`**.

### 1.7 Documentación en el repositorio (`docs/`)

Material operativo y de desarrollo **en inglés**; el PRD sigue siendo la fuente de verdad de producto.

| Ruta | Contenido |
|------|-----------|
| **`docs/README.md`** | Índice de la carpeta |
| **`docs/operations/incident-runbook.md`** | Respuesta a incidentes, paneles de proveedores, reglas de comunicación (PRD §9) |
| **`docs/operations/smoke-test.md`** | Checklist de smoke antes de deploy (PRD §16) |
| **`docs/development/ci-pipeline.md`** | Expectativas de CI/E2E Playwright y decisiones abiertas (PRD §16) |
| **`docs/infrastructure/supabase.md`** | Región, ref de proyecto, PITR — completar tras provisionar Supabase |

---

## 2. Estructura de carpetas del proyecto

Raíz del **repositorio Git** (monorepo liviano: app + especificaciones + ops):

```
OBRA_APP/
├── .gitignore                      # P. ej. .claude/worktrees/ (copias worktree de Claude Code; no versionar)
├── PRD_Obra.md
├── ARQUITECTURA_Obra.md
├── CONVENCIONES.md
├── CLAUDE.md                       # Contexto de ingeniería (Cursor, Claude Code, etc.)
├── features/                       # PRDs por feature (inglés); extienden el PRD maestro
├── docs/                           # Ver §1.7
│   ├── README.md
│   ├── operations/
│   │   ├── incident-runbook.md
│   │   └── smoke-test.md
│   ├── development/
│   │   └── ci-pipeline.md
│   └── infrastructure/
│       └── supabase.md
└── obra/                           # Aplicación (Vite + React); árbol detallado debajo
```

```
obra/
├── src/
│   ├── app/                        # Páginas (React Router v6)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/          # Lista de proyectos
│   │   │   ├── help/               # Centro de ayuda / FAQ (MVP)
│   │   │   ├── settings/           # Cuenta: exportar datos, eliminar cuenta (PRD §15)
│   │   │   └── project/
│   │   │       ├── [id]/
│   │   │       │   ├── wizard/     # Onboarding wizard
│   │   │       │   ├── editor/     # Editor del ebook
│   │   │       │   ├── landing/    # Editor de landing (post-MVP)
│   │   │       │   └── export/     # Exportación
│   │   └── (marketing)/
│   │       └── page/               # Landing pública de Obra
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (auto-generado)
│   │   ├── wizard/                 # Pasos del onboarding
│   │   │   ├── WizardShell.tsx
│   │   │   ├── StepTopic.tsx
│   │   │   ├── StepAvatar.tsx
│   │   │   ├── StepStructure.tsx
│   │   │   ├── StepDesign.tsx      # Paleta, tipografías, notas de estilo, **defaults de imagen** (`image_mode`, `image_style` — sin llamada a image-generate en el wizard; ver `features/wizard-shared/wizard-shared.md`)
│   │   │   └── AiAssistField.tsx   # Campo con botón "Optimizar con IA"
│   │   ├── editor/
│   │   │   ├── EbookPreview.tsx    # Vista previa HTML en iframe
│   │   │   ├── ChapterPanel.tsx
│   │   │   ├── ImageSlot.tsx       # Imagen con opciones: regenerar/subir
│   │   │   └── DesignPanel.tsx     # Paleta + tipografías
│   │   ├── landing/                # post-MVP (tienda / liquid)
│   │   │   ├── LandingPreview.tsx
│   │   │   ├── BlockEditor.tsx     # Editor de cada bloque liquid
│   │   │   └── blocks/             # Un componente por bloque
│   │   │       ├── HeroBlock.tsx
│   │   │       ├── PainBlock.tsx
│   │   │       ├── BenefitsBlock.tsx
│   │   │       ├── SolutionBlock.tsx
│   │   │       ├── BonusesBlock.tsx
│   │   │       ├── PriceBlock.tsx   # Incluye countdown timer
│   │   │       ├── GuaranteeBlock.tsx
│   │   │       ├── TestimonialsBlock.tsx
│   │   │       ├── FaqBlock.tsx
│   │   │       └── AuthorBlock.tsx  # Opcional
│   │   └── shared/
│   │       ├── ProjectCard.tsx
│   │       ├── ColorPicker60_30_10.tsx
│   │       ├── FontPairSelector.tsx
│   │       └── ExportButton.tsx
│   │
│   ├── hooks/
│   │   ├── useProject.ts           # CRUD de proyectos
│   │   ├── useAi.ts                # Llamadas a Edge Functions de IA
│   │   ├── useImages.ts            # Generación (image-generate) y upload; respeta §6 y defaults del proyecto (wizard-shared)
│   │   └── useExport.ts            # Trigger de exportación PDF
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Cliente Supabase
│   │   ├── prompts.ts              # Todos los prompts de Claude centralizados
│   │   └── utils.ts
│   │
│   ├── store/
│   │   └── projectStore.ts         # Zustand — estado del proyecto activo
│   │
│   ├── types/
│   │   └── index.ts                # Tipos TypeScript globales
│   │
│   └── i18n/
│       └── …                       # Recursos UI `es` y `pt-BR` (nombres de archivo según setup i18next)
│
├── supabase/
│   └── functions/                  # Edge Functions (Deno)
│       ├── ai-optimize/            # Optimizar texto con Claude
│       ├── parse-document/         # Extraer texto de .docx / PDF (tras paso diseño — rama Upload; ver PRD §4)
│       ├── ai-generate-content/    # Generar contenido del ebook
│       ├── ai-generate-index/      # Generar índice de capítulos
│       ├── ai-generate-landing/    # Generar bloques de landing (post-MVP)
│       ├── ai-generate-html/       # Generar HTML del ebook
│       ├── image-generate/         # Generar imagen con Gemini API (Nano Banana)
│       ├── export-pdf/             # Generar PDF con Puppeteer
│       ├── export-user-data/       # Paquete portabilidad LGPD-style (PRD §15)
│       ├── delete-account/         # Baja de cuenta + MP + purge (PRD §15)
│       ├── mercadopago-webhook/    # Webhooks MP → suscripción, pagos, avisos (PRD §11)
│       └── purge-deleted-projects/ # Hard delete proyectos tras 30 días (cron; ver PRD)
│
├── e2e/                            # Playwright — pocas specs (PRD §16, modelo B)
│
├── public/
├── .env.local                      # Variables de entorno (nunca al repo)
└── package.json
```

**Nota:** el árbol bajo `src/` describe la **organización lógica** alineada al PRD (wizard, editor, dashboard). La implementación puede usar **`src/pages/`** + `App.tsx` y React Router en lugar de carpetas `src/app/(auth)/`, manteniendo las mismas responsabilidades.

### 2.1 Pruebas (PRD §16 — modelo B)

- **E2E:** **Playwright** en carpeta `e2e/` — **1–3** flujos críticos (login, crear proyecto, paso de wizard); **mocks** de IA en CI cuando sea posible para costo y estabilidad. Pipeline y decisiones abiertas: **`docs/development/ci-pipeline.md`**.
- **Smoke manual:** **`docs/operations/smoke-test.md`** (PRD §16) — pagos MP, webhooks, créditos, camino feliz, teclado en wizard, tramos opcionales legal/performance.

### 2.2 Frontend — accesibilidad (PRD §4)

- **Base:** componentes **shadcn/ui** (Radix) con patrones de foco y diálogos alineados a **WCAG 2.1 nivel A**; reforzar en vistas propias (**wizard**, **editor**, formularios de cuenta).
- **Implementación:** asociar **labels** a inputs; **orden de foco** explícito donde el DOM no baste (pasos del wizard); **live regions** acotadas para resultados de IA; **contraste** de texto y estados de error no solo cromáticos — coherente con **CONVENCIONES** de color.
- **Herramientas:** **eslint-plugin-jsx-a11y** (u equivalente) en el pipeline de lint del frontend; correcciones iterativas, sin bloquear merge por reglas ruidosas hasta acordar severidad.
- **Alcance:** el **HTML/PDF del infoproducto** para el comprador final no se trata como entregable accesible en v1.0 (ver PRD §4).

### 2.3 Frontend — rendimiento percibido (PRD §4)

- **Enrutado:** **React Router** con **code splitting** por ruta en vistas pesadas (**proyecto**, **editor**, **export**) para reducir el bundle inicial del login/dashboard.
- **Datos:** **Suspense** o estados de carga consistentes; evitar **cascadas** innecesarias al entrar al wizard (agrupar fetches o usar datos del paso actual).
- **IA:** peticiones con **cancelación** o ignorar respuestas obsoletas al cambiar de paso; UI en **loading** hasta respuesta o error; **streaming** de texto si la Edge Function y el cliente lo exponen sin duplicar lógica.
- **PDF / importación:** feedback de progreso acorde a duración real; no permitir **doble submit** en export ni en upload.
- **Medición:** **Vercel Speed Insights** u otra fuente de vitals **opcional** en producción; revisión manual con Lighthouse en builds candidatos (alinear con PRD §16).

### 2.4 Conversión y demostración de valor (PRD §11)

- **Video** y **recorrido interactivo** (ambos requeridos a nivel producto) hasta exportación PDF; la implementación puede repartirse entre **landing pública** (`(marketing)` / página de Obra) y **flujo dentro de la app** (tour guiado), según diseño UX.

---

## 3. Base de datos (PostgreSQL via Supabase)

### Esquema completo

```sql
-- Usuarios (manejado por Supabase Auth)
-- La tabla auth.users existe automáticamente

-- Perfil extendido del usuario
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users PRIMARY KEY,
  full_name   TEXT,
  plan        TEXT DEFAULT 'base', -- v1.0: un solo plan comercial (PRD §11); ampliar valores si hay más planes
  ui_locale   TEXT DEFAULT 'es' CHECK (ui_locale IN ('es', 'pt-BR')), -- idioma de la app; editable por el usuario
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos: máx. 20 activos por usuario (archived_at IS NULL AND deleted_at IS NULL); archivados ilimitados
-- Wizard / journey: no global stepper index on this table (PRD_Obra.md §3); derive from domain + structure_completed_at.
-- content_locale, author, topic, problem, target_avatar: single source of truth on project; join ebooks → projects for IA / export context (no duplicate columns on ebooks).
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'modified')), -- respecto del último export; ver PRD_Obra.md §3
  content_locale  TEXT NOT NULL CHECK (content_locale IN ('es', 'pt-BR', 'en-US', 'en-GB')), -- salida del proyecto; inmutable en app tras INSERT
  content_source  TEXT NOT NULL CHECK (content_source IN ('ai', 'upload')), -- chosen at project creation; wizard-upload vs AI content path
  author          TEXT,                 -- optional; wizard main-title step — see wizard-shared, wizard-preview
  topic           TEXT,                 -- wizard topic step; long-form input for IA prompts
  problem         TEXT,                 -- reader / avatar problem statement; wizard + content IA
  target_avatar   JSONB,                -- audience persona JSON; canonical on project — join from ebooks via project_id
  structure_completed_at TIMESTAMPTZ,   -- NULL until Structure + design promoted to design_systems + ebook package; not the 3-step UI index
  archived_at     TIMESTAMPTZ,           -- NULL = no archivado; si set, no cuenta en el límite de 20 activos
  deleted_at      TIMESTAMPTZ,           -- NULL = no en papelera; si set, soft delete — hard delete tras 30 días (job programado)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Draft wizard payload (hybrid C): JSON until user completes Design; then promote to projects + design_systems + ebooks and delete or clear this row.
-- Optimistic concurrency: UPDATE ... SET payload = $p, updated_at = now() WHERE project_id = $id AND updated_at = $client_seen; if 0 rows, return 409 Conflict.
CREATE TABLE project_structure_drafts (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  payload    JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sistema de diseño (1 por proyecto)
-- Extra Design-step fields: wizard-shared (page, preset, style notes, image defaults).
CREATE TABLE design_systems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  color_primary   TEXT NOT NULL,      -- 60% — hex
  color_secondary TEXT NOT NULL,      -- 30% — hex
  color_accent    TEXT NOT NULL,      -- 10% — hex
  font_display    TEXT NOT NULL,      -- Google Font para títulos
  font_body       TEXT NOT NULL,      -- Google Font para cuerpo
  page_size       TEXT NOT NULL,      -- e.g. A4, Letter — export / preview
  page_orientation TEXT NOT NULL CHECK (page_orientation IN ('portrait', 'landscape')),
  preset_id       TEXT,                -- NULL when fully custom
  is_custom_from_preset BOOLEAN NOT NULL DEFAULT false,
  style_notes     TEXT,
  image_mode      TEXT,               -- ai_assisted | placeholders_first — defaults del wizard; ver wizard-shared
  image_style     TEXT,               -- catálogo alineado a PRD_Obra §6; entradas al pipeline de preview/imagen
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ebooks: máx. 1 main + 5 bonus + 2 order_bump por proyecto (v1.0; validar en app o triggers)
-- Locale, author, persona, problem: read from projects via project_id (no duplication).
CREATE TABLE ebooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('main', 'bonus', 'order_bump')),
  title         TEXT,
  subtitle      TEXT,
  layout_template_html TEXT,          -- optional per-ebook HTML shell / placeholders; canonical body text lives in chapters.content; full page for PDF = compose template + chapter bodies (see wizard-preview)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ebooks_one_main_per_project ON ebooks (project_id) WHERE (type = 'main');
-- Package limits (MVP): enforce in app/API for UX and in DB as final guard.
-- Suggested trigger policy on INSERT/UPDATE of ebooks:
--   - reject if main count > 1
--   - reject if bonus count > 5
--   - reject if order_bump count > 2
-- Keep product limits centralized in one DB function to avoid drift with API constants.

-- Content-phase orchestration (wizard-ai-generation / wizard-upload): one row per project once Structure is done.
-- Cursor + index freeze; not a substitute for chapter body storage (chapters table). Optimistic concurrency: UPDATE ... WHERE updated_at = $seen.
-- Phase CHECK is authoritative in DB; extend only via migration when product adds/renames milestones.
-- Semantics: upload_alignment = upload branch only (content_source = upload) through Approve alignment; main_index = AI path TOC before chapter loop; main_chapter = main ebook chapter loop (both branches after index freeze / alignment).
CREATE TABLE project_content_progress (
  project_id            UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  current_phase         TEXT NOT NULL CHECK (current_phase IN (
                            'upload_alignment',
                            'main_index',
                            'main_chapter',
                            'bonus',
                            'order_bump',
                            'complete'
                          )),
  main_index_frozen_at  TIMESTAMPTZ,       -- set when user leaves index / approves alignment (wizard-ai-generation)
  current_ebook_id      UUID REFERENCES ebooks(id) ON DELETE SET NULL,
  current_chapter_id    UUID REFERENCES chapters(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upload branch: manuscript binary in Storage; metadata here for RLS, clone (copy blob to new path), replace, and trash/purge ordering.
-- At most one "current" row per project (superseded_at IS NULL). On replace: insert new row, set previous.superseded_at, then delete old object from Storage (see PRD consistency ordering).
CREATE TABLE project_manuscripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  mime            TEXT NOT NULL,
  byte_size       BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760), -- PRD_Obra.md §4: 10 MB max
  checksum_sha256 TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at   TIMESTAMPTZ              -- NULL = active manuscript for parse/alignment; set when user replaces file
);

CREATE UNIQUE INDEX project_manuscripts_one_current_per_project
  ON project_manuscripts (project_id)
  WHERE (superseded_at IS NULL);

-- Capítulos de cada ebook (main, bonus, order_bump ebooks all use this table when content is chapter-scoped).
-- User approval per unit (wizard-ai-generation): set approved_at when the user explicitly approves that chapter; NULL = draft / not yet approved.
CREATE TABLE chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id    UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  "order"     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT,                   -- Contenido en markdown o HTML
  image_id    UUID,                   -- FK a images (nullable)
  approved_at TIMESTAMPTZ,            -- NULL until user approves this chapter in Contenido flow
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Contenido scoped chat (wizard-ai-generation): separate threads per PRD — index chat vs per-chapter chat; no cross-artifact leakage.
-- chapter_id IS NULL: exactly one thread per project = "main index / TOC" chat (exists before chapter rows are created).
-- chapter_id set: one thread per chapter row (main, bonus, or order_bump ebook chapters).
CREATE TABLE content_chat_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id  UUID REFERENCES chapters(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX content_chat_threads_one_main_index
  ON content_chat_threads (project_id)
  WHERE (chapter_id IS NULL);

CREATE UNIQUE INDEX content_chat_threads_one_per_chapter
  ON content_chat_threads (chapter_id)
  WHERE (chapter_id IS NOT NULL);

-- Persist user turns server-side with idempotency (MVP): client sends `client_message_id`; server inserts once per thread.
-- Persist assistant turns only after the stream completes (MVP): INSERT one row per completed assistant reply; stream is a client UX concern.
CREATE TABLE content_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES content_chat_threads(id) ON DELETE CASCADE,
  client_message_id TEXT,             -- required for role='user' in API contract; unique per thread for retries
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX content_chat_messages_thread_created ON content_chat_messages (thread_id, created_at);
CREATE UNIQUE INDEX content_chat_messages_thread_client_msg_unique
  ON content_chat_messages (thread_id, client_message_id)
  WHERE (client_message_id IS NOT NULL);

-- Landing pages
CREATE TABLE landing_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  blocks      JSONB NOT NULL DEFAULT '[]', -- Array ordenado de bloques
  preview_html TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Imágenes generadas o subidas
CREATE TABLE images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id   UUID REFERENCES chapters(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,         -- Path en Supabase Storage
  public_url   TEXT NOT NULL,
  prompt_used  TEXT,                  -- Prompt si fue generada con IA
  source       TEXT NOT NULL,         -- ai | upload
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Wizard-related persistence (summary)

- **No** `wizard_context` blob on `projects`: use `topic`, `problem`, `target_avatar`, `author`, and `content_locale` as first-class columns.
- **`content_source`** and **`structure_completed_at`** live on `projects` only; the global three-step position is still **not** stored (see `PRD_Obra.md` §3).
- **`project_structure_drafts`**: in-progress Structure wizard state until design is committed; then promote in a transaction to `projects`, `design_systems`, and `ebooks`, and remove or clear the draft row. **Optimistic locking** on **`updated_at`** (same pattern as `project_content_progress`); no last-write-wins silent overwrite.
- **`ebooks`**: no duplicate of `content_locale`, `author`, `problem`, or `target_avatar`; load **`projects`** by `ebooks.project_id` (or fetch project once per request). Avatar/problem reset updates **`projects`** only; clear dependent content per `PRD_Obra.md` §3.
- **`project_content_progress`**: single row per project for **Contenido** milestone cursor (`current_phase` with **Postgres `CHECK`** on allowed values), optional `current_ebook_id` / `current_chapter_id`, **`main_index_frozen_at`**, and **`updated_at`** for optimistic locking. Allowed phases: `upload_alignment`, `main_index`, `main_chapter`, `bonus`, `order_bump`, `complete` — align app enums and PRDs (`wizard-ai-generation`, `wizard-upload`). **App** must set initial phase by `content_source` (upload → `upload_alignment`; ai → `main_index`).
- **Create `project_content_progress` in the same DB transaction** that sets **`projects.structure_completed_at`**, promotes **`project_structure_drafts`** into canonical `projects` / `design_systems` / `ebooks`, and deletes or clears the draft row. **Invariant:** if `structure_completed_at IS NOT NULL`, a **`project_content_progress` row must exist** for that `project_id`. Do not lazy-insert on first navigation unless the transaction above failed and a repair job runs idempotently.
- **`project_manuscripts`**: one **active** row per project (`superseded_at` NULL) for upload branch; `storage_path` in bucket; **replace** = new row + supersede previous + delete old object per PRD ordering. Supports **project clone** (copy file to new path + new row).
- **`chapters.approved_at`**: per-chapter **Contenido** approval timestamp (`wizard-ai-generation`); applies to chapters under **main, bonus, or order_bump** ebooks. Do not duplicate approval state in `project_content_progress` beyond the cursor. Single-chapter bonuses/bumps: one chapter row with `approved_at` when done.
- **Main ebook TOC (table of contents):** persist as **`chapters` rows** on the **main** `ebook` as soon as the user **confirms the index** (AI path) or **approves alignment** (upload path): `order`, `title`, `content` NULL or empty until generated/prefilled; **`approved_at`** is set when the user **approves that chapter’s body**, not when the TOC is confirmed. **Index freeze** is **`project_content_progress.main_index_frozen_at`** (and phase transition to `main_chapter`), not a separate TOC table. **Reopen index** edits these rows (with PRD confirmation flows when bodies already exist).
- **`content_chat_threads` / `content_chat_messages`:** **Contenido** IA chat only (`wizard-ai-generation`). **`chapter_id` NULL** → single **main-index** thread per `project_id`. **`chapter_id` set** → one thread per **chapter** (main, bonus, or bump). **Upload alignment** UX has **no** persistent project-wide chat in MVP per `wizard-upload`; do not overload these threads for alignment unless product extends the PRD. **User turn persistence (MVP):** server inserts `role='user'` with `client_message_id` idempotency (unique per `thread_id`) after request acceptance; retries must not duplicate rows or charges. **Streaming (MVP):** insert **`assistant` rows only when the generation finishes** (full `content`); no per-chunk DB updates. Mid-stream recovery is client-side or out of scope unless product adds partial/cancel rows later.
- **Avatar/problem reset (confirmed, `PRD_Obra.md` §3):** After clearing dependent **content** and **storage** per product rules, **delete all `content_chat_threads`** for the project (**CASCADE** removes `content_chat_messages`). **No** chat archive in MVP — avoids stale assistant context against wiped chapters.

### Consistencia de datos (reset, duplicado, export)

Políticas de producto sobre **orden DB ↔ Storage**, **fallos parciales** en reset y duplicado, **export atómico** y **RLS**: ver **`PRD_Obra.md` §3 — Problemas de implementación y políticas de consistencia**. Al implementar Edge Functions, jobs y buckets, documentar en este archivo el **orden concreto** de operaciones y los mecanismos de **idempotencia** / **reintento** adoptados.

### Duplicate project (data checklist, MVP)

Aligned with **`PRD_Obra.md` §3** (new `project_id`, `draft`, localized name suffix, land on **Content** step 2, **no** shared Storage pointers for binaries).

**Copy (new UUIDs; maintain internal FK map old → new):**

| Domain | Action |
|--------|--------|
| `projects` | New row: wizard fields, `content_source`, `structure_completed_at` as in source, `status = draft`, clear export-related semantics per PRD |
| `design_systems` | One row for new project |
| `ebooks` | All rows for source project |
| `chapters` | All rows; remap `ebook_id`; remap `image_id` if images copied |
| `project_content_progress` | One row; remap `current_ebook_id` / `current_chapter_id` to **new** ids |
| `project_manuscripts` | **Active** row only (`superseded_at` NULL): new row + **physical copy** of object to a new `storage_path` under **new** `project_id` |
| `images` | Rows + **copy** blobs to new paths (no shared `storage_path` with source) |
| `project_structure_drafts` | Copy only if present (source still in Structure); usually empty when duplicating from dashboard |

**Do not copy:** subscription / credits ledger; “export published” history as published state on the clone.

**`content_chat_threads` / `content_chat_messages`:** **Do not copy** for MVP — the clone starts **without** IA chat history so prompts and assistant context do not carry over as if they were the same project. Revisit if product wants full transcript parity.

**Ordering / failure:** implement **Storage copies first or DB-first** with a documented rollback strategy; duplicate must be **idempotent** or guarded against double-submit (`PRD_Obra.md` §3).

**Duplicate idempotency (MVP):** accept an **idempotency key** (header or body) per user; if the same key replayed within a TTL, return the **same** new `project_id` and **201** (or **200** with body) without a second clone. Alternatively, guard with **unique (user_id, client_request_id)** on a small `duplicate_jobs` table. Prevents double-click / retry storms.

### Avatar/problem reset (confirmed) — operation order (MVP)

Aligned with **`PRD_Obra.md` §3** (clear text milestones and images; **delete** DB refs and Storage for preview/export assets; **do not** auto-delete or replace **upload manuscript** binary — user uses **Replace file** if needed).

Recommended **happy-path** order (adjust if your Edge Function uses a compensating saga):

1. **Delete `content_chat_threads`** for `project_id` (CASCADE drops `content_chat_messages`) — removes index + chapter threads without depending on chapter deletes.
2. **Null or remove chapter-bound assets:** clear `chapters.image_id` / detach slots as needed, then delete **`images`** rows for `project_id` and **delete** corresponding **Storage** objects (or mark tombstone + async purge — document chosen pattern).
3. **Clear or delete `chapters`** (and any TOC rows) for project ebooks per product rules; reset **`project_content_progress`** to the **initial** Content phase for this `content_source` (`upload_alignment` vs `main_index`), clear **`main_index_frozen_at`**, **`current_ebook_id`**, **`current_chapter_id`**, bump **`updated_at`** for optimistic clients.
4. **Persist new `target_avatar` / `problem`** on **`projects`** (and apply **`published` → `modified`** if applicable per PRD).
5. **Commit** before reporting success; on failure, **do not** tell the user the reset succeeded (`PRD_Obra.md` §3).

**Note:** If step 2–3 are split across requests, define **one** authoritative server entrypoint for reset so the client cannot observe half-cleared state without recovery.

### Row Level Security (RLS)
Todas las tablas tienen RLS activado. Política base para todas:
```sql
-- El usuario solo ve sus propios datos
CREATE POLICY "users_own_data" ON projects
  FOR ALL USING (auth.uid() = user_id);
-- Repetir patrón para todas las tablas vía project_id → user_id
```

### Supabase Storage
- Bucket: `project-images` (privado, acceso via signed URLs)
- Path: `{user_id}/{project_id}/{image_id}.webp`

---

## 4. Edge Functions (API interna)

Todas las funciones se ubican en `supabase/functions/`. Se invocan desde el frontend con el cliente Supabase. Nunca exponen API keys.

**Rate limiting (PRD §9 — modelo B):** en funciones **costosas** (IA, PDF, parse, export de datos, etc.), aplicar **límite por usuario autenticado** y, si aplica, **por IP**; umbrales según implementación. Responder `429` con mensaje claro cuando se supere el cupo.

### Importación de archivos (rama Upload — post-diseño)

- Invocación **después** del onboarding compartido cuando el usuario eligió **contenido por archivo** (ver `PRD_Obra.md` §4).
- Función dedicada (p. ej. `parse-document`): **mammoth** para `.docx` estándar, **pdf-parse** (o equivalente) para PDF con **texto seleccionable** — **sin OCR** en MVP.
- Validar **tamaño máximo 10 MB**, **un archivo por request**, **rechazar** PDF con contraseña o extracción vacía; respuestas de error alineadas al PRD.
- Tras parseo + IA, el usuario **alinea** índice/capítulos al formato Obra (aprobación); entonces se persisten `chapters` y el flujo continúa como en la rama IA (mismos hitos: cuerpo por capítulo → bonuses → bumps). El **número de capítulos** no viene del wizard compartido — se fija en esta fase (ver `features/wizard-ai-generation/wizard-ai-generation.md`).
- **Almacenamiento:** el archivo subido permanece en bucket **privado** mientras exista el proyecto (path acotado por usuario/proyecto); ver `PRD_Obra.md` §4 y `features/wizard-ai-generation/wizard-ai-generation.md` (ops).
- **Observabilidad:** **no** loguear cuerpo del documento ni prompts completos; metadatos y códigos de error únicamente (coherente con §1 logging).

### 4.1 `ai-optimize`
**Propósito:** Optimizar cualquier campo de texto del wizard con Claude.  
**Input:**
```json
{ "field": "avatar", "raw_text": "mujeres que hacen velas", "language": "es" }
```
**Output:**
```json
{ "optimized": "Mujeres de 28 a 45 años que quieren emprender..." }
```
**Prompt base:** Ver `src/lib/prompts.ts → OPTIMIZE_PROMPTS[field]`

---

### 4.2 `ai-generate-index`
**Propósito:** Proponer el **índice / lista de capítulos** del ebook principal en la **fase Contenido** (no en el wizard compartido).  
**Input:** Contexto del proyecto (tema, avatar, problema, título main, `content_locale`, sistema de diseño referido si aplica). Opcional: `chapter_count_hint` o rango máximo según reglas de producto — **no** se envía un `chapter_count` fijado en `wizard-shared` (ese paso ya no define capítulos).
```json
{
  "topic": "velas aromáticas",
  "avatar": "...",
  "problem": "...",
  "main_ebook_title": "...",
  "language": "es",
  "chapter_count_hint": 8
}
```
**Output:**
```json
{ "chapters": [{ "order": 1, "title": "..." }, ...] }
```
**Nota:** Tras **confirmación** del usuario en UI, el índice se persiste y aplica la regla de **index freeze** del PRD de generación de contenido.

---

### 4.3 `ai-generate-content`
**Propósito:** Generar el contenido de un capítulo específico.  
**Input:**
```json
{
  "chapter_title": "Cómo calcular tu precio de venta",
  "ebook_context": "...",
  "avatar": "...",
  "language": "es"
}
```
**Output:**
```json
{ "content": "## Cómo calcular tu precio...\n\n..." }
```

---

### 4.4 `ai-generate-html`
**Propósito:** Tomar el contenido completo del ebook y generar el HTML final con el sistema de diseño aplicado.  
**Input:**
```json
{
  "ebook_id": "uuid",
  "design_system": { "color_primary": "#...", ... },
  "chapters": [...],
  "iteration_feedback": "quiero más espacio entre secciones"  // opcional
}
```
**Output:**
```json
{ "html": "<!DOCTYPE html>..." }
```
**Nota:** Esta función soporta iteración — si se pasa `iteration_feedback`, Claude ajusta el HTML anterior.

---

### 4.5 `ai-generate-landing`
**Propósito:** Generar todos los bloques de la landing page.  
**Input:**
```json
{
  "project_id": "uuid",
  "ebook_data": { "title": "...", "avatar": "...", "chapters": [...] },
  "design_system": { ... },
  "language": "es",
  "blocks_to_generate": ["hero", "pain", "benefits", "solution", "bonuses", "price", "guarantee", "testimonials", "faq"]
}
```
**Output:**
```json
{
  "blocks": [
    { "type": "hero", "html": "...", "liquid": "..." },
    ...
  ]
}
```

---

### 4.6 `image-generate`
**Propósito:** Generar una imagen con **Gemini API** usando el modelo de imagen **Nano Banana** (familia Gemini Image; ver documentación actual de Google para el id de modelo concreto).  
**Alineación con producto:** los **defaults** `image_mode` / `image_style` del **onboarding** (`design_systems`, capturados en `StepDesign`) son **entradas** al prompt y al comportamiento por slot; la **facturación en créditos** por generación de imagen sigue **`features/wizard-preview/wizard-preview.md`** y **`PRD_Obra.md` §6** (cargo al éxito al persistir). El **wizard compartido no invoca** esta función.

**Input:**
```json
{
  "prompt": "flat illustration of aromatherapy candles, pastel colors, minimal",
  "style": "flat_illustration",
  "color_palette": ["#F8E1F4", "#C9B8E8", "#A8E6CF"],
  "project_id": "uuid",
  "chapter_id": "uuid"
}
```
**Proceso:**
1. Llamar a la Gemini API (endpoint de generación de imagen / Nano Banana) con el prompt
2. Obtener imagen resultante (respuesta API o URL según el flujo elegido)
3. Subir a Supabase Storage
4. Guardar registro en tabla `images`
5. Retornar public_url

---

### 4.7 `export-pdf`
**Propósito:** Convertir el HTML de **un** ebook a **un** PDF descargable (principal, bonus u order bump según `ebook_id`). Un proyecto con varios ebooks implica varias exportaciones; opcionalmente otro flujo o la misma función orquestada puede **empaquetar todos los PDFs del proyecto en un ZIP**.  
**Input:**
```json
{ "ebook_id": "uuid", "format": "A4" }
```
**Proceso:**
1. Componer HTML exportable: `layout_template_html` (si existe) + contenido de `chapters` / modelo canónico de render según `wizard-preview`
2. Lanzar Puppeteer headless
3. Renderizar HTML con fonts y assets
4. Exportar PDF
5. Subir a Supabase Storage
6. Retornar URL de descarga firmada (expira en 1 hora)

---

### 4.8 `purge-deleted-projects` (cron / programado)
**Propósito:** **Hard delete** de proyectos con `deleted_at` **anterior** a **30 días** (ver PRD §11).  
**Proceso:** invocada por **cron** (p. ej. diaria): listar proyectos elegibles; borrar objetos en **Storage** asociados; `DELETE` en cascada del proyecto (o en orden explícito). **Seguridad:** solo rol servicio / secret interno, no expuesta al cliente.

---

### 4.9 `export-user-data`
**Propósito:** Generar **paquete de portabilidad** (JSON + ZIP con assets de Storage según PRD §15). Puede ser **asíncrono** (cola o job + URL firmada de descarga). **Auth:** solo el usuario autenticado sobre su propio `user_id`.

---

### 4.10 `delete-account`
**Propósito:** Flujo de **baja de cuenta** tras confirmación en cliente: **cancelar** suscripción en **Mercado Pago** si aplica; eliminar **perfil**, proyectos en cascada, Storage y usuario en **Supabase Auth**. Detalle y orden — alineado a política legal. **No** exponer sin re-autenticación o token de un solo uso si se exige.

---

### 4.11 `mercadopago-webhook`
**Propósito:** Recibir **webhooks** de Mercado Pago (pagos, suscripciones, rechazos). Validar firma; actualizar tablas de suscripción / créditos; marcar flags para **avisos in-app** (PRD §11). **HTTPS** público; URL registrada en el panel de MP.

**Modelo de créditos (PRD §11):** v1.0 = **un solo plan** comercial (ancla USD 29/mes; cobro local ARS/BRL con referencia). Los **créditos incluidos en la suscripción** se renuevan por ciclo y **no arrastran** al siguiente; los **top-ups** son **paquetes fijos** cuyos créditos **sí se acumulan** en el saldo. La lógica de acreditación y el **ledger** deben distinguir origen (plan vs compra) para políticas y soporte; los importes concretos de paquetes salen de la **investigación de créditos** del PRD.

---

## 5. Estado global del cliente (Zustand)

```typescript
// store/projectStore.ts
// DesignSystem: colores, fuentes, formato de página, notas de estilo, image_mode, image_style — ver wizard-shared + types
interface ProjectStore {
  // Proyecto activo
  project: Project | null
  designSystem: DesignSystem | null
  ebooks: Ebook[]
  activeEbook: Ebook | null
  chapters: Chapter[]
  landingPage: LandingPage | null

  // Wizard state
  wizardStep: number
  wizardData: Partial<WizardFormData>

  // UI state
  isGenerating: boolean
  previewMode: 'desktop' | 'mobile'

  // Actions
  setProject: (p: Project) => void
  updateDesignSystem: (ds: Partial<DesignSystem>) => void
  setWizardStep: (step: number) => void
  updateWizardData: (data: Partial<WizardFormData>) => void
}
```

---

## 6. Flujo de datos — Onboarding y fase Contenido

**Onboarding compartido** (hasta diseño): paquete + diseño + **`image_mode` / `image_style`** (defaults de imagen, **sin** `image-generate` ni consumo de créditos de imagen en el wizard); **sin** capítulos del main ebook en Zustand/DB como lista definitiva. Detalle: `features/wizard-shared/wizard-shared.md`.

```
Usuario escribe en campo
        ↓
[AiAssistField] → Edge Function: ai-optimize (solo wizard)
        ↓
... completa tema → avatar/problema → estructura de paquete (títulos, bonuses/bumps) → diseño (incl. defaults de imagen)
        ↓
Fin del wizard compartido (diseño + image_mode/image_style guardados en design_systems)
        ↓
┌───────────────────────────┬───────────────────────────────────────────────┐
│ Rama IA (Contenido)       │ Rama Upload (Contenido)                       │
│ → ai-generate-index       │ → parse-document (+ IA propone split)         │
│   usuario confirma índice │   usuario alinea índice/capítulos y aprueba   │
└───────────────────────────┴───────────────────────────────────────────────┘
        ↓
→ ai-generate-content por capítulo (orden; upload: texto puede venir prellenado)
        ↓
→ Vista previa (paso global 3): pipeline según **`features/wizard-preview/wizard-preview.md`** y PRD §6 — puede invocar `image-generate` y optimización de assets; créditos al **éxito** según ledger
        ↓
→ ai-generate-html (contenido + diseño) cuando aplique al flujo de producto
        ↓
HTML en ebooks / preview → iteración (ImageSlot: regenerar / subir por sección) → Export PDF
```

Detalle de hitos y freeze de índice: `features/wizard-ai-generation/wizard-ai-generation.md`. **Vista previa / imágenes / export:** `features/wizard-preview/wizard-preview.md`; reglas de producto amplias: `PRD_Obra.md` §6–§7.

---

## 7. Componente clave: `AiAssistField`

Este componente se reutiliza en todos los pasos del wizard. Es la pieza más importante del onboarding.

```typescript
// components/wizard/AiAssistField.tsx
interface AiAssistFieldProps {
  label: string
  placeholder: string
  field: OptimizableField  // 'topic' | 'avatar' | 'problem' | 'title' | etc.
  value: string
  onChange: (value: string) => void
  hint?: string            // Texto de ayuda debajo del campo
}

// Comportamiento:
// 1. Textarea normal
// 2. Botón "✨ Optimizar con IA" aparece cuando hay texto
// 3. Al click → llama a ai-optimize → reemplaza el texto
// 4. Loading spinner durante la generación
// 5. Botón "Deshacer" para volver al texto original
```

---

```
Estás construyendo Obra (obra.app), un SaaS para creadores de infoproductos en LATAM y Brasil.

Stack: React + Vite + TypeScript, shadcn/ui, Tailwind CSS, Supabase, Zustand, i18next.

Reglas absolutas:
- Todo el código en TypeScript estricto, nunca `any`
- Componentes funcionales con hooks, nunca clases
- Estado global solo en Zustand (p. ej. `obra/src/store/projectStore.ts`)
- Llamadas a APIs externas SOLO desde Supabase Edge Functions, nunca desde el cliente
- Estilos solo con Tailwind CSS, nunca CSS inline ni archivos .css separados
- Todos los textos de UI usan i18next (t('key')), nunca strings hardcodeados
- Prompts de modelo de texto centralizados en `obra/src/lib/prompts.ts` (o capa equivalente)
- Nombres de archivos: PascalCase para componentes, camelCase para hooks y utils
- Cada componente tiene su propio archivo, nunca múltiples componentes en un archivo
- Los Edge Functions se escriben en TypeScript/Deno

Estructura de respuesta de las Edge Functions:
{ data: any, error: string | null }

Manejo de errores: siempre con try/catch, siempre mostrar toast al usuario.
```

---

## 9. Variables de entorno

```bash
# .env.local (frontend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase Edge Functions secrets (se configuran en Supabase Dashboard)
ANTHROPIC_API_KEY=sk-ant-...
FAL_API_KEY=...
```

---

## 10. Orden de construcción

### MVP (v1.0)

Construir en este orden estricto hasta PDF — cada paso depende del anterior:

| # | Módulo | Descripción | Dependencias |
|---|---|---|---|
| 1 | Setup | Vite + TypeScript + shadcn + Supabase client | — |
| 2 | Auth | Login / Register / Sesión persistente; **linking** email + OAuth (un `user_id`) | Supabase Auth |
| 3 | Dashboard | Lista de proyectos + crear nuevo | Auth + DB |
| 4 | Wizard shell | Navegación entre pasos, estado en Zustand | Dashboard |
| 5 | AiAssistField | Campo con optimización IA | Edge Fn: ai-optimize |
| 6 | Pasos del wizard | StepTopic, StepAvatar, estructura de **paquete**, StepDesign (**defaults** `image_mode` / `image_style`; sin image-generate; sin capítulos del main ebook) | AiAssistField |
| 7 | Fase Contenido (post-diseño) | Índice/capítulos (IA o upload+alineación) → cuerpo por capítulo → bonuses/bumps | Edge Fns: parse-document (upload), generate-index, generate-content |
| 8 | Vista previa (paso global 3) | JSON → layouts HTML; slots de imagen; portada IA; cola al abrir; **export-pdf** por entregable + **ZIP** del proyecto; navegación **Edit content** ↔ Contenido | Edge Fns: image-generate, optimize, export-pdf, empaquetado ZIP — ver `features/wizard-preview/wizard-preview.md` |
| 9 | i18n | UI `es` + `pt-BR` en toda la app | Flujo anterior (puede avanzar en paralelo desde ~4) |
| 10 | Plan único y pagos | **Un plan** en v1.0; **Mercado Pago** (AR/BR, moneda local); **créditos** mensuales del plan (sin arrastre) + **top-ups** fijos (acumulan); webhooks → `mercadopago-webhook`, ledger, UI de saldo (PRD §11) | Auth + DB + Edge Functions |

### Post-MVP (venta en tienda online; p. ej. Shopify)

No es foco del producto hasta cerrar el núcleo PDF. Orden sugerido:

| # | Módulo | Descripción | Dependencias |
|---|---|---|---|
| 1 | Landing page | Generación + editor de bloques | Edge Fn: ai-generate-landing |
| 2 | Export liquid | Bloques copiables para tema / Shopify | Landing generada |

---

## 11. Decisiones técnicas clave y sus razones

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Supabase Edge Functions como proxy | Llamar APIs directo desde cliente | Seguridad — las API keys nunca van al browser |
| Zustand para estado global | Redux, Context API | Más simple, menos boilerplate, TypeScript nativo |
| HTML generado guardado en DB | Regenerar siempre on-demand | Permite iteración y persistencia sin costo extra |
| Puppeteer server-side para PDF | html2pdf.js (client-side) | Calidad superior, fonts embebidas, sin dependencia del browser del usuario |
| Gemini API (Nano Banana) para imágenes | fal.ai, OpenAI DALL-E, Replicate | Modelo único de Google, buena calidad multimodal/edición; pricing y límites según plan Gemini API |
| i18next | Alternativas custom | Estándar de la industria, fácil de escalar |

---

*Documento de arquitectura técnica. Leer junto con **PRD_Obra.md**, **`CLAUDE.md`**, **`features/wizard-shared/wizard-shared.md`** (diseño + defaults de imagen), **`features/wizard-ai-generation/wizard-ai-generation.md`**, **CONVENCIONES.md** y la carpeta **`docs/`** (operaciones, CI, infraestructura) antes de despliegues o cambios transversales.*
