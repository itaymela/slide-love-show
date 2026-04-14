
ALTER TABLE public.settings ADD COLUMN global_object_fit text NOT NULL DEFAULT 'contain';
ALTER TABLE public.settings ADD COLUMN ticker_offset_y integer NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN overlay_offset_x integer NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN overlay_offset_y integer NOT NULL DEFAULT 0;

ALTER TABLE public.slides ALTER COLUMN duration TYPE numeric USING duration::numeric;
