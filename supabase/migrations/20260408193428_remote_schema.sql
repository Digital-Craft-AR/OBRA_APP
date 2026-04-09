drop extension if exists "pg_net";

-- Content workspace tables are created in 20260412000000_ebooks_chapters_content_progress.sql (later timestamp).
-- This migration must not assume they exist, or `supabase db reset` fails on a clean database.
drop trigger if exists projects_bootstrap_content_after_structure on public.projects;

drop function if exists public.obra_ensure_content_workspace(uuid);
drop function if exists public.obra_projects_bootstrap_content_on_structure();

drop table if exists public.project_content_progress cascade;
drop table if exists public.chapters cascade;
drop table if exists public.ebooks cascade;

alter table public.projects drop constraint if exists projects_design_config_contract_check;

-- Must satisfy projects_design_config_contract_check when that constraint is present (paletteMode / palettePresetId).
alter table "public"."projects" alter column "design_config" set default $dc$
{
  "paletteMode": "preset",
  "palettePresetId": "oceanic",
  "palette": {"primary": "#F4F8FC", "secondary": "#2D6499", "accent": "#5A7A94"},
  "fonts": {"heading": "Playfair Display", "body": "Inter"},
  "page": {"size": "a4", "orientation": "portrait"},
  "image": {"mode": "ai", "style": "illustration"}
}
$dc$::jsonb;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;


