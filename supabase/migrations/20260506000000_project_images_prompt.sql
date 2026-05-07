-- Add prompt field to project_images so the Gemini prompt is traceable and
-- enables future "regenerate with same prompt" UX.
alter table public.project_images
  add column if not exists prompt text;
