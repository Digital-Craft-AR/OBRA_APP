# Arquitectura Técnica — Obra (obra.app)
**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Stack:** React + Vite + TypeScript · Supabase · Claude API · fal.ai · Vercel

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
│ Claude API  │ │   fal.ai    │ │   Puppeteer     │
│ (contenido) │ │  (imágenes) │ │  (export PDF)   │
└─────────────┘ └─────────────┘ └─────────────────┘
```

El frontend React se comunica exclusivamente con Supabase. Supabase expone Edge Functions que actúan como proxy seguro hacia las APIs externas (Claude, fal.ai, Puppeteer). Las API keys nunca se exponen al cliente.

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
│   │   │   └── project/
│   │   │       ├── [id]/
│   │   │       │   ├── wizard/     # Onboarding wizard
│   │   │       │   ├── editor/     # Editor del ebook
│   │   │       │   ├── landing/    # Editor de landing
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
│   │   ├── landing/
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
│       ├── ai-generate-content/    # Generar contenido del ebook
│       ├── ai-generate-index/      # Generar índice de capítulos
│       ├── ai-generate-landing/    # Generar bloques de landing
│       ├── ai-generate-html/       # Generar HTML del ebook
│       ├── image-generate/         # Generar imagen con fal.ai
│       └── export-pdf/             # Generar PDF con Puppeteer
│
├── public/
├── .env.local                      # Variables de entorno (nunca al repo)
├── .cursorrules                    # Reglas para Cursor (ver sección 8)
└── package.json
```

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
  language    TEXT DEFAULT 'es',      -- es | pt
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT DEFAULT 'draft',   -- draft | in_progress | complete
  language    TEXT DEFAULT 'es',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
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

-- Ebooks (main, bonus, order_bump)
CREATE TABLE ebooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,        -- main | bonus | order_bump
  title         TEXT,
  subtitle      TEXT,
  target_avatar JSONB,                -- { description, age, pains, desires }
  html_content  TEXT,                 -- HTML generado final
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

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
**Propósito:** Generar una imagen con fal.ai (Flux).  
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
1. Llamar a fal.ai con el prompt
2. Descargar imagen resultante
3. Subir a Supabase Storage
4. Guardar registro en tabla `images`
5. Retornar public_url

---

### 4.7 `export-pdf`
**Propósito:** Convertir el HTML del ebook a PDF descargable.  
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

## 10. Orden de construcción del MVP

Construir en este orden estricto — cada paso depende del anterior:

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
| 11 | Landing page | Generación + editor de bloques | Edge Fn: ai-generate-landing |
| 12 | Export liquid | Bloques copiables para Shopify | Landing generada |
| 13 | i18n | ES + PT en toda la UI | Todo lo anterior |
| 14 | Planes | Límites por plan (Stripe o LemonSqueezy) | Auth + DB |

---

## 11. Decisiones técnicas clave y sus razones

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Supabase Edge Functions como proxy | Llamar APIs directo desde cliente | Seguridad — las API keys nunca van al browser |
| Zustand para estado global | Redux, Context API | Más simple, menos boilerplate, TypeScript nativo |
| HTML generado guardado en DB | Regenerar siempre on-demand | Permite iteración y persistencia sin costo extra |
| Puppeteer server-side para PDF | html2pdf.js (client-side) | Calidad superior, fonts embebidas, sin dependencia del browser del usuario |
| fal.ai para imágenes | OpenAI DALL-E, Replicate | Más rápido, mejor precio, API más simple |
| i18next | Alternativas custom | Estándar de la industria, fácil de escalar |

---

*Documento generado como base para desarrollo en Cursor. Leer junto con PRD_Obra.md antes de iniciar cualquier módulo.*
