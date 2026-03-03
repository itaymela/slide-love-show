
ALTER TABLE public.settings
ADD COLUMN overlay_url text NOT NULL DEFAULT '',
ADD COLUMN overlay_position text NOT NULL DEFAULT 'top-right',
ADD COLUMN overlay_size integer NOT NULL DEFAULT 50;
