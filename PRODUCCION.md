# Cambios pendientes en producción
> Actualizá este archivo cada vez que haya algo para aplicar en producción que no se deployea automáticamente (migraciones SQL, edge functions, config de Supabase dashboard, variables de entorno).

**Proyecto Supabase:** `spmnqozkpjhcskxnavbf`  
**Deploy frontend:** Vercel (auto desde `main`)  
**Deploy edge functions:** manual con `npx supabase functions deploy <nombre> --project-ref spmnqozkpjhcskxnavbf`

---

## Pendiente

### Edge Function — Secret `SUPABASE_DB_URL` (o `DATABASE_URL`) para `generate-document-template`

**Dónde:** Supabase Dashboard → Edge Functions → Secrets, o `supabase secrets set SUPABASE_DB_URL='…'`

**Valor:** URI Postgres **directa** (puerto **5432**, “Direct connection” en Database settings). **No** usar el pooler en modo transacción (puerto **6543**): los advisory locks de sesión no son fiables ahí.

**Local (`supabase functions serve`):** agregar en `supabase/functions/.env` (no commitear secretos reales):

`SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Por qué:** evita dos generaciones concurrentes del mismo ebook (`pg_try_advisory_lock` por `ebookId`). Sin esta variable, la función sigue operando pero solo registra un warning y no serializa.

---

### Edge Function — Redeploy `generate-document-template` (chapter opener image slots)

```bash
npx supabase functions deploy generate-document-template --project-ref spmnqozkpjhcskxnavbf
```

**Qué cambió:** el template del chapter opener ahora incluye un image slot full-bleed (`data-slot-key="chapter-N-image-1"`) igual que la portada. Los shells existentes en cache no se actualizan solos — se regeneran la próxima vez que el contenido cambia o el usuario hace click en "Volver a intentar".

---

### Railway worker — Eliminar referencia a `layout_page_assignments`

**Urgencia:** bloqueante (el PDF export falla con `column projects.layout_page_assignments does not exist`)

**Qué pasó:** la columna `layout_page_assignments` fue agregada en `20260419100000` y **eliminada** en `20260509000000_drop_layout_page_assignments.sql`. El frontend y las Edge Functions ya no la referencian. Sin embargo el **Railway worker** (servicio externo que procesa los `pdf_export_jobs`) todavía la consulta en su `SELECT` sobre `projects`.

**Fix necesario:** en el repositorio del Railway worker, eliminar `layout_page_assignments` del `SELECT` que carga el proyecto antes de generar el PDF.

**Cómo verificar:** el error aparece en `pdf_export_jobs.error_message` de los jobs fallidos.

---

### Edge Functions — Deploy inicial de `ai-split-proposal` y `approve-alignment`

```bash
npx supabase functions deploy ai-split-proposal --project-ref spmnqozkpjhcskxnavbf
npx supabase functions deploy approve-alignment --project-ref spmnqozkpjhcskxnavbf
```

**Config de JWT en el dashboard** (no alcanza con `config.toml` para producción):  
Supabase Dashboard → Edge Functions → `ai-split-proposal` → Settings → desactivar **JWT verification**  
Repetir para `approve-alignment`.

---

### Edge Function — Deploy inicial de `generate-document-template`

```bash
npx supabase functions deploy generate-document-template --project-ref spmnqozkpjhcskxnavbf
```

**Config de JWT en el dashboard:**  
Supabase Dashboard → Edge Functions → `generate-document-template` → Settings → desactivar **JWT verification**

**Qué hace:** genera el HTML shell del documento llamando a Claude con el design system del proyecto. El frontend lo llama al entrar al step 3 y cachea el resultado en `ebooks.html_shell`.

**Migración asociada:** `20260426000000_ebooks_html_shell.sql` — ya aplicada.

---

### Edge Function — Redeploy de `manuscript-upload-parse` (fix mammoth + error logging)

```bash
npx supabase functions deploy manuscript-upload-parse --project-ref spmnqozkpjhcskxnavbf
```

**Qué cambió:** mammoth ahora recibe `Buffer.from(arrayBuffer)` (fix para Deno); el catch loguea `error_message` y `error_stack`.

---

## Aplicado

### 2026-04-17 — Edge Functions `generate-document-template` + `export-pdf`

- `generate-document-template`: genera HTML shell con Claude, guarda en `ebooks.html_shell`
- `export-pdf`: actualizado para usar `html_shell` + `injectAll()` (mismo HTML que el preview); fallback a `buildDocumentHtml()` si no hay shell
- Migración `20260426000000_ebooks_html_shell.sql` aplicada manualmente en el dashboard

---

## Formato de entrada

```
### [Tipo] — Descripción breve
**Commit:** <hash>
**Urgencia:** bloqueante | importante | puede esperar
Pasos concretos para aplicar.
```
