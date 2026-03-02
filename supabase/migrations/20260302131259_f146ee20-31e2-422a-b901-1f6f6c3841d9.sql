
-- Settings table (singleton row pattern)
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker_text text NOT NULL DEFAULT '',
  ticker_enabled boolean NOT NULL DEFAULT false,
  transition_type text NOT NULL DEFAULT 'fade',
  manual_override boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.settings (id) VALUES (gen_random_uuid());

-- RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are publicly readable" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Settings are publicly updatable" ON public.settings FOR UPDATE USING (true);

-- Macros table
CREATE TABLE public.macros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_time text NOT NULL DEFAULT '08:00',
  target_playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.macros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Macros are publicly readable" ON public.macros FOR SELECT USING (true);
CREATE POLICY "Macros are publicly writable" ON public.macros FOR INSERT WITH CHECK (true);
CREATE POLICY "Macros are publicly updatable" ON public.macros FOR UPDATE USING (true);
CREATE POLICY "Macros are publicly deletable" ON public.macros FOR DELETE USING (true);

-- Display heartbeat table (singleton)
CREATE TABLE public.display_heartbeat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  current_slide_url text DEFAULT '',
  current_slide_index integer DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.display_heartbeat (id) VALUES (gen_random_uuid());

ALTER TABLE public.display_heartbeat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Heartbeat is publicly readable" ON public.display_heartbeat FOR SELECT USING (true);
CREATE POLICY "Heartbeat is publicly updatable" ON public.display_heartbeat FOR UPDATE USING (true);

-- Enable realtime for settings and heartbeat
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.display_heartbeat;
