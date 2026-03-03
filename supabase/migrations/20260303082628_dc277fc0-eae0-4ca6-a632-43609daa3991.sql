
ALTER TABLE public.settings
ADD COLUMN ticker_font_size integer NOT NULL DEFAULT 14,
ADD COLUMN ticker_speed integer NOT NULL DEFAULT 30,
ADD COLUMN transition_duration numeric(3,1) NOT NULL DEFAULT 0.5;
