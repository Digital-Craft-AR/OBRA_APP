# Arquitectura Técnica — Obra (obra.app)
**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Stack:** React + Vite + TypeScript · Supabase · Claude API · Gemini API (Nano Banana) · Vercel

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

- **Correo de cuenta:** plantillas **Supabase Auth** (reset, verificación, etc.).
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

---

## 2. Estructura de carpetas del proyecto

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
│   │   │   ├── StepDesign.tsx
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
│   │   ├── useImages.ts            # Generación y upload de imágenes
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
│       ├── es.json                 # Español (LATAM)
│       └── pt.json                 # Portugués (BR)
│
├── supabase/
│   └── functions/                  # Edge Functions (Deno)
│       ├── ai-optimize/            # Optimizar texto con Claude
│       ├── parse-document/         # Extraer texto de .docx / PDF (Flujo B; ver PRD)
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
├── .cursorrules                    # Reglas para Cursor (ver sección 8)
└── package.json
```

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
  plan        TEXT DEFAULT 'starter', -- starter | pro | agency
  ui_locale   TEXT DEFAULT 'es' CHECK (ui_locale IN ('es', 'pt-BR')), -- idioma de la app; editable por el usuario
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos: máx. 20 activos por usuario (archived_at IS NULL AND deleted_at IS NULL); archivados ilimitados
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT DEFAULT 'draft',   -- draft | in_progress | complete
  content_locale  TEXT NOT NULL CHECK (content_locale IN ('es', 'pt-BR', 'en-US', 'en-GB')), -- salida del proyecto; inmutable en app tras INSERT
  archived_at     TIMESTAMPTZ,           -- NULL = no archivado; si set, no cuenta en el límite de 20 activos
  deleted_at      TIMESTAMPTZ,           -- NULL = no en papelera; si set, soft delete — hard delete tras 30 días (job programado)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sistema de diseño (1 por proyecto)
CREATE TABLE design_systems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  color_primary   TEXT NOT NULL,      -- 60% — hex
  color_secondary TEXT NOT NULL,      -- 30% — hex
  color_accent    TEXT NOT NULL,      -- 10% — hex
  font_display    TEXT NOT NULL,      -- Google Font para títulos
  font_body       TEXT NOT NULL       -- Google Font para cuerpo
);

-- Ebooks: máx. 1 main + 5 bonus + 2 order_bump por proyecto (v1.0; validar en app o triggers)
CREATE TABLE ebooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('main', 'bonus', 'order_bump')),
  title         TEXT,
  subtitle      TEXT,
  target_avatar JSONB,                -- { description, age, pains, desires }
  html_content  TEXT,                 -- HTML generado final
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ebooks_one_main_per_project ON ebooks (project_id) WHERE (type = 'main');

-- Capítulos de cada ebook
CREATE TABLE chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id    UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  "order"     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT,                   -- Contenido en markdown o HTML
  image_id    UUID,                   -- FK a images (nullable)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

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

### Importación de archivos (Flujo B)

- Función dedicada (p. ej. `parse-document`): **mammoth** para `.docx` estándar, **pdf-parse** (o equivalente) para PDF con **texto seleccionable** — **sin OCR** en MVP.
- Validar **tamaño máximo 10 MB**, **un archivo por request**, **rechazar** PDF con contraseña o extracción vacía; respuestas de error alineadas al PRD.

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
**Propósito:** Generar el índice de capítulos del ebook.  
**Input:**
```json
{
  "topic": "velas aromáticas",
  "avatar": "...",
  "language": "es",
  "chapter_count": 8
}
```
**Output:**
```json
{ "chapters": [{ "order": 1, "title": "..." }, ...] }
```

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
1. Recuperar `html_content` del ebook
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

---

## 5. Estado global del cliente (Zustand)

```typescript
// store/projectStore.ts
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

## 6. Flujo de datos — Wizard completo

```
Usuario escribe en campo
        ↓
[AiAssistField] detecta texto
        ↓
Click "Optimizar con IA"
        ↓
→ Edge Function: ai-optimize
        ↓
Claude devuelve texto mejorado
        ↓
Campo se actualiza en UI + Zustand
        ↓
... (usuario completa todos los pasos) ...
        ↓
Click "Generar mi ebook"
        ↓
→ Edge Function: ai-generate-index
        ↓
→ Edge Function: ai-generate-content (x N capítulos, paralelo)
        ↓
→ Edge Function: image-generate (x N capítulos, paralelo)
        ↓
→ Edge Function: ai-generate-html (con todo el contenido + diseño)
        ↓
HTML guardado en ebooks.html_content (Supabase)
        ↓
EbookPreview renderiza el HTML en iframe
        ↓
Usuario itera → feedback → ai-generate-html nuevamente
        ↓
Usuario conforme → Export PDF → Descarga
```

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

## 8. Archivo `.cursorrules`

Este archivo va en la raíz del proyecto y le da contexto permanente a Cursor.

```
Estás construyendo Obra (obra.app), un SaaS para creadores de infoproductos en LATAM y Brasil.

Stack: React + Vite + TypeScript, shadcn/ui, Tailwind CSS, Supabase, Zustand, i18next.

Reglas absolutas:
- Todo el código en TypeScript estricto, nunca `any`
- Componentes funcionales con hooks, nunca clases
- Estado global solo en Zustand (store/projectStore.ts)
- Llamadas a APIs externas SOLO desde Supabase Edge Functions, nunca desde el cliente
- Estilos solo con Tailwind CSS, nunca CSS inline ni archivos .css separados
- Todos los textos de UI usan i18next (t('key')), nunca strings hardcodeados
- Todos los prompts de Claude se definen en src/lib/prompts.ts
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
| 2 | Auth | Login / Register / Sesión persistente | Supabase Auth |
| 3 | Dashboard | Lista de proyectos + crear nuevo | Auth + DB |
| 4 | Wizard shell | Navegación entre pasos, estado en Zustand | Dashboard |
| 5 | AiAssistField | Campo con optimización IA | Edge Fn: ai-optimize |
| 6 | Pasos del wizard | StepTopic, StepAvatar, StepStructure, StepDesign | AiAssistField |
| 7 | Generación de contenido | Índice + capítulos + imágenes | Edge Fns: generate-index, generate-content, image-generate |
| 8 | Generación HTML | HTML del ebook con diseño aplicado | Edge Fn: ai-generate-html |
| 9 | Editor | Preview en iframe + iteración | HTML generado |
| 10 | Export PDF | Descarga del ebook final | Edge Fn: export-pdf |
| 11 | i18n | ES + PT en toda la UI | Flujo anterior (puede avanzar en paralelo desde ~4) |
| 12 | Planes | Límites por plan; cobros vía Mercado Pago (AR/BR); créditos IA | Auth + DB |

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

*Documento generado como base para desarrollo en Cursor. Leer junto con PRD_Obra.md antes de iniciar cualquier módulo.*
