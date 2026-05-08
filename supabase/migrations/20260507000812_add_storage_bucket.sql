-- Create a new storage bucket for psychologist photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('psychologist-photos', 'psychologist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all photos
CREATE POLICY "Public read access for psychologist photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'psychologist-photos' );

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload psychologist photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'psychologist-photos' );

-- Allow authenticated users to update photos
CREATE POLICY "Authenticated users can update their own psychologist photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'psychologist-photos' );

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete their own psychologist photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'psychologist-photos' );
