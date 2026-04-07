ALTER TABLE public.settings
  ADD COLUMN single_image_url text NOT NULL DEFAULT '',
  ADD COLUMN single_image_active boolean NOT NULL DEFAULT false;