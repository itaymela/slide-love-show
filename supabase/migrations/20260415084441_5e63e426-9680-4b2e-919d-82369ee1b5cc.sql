
-- 1. Add play_mode to playlists
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS play_mode text NOT NULL DEFAULT 'loop';

-- 2. Add interrupted/fallback playlist IDs to settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS interrupted_playlist_id uuid,
  ADD COLUMN IF NOT EXISTS default_fallback_playlist_id uuid;

-- 3. Drop old macros table and recreate with new schema
DROP TABLE IF EXISTS public.macros;

CREATE TABLE public.macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  condition_type text NOT NULL DEFAULT 'time_daily',
  condition_value text NOT NULL DEFAULT '08:00',
  recurrence_interval_minutes integer,
  last_run_at timestamptz,
  action_type text NOT NULL DEFAULT 'play_specific',
  action_target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.macros ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Macros are publicly readable" ON public.macros FOR SELECT USING (true);
CREATE POLICY "Macros are publicly writable" ON public.macros FOR INSERT WITH CHECK (true);
CREATE POLICY "Macros are publicly updatable" ON public.macros FOR UPDATE USING (true);
CREATE POLICY "Macros are publicly deletable" ON public.macros FOR DELETE USING (true);
