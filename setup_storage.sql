-- =================================================================
-- SUPABASE STORAGE BUCKET SETUP
-- Run this AFTER uploading the schema
-- =================================================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create RLS policy for documents bucket (allow all operations)
CREATE POLICY "Allow public uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public downloads" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'documents');

CREATE POLICY "Allow public updates" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'documents');

CREATE POLICY "Allow public deletes" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'documents');

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'documents';
