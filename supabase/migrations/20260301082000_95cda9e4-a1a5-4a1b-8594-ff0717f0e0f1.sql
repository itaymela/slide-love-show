-- Create slides table
CREATE TABLE public.slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  object_fit TEXT NOT NULL DEFAULT 'contain',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public access for signage)
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Slides are publicly readable" ON public.slides FOR SELECT USING (true);
CREATE POLICY "Slides are publicly writable" ON public.slides FOR INSERT WITH CHECK (true);
CREATE POLICY "Slides are publicly updatable" ON public.slides FOR UPDATE USING (true);
CREATE POLICY "Slides are publicly deletable" ON public.slides FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.slides;

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Storage policies
CREATE POLICY "Images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Anyone can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Anyone can delete images" ON storage.objects FOR DELETE USING (bucket_id = 'images');