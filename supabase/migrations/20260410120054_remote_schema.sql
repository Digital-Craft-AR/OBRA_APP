-- Remote sync: remove legacy project_manuscripts if present. The original dump used unconditional
-- DROP POLICY / REVOKE, which fails on fresh DBs (42P01). CASCADE drops policies, indexes, and FKs.
drop function if exists "public"."obra_service_commit_manuscript"(p_user_id uuid, p_project_id uuid, p_id uuid, p_storage_path text, p_extracted_text_storage_path text, p_mime text, p_byte_size bigint, p_checksum_sha256 text, p_extracted_char_count integer);

drop table if exists "public"."project_manuscripts" cascade;

-- `chapters` is created in 20260412000000_ebooks_chapters_content_progress.sql. Index-snapshot columns
-- and helpers live in 20260417100000_chapters_index_snapshot_columns.sql.
