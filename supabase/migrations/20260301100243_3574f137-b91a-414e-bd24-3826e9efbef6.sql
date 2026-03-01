
-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Public RLS policies for playlists (kiosk mode)
CREATE POLICY "Playlists are publicly readable" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Playlists are publicly writable" ON public.playlists FOR INSERT WITH CHECK (true);
CREATE POLICY "Playlists are publicly updatable" ON public.playlists FOR UPDATE USING (true);
CREATE POLICY "Playlists are publicly deletable" ON public.playlists FOR DELETE USING (true);

-- Enable realtime for playlists
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;

-- Insert a default playlist and set it active
INSERT INTO public.playlists (name, is_active) VALUES ('Default', true);

-- Add playlist_id to slides table
ALTER TABLE public.slides ADD COLUMN playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE;

-- Assign existing slides to the default playlist
UPDATE public.slides SET playlist_id = (SELECT id FROM public.playlists WHERE name = 'Default' LIMIT 1);

-- Make playlist_id NOT NULL after backfill
ALTER TABLE public.slides ALTER COLUMN playlist_id SET NOT NULL;
