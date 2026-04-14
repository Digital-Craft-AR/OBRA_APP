# Estado actual — Obra.app
> Última actualización: 2026-04-13

## Estado general: ~70% completo

---

## Auth Flow — 100% hecho y wired

- Login, register, Google OAuth, verificación de email con reenvío
- Shells de acceso condicional (verificación pendiente, suscripción pendiente, activando, error de pago)
- Todo conectado a Supabase Auth real

---

## Dashboard — 100% hecho y wired

- Lista de proyectos con filtros por estado
- Cards con phase tracking (`project_content_progress`)
- **Modal de nuevo proyecto (3 pasos):** nombre → idioma → método de creación (AI vs Upload)
  - `content_source` se guarda en DB desde el momento de creación (no hardcodeado a "ai")
  - Al crear, marca `contentSourceIntroDone` en sessionStorage para saltear el intro panel del wizard de contenido
- Sidebar colapsable con estado persistido en localStorage
- Balance de créditos y perfil del creador
- Todo conectado a Supabase real

---

## Step 1: Estructura — 100% hecho y wired

6 sub-pasos completos:

| Sub-paso | UI | Backend |
|---|---|---|
| Topic | ✅ | ✅ Autosave + AI optimize |
| Avatar + Problema | ✅ | ✅ Autosave + AI improve + reset |
| Packaging (cant. bonus/bumps) | ✅ | ✅ Autosave |
| Título principal + autor | ✅ | ✅ AI suggestions via `ai-optimize` |
| Títulos bonus/bump | ✅ | ✅ AI suggestions por ítem |
| Diseño (templates, paleta, fonts) | ✅ | ✅ Guarda `design_config`, `book_template_id` |

---

## Step 2: Contenido — ~90% hecho

### Flujo IA

| Feature | UI | Backend | Notas |
|---|---|---|---|
| Generación índice (TOC) main ebook | ✅ | ✅ | `ai-generate-index` con Claude |
| Generación índice bonus/bumps | ✅ | ✅ | Mismo flujo |
| Freeze/confirm TOC | ✅ | ✅ | `ebooks.index_frozen_at` |
| Generación contenido capítulos | ✅ | ⚠️ Parcial | `ai-generate-content` existe pero incompleto |
| Editor Tiptap por capítulo | ✅ | ✅ | Aprueba/rechaza con rich HTML |
| Phase tracking state machine | ✅ | ✅ | `current_phase` con CHECK en DB |

### Flujo Upload — **completo end-to-end**

| Feature | UI | Backend | Notas |
|---|---|---|---|
| Upload manuscrito (PDF/DOCX) | ✅ | ✅ | `manuscript-upload-parse` edge fn; fix mammoth `Buffer.from()` |
| Auto-start split proposal tras upload | ✅ | ✅ | Toast de éxito + `autoStart` en `ContentUploadAlignmentPanel` |
| Persistencia de estado en refresh | ✅ | — | `useEffect` sincroniza `manuscriptCommitted` desde DB; re-lanza Claude |
| Split proposal (Claude analiza capítulos) | ✅ | ✅ | `ai-split-proposal` + `ContentUploadAlignmentPanel` |
| Revisión y edición de títulos de capítulos | ✅ | — | `ContentUploadAlignmentPanel` (stage: review) |
| Warnings de la propuesta | ✅ | — | Panel de avisos en la UI |
| Approve alignment | ✅ | ✅ | `approve-alignment` slicéa texto, crea chapters HTML |
| TOC bonus/bumps (defaults) | ✅ | ✅ | Se persisten al aprobar el alignment |
| Avance de fase a `main_chapter` | ✅ | ✅ | Edge fn + update de `global_index_frozen_at` |
| Editor Tiptap por capítulo (prefill) | ✅ | ✅ | Chapters creados con texto del manuscrito |

### Selección de fuente de contenido

- **Antes:** intro panel al inicio del Step 2 (Contenido), requería dismissar antes de continuar
- **Ahora:** paso 3 del modal de creación de proyecto (nombre → idioma → método)
- Para proyectos nuevos: el intro panel se saltea automáticamente
- Para proyectos existentes: sin cambio

---

## Step 3: Vista Previa — 0% hecho

- No existe ninguna página `/preview`
- El stepper lo muestra como "próximo" pero no hay UI
- PDF export: edge function es un stub (devuelve 401)
- Sin pipeline de imágenes (Gemini / slots / cover)
- Sin export ZIP

---

## Settings — 100% hecho y wired

| Sección | Estado |
|---|---|
| Perfil (nombre, locale, avatar) | ✅ real |
| Seguridad (cambio contraseña, delete account) | ✅ real |
| Billing (Mercado Pago, checkout, estado) | ✅ real |
| Créditos (balance, historial, top-up) | ✅ real |
| Privacidad (export user data JSON) | ✅ real |

---

## Edge Functions — Estado

| Función | Estado |
|---|---|
| `ai-optimize` | ✅ producción |
| `ai-generate-index` | ✅ producción |
| `ai-generate-content` | ⚠️ existe, incompleto |
| `manuscript-upload-parse` | ✅ producción — fix mammoth buffer + error logging |
| `ai-split-proposal` | ✅ producción — `verify_jwt = false` en config.toml |
| `approve-alignment` | ✅ producción — `verify_jwt = false` en config.toml |
| `create-subscription-checkout` | ✅ producción |
| `create-credits-checkout` | ✅ producción |
| `export-user-data` | ✅ producción |
| `generate-pdf` / export | ❌ stub (401) |

---

## Archivos frontend clave — Upload flow

| Archivo | Descripción |
|---|---|
| `obra/src/lib/wizard/splitProposalApi.ts` | `invokeAiSplitProposal` + `invokeApproveAlignment` |
| `obra/src/components/wizard/content/ContentUploadAlignmentPanel.tsx` | UI: generating → review → error; prop `autoStart`; idle comentado |
| `obra/src/components/wizard/content/ManuscriptUploadPanel.tsx` | Drop zone; success card comentada (el padre maneja toast + transición) |
| `obra/src/pages/WizardContentPage.tsx` | `handleAlignmentApproved`; `manuscriptCommitted` + useEffect de sync; toast post-upload |
| `obra/src/pages/DashboardPage.tsx` | Modal 3 pasos; guarda `content_source` desde creación |
| `supabase/functions/manuscript-upload-parse/index.ts` | Fix: mammoth usa `Buffer.from(arrayBuffer)`; catch loguea error real |
| `supabase/config.toml` | `verify_jwt = false` para `ai-split-proposal` y `approve-alignment` |

---

## Prompts de IA — Estado

| Prompt / Función | Archivo | Estado |
|---|---|---|
| `generateChapterPrompt` | `_shared/prompts.ts` + `obra/src/lib/content/` | ✅ wired en `ai-generate-content` |
| `generateBonusChapterPrompt` | `_shared/prompts.ts` | ✅ implementado |
| `generateBumpChapterPrompt` | `_shared/prompts.ts` | ✅ implementado |
| `generateSplitProposalPrompt` | `_shared/prompts.ts` | ✅ implementado y wired |
| `generateCoverImagePrompt` | `_shared/prompts.ts` | ✅ prompt listo, pipeline Gemini no existe |
| `generateSectionImagePrompt` | `_shared/prompts.ts` | ✅ prompt listo, pipeline Gemini no existe |

---

## Gaps críticos por prioridad

1. **Step 3 Vista Previa** — sin UI, sin PDF export, sin pipeline de imágenes
2. **`ai-generate-content`** — edge function existe pero flujo completo no verificado
3. **Cover/section image generation** — prompts listos pero pipeline Gemini inexistente

---

## Flujo completo — Mapa de estado

```
Usuario
  → Auth ✅
  → Email Verification Shell ✅
  → Subscription Shell ✅
  → Dashboard ✅
    → Crear proyecto (modal 3 pasos) ✅
      → Nombre ✅
      → Idioma del contenido ✅
      → Método: AI vs Upload ✅
    → Step 1: Estructura ✅
      → Topic, Avatar, Packaging, Diseño, Títulos ✅
    → Step 2: Contenido
      → Flujo Upload ✅ COMPLETO
        → Upload manuscrito ✅
        → Split proposal (Claude) ✅
        → Revisión y edición de capítulos ✅
        → Approve alignment ✅
        → Capítulos prefilled con texto ✅
        → Editor Tiptap ✅
      → Flujo IA ⚠️
        → Generación TOC ✅
        → Generación capítulos ⚠️ (edge fn incompleta)
        → Editor Tiptap ✅
    → Step 3: Vista Previa ❌ (no existe)
      → Render layout ❌
      → Pipeline imágenes (Gemini) ❌
      → Export PDF ❌ (stub)
      → Export ZIP ❌
  → Settings ✅
```
