-- Allow project owners to delete their own image slots (e.g. removing an image from preview).
create policy "project_images_owner_delete"
  on public.project_images for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.user_id = auth.uid()
    )
  );
