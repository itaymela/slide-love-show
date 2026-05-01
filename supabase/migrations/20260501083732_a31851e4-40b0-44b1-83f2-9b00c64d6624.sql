ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS sky_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sky_mode_interval_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS sky_mode_duration_seconds integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS sky_mode_names_per_screen integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS sky_mode_manual_trigger integer NOT NULL DEFAULT 0;