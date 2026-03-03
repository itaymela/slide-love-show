
ALTER TABLE public.settings
  ADD COLUMN display_scale numeric NOT NULL DEFAULT 100,
  ADD COLUMN display_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN display_offset_y integer NOT NULL DEFAULT 0;
