-- Private Storage buckets for Edge Function outputs (service role uploads + signed URLs).
-- Without these rows in storage.buckets, uploads fail with "Bucket not found".

insert into storage.buckets (id, name, public)
values ('project-pdfs', 'project-pdfs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-zips', 'project-zips', false)
on conflict (id) do nothing;
