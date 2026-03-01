CREATE OR REPLACE FUNCTION public.set_active_playlist(playlist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.playlists SET is_active = false WHERE is_active = true;
  UPDATE public.playlists SET is_active = true WHERE id = playlist_id;
END;
$$;