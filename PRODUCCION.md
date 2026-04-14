# Cambios pendientes en producción
> Actualizá este archivo cada vez que haya algo para aplicar en producción que no se deployea automáticamente (migraciones SQL, edge functions, config de Supabase dashboard, variables de entorno).

**Proyecto Supabase:** `spmnqozkpjhcskxnavbf`  
**Deploy frontend:** Vercel (auto desde `main`)  
**Deploy edge functions:** manual con `npx supabase functions deploy <nombre> --project-ref spmnqozkpjhcskxnavbf`

---

## Pendiente

### SQL — Columnas `book_template_id` y `layout_page_assignments` en `projects`

**Migración:** `supabase/migrations/20260419100000_projects_book_template_layout_assignments.sql`  
**Dónde:** Supabase Dashboard → SQL Editor

```sql
alter table public.projects
  add column if not exists book_template_id text;

alter table public.projects
  add column if not exists layout_page_assignments jsonb not null default '{}'::jsonb;
```

**Por qué:** el frontend lee estas columnas al cargar el wizard. Sin ellas aparece el error `column projects.book_template_id does not exist` en consola.

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

### Edge Function — Redeploy de `manuscript-upload-parse` (fix mammoth + error logging)

```bash
npx supabase functions deploy manuscript-upload-parse --project-ref spmnqozkpjhcskxnavbf
```

**Qué cambió:** mammoth ahora recibe `Buffer.from(arrayBuffer)` (fix para Deno); el catch loguea `error_message` y `error_stack`.

---

## Aplicado

_(Mover acá los ítems una vez deployados, con fecha)_

---

## Formato de entrada

```
### [Tipo] — Descripción breve
**Commit:** <hash>
**Urgencia:** bloqueante | importante | puede esperar
Pasos concretos para aplicar.
```
