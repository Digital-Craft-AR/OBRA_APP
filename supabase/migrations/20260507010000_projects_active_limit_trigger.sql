create or replace function public.obra_enforce_active_project_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  select count(*) into active_count
  from public.projects
  where user_id = new.user_id
    and lifecycle_status = 'active';

  if active_count >= 20 then
    raise exception 'active_project_limit_exceeded'
      using hint = 'Archive or delete a project before creating a new one.';
  end if;

  return new;
end;
$$;

create trigger enforce_active_project_limit
  before insert on public.projects
  for each row
  execute function public.obra_enforce_active_project_limit();
