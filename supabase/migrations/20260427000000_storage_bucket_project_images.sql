-- Private Storage bucket for preview images (Edge Function service-role uploads,
-- signed URLs, and optional browser uploads). Without this row in storage.buckets,
-- uploads fail with "Bucket not found".

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', false)
on conflict (id) do nothing;
