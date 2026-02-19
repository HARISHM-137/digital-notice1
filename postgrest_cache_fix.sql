-- ============================================================
-- POSTGREST SCHEMA CACHE FIX
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. Force schema reload with no-op column modification
ALTER TABLE subjects ALTER COLUMN name TYPE text;
ALTER TABLE subjects ALTER COLUMN code TYPE text;
ALTER TABLE subjects ALTER COLUMN created_at TYPE timestamptz;

-- 2. Add comment to force cache invalidation
COMMENT ON TABLE subjects IS 'Subjects table - schema cache refreshed';
COMMENT ON COLUMN subjects.name IS 'Subject name column';
COMMENT ON COLUMN subjects.code IS 'Subject code column';

-- 3. Drop existing policies
DROP POLICY IF EXISTS "Allow all for service role" ON subjects;
DROP POLICY IF EXISTS "Allow all for authenticated" ON subjects;
DROP POLICY IF EXISTS "Allow read/write for authenticated" ON subjects;
DROP POLICY IF EXISTS "Allow read for authenticated" ON subjects;

-- 4. Create permissive policies
CREATE POLICY "Allow all for service role" 
ON subjects 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" 
ON subjects 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
ON subjects 
FOR SELECT 
USING (true);

-- 5. Ensure RLS is enabled
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT ALL ON subjects TO authenticated;
GRANT ALL ON subjects TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- 8. Refresh materialized views if any
-- (Skip if no materialized views)

-- 9. Verification queries
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION STARTED ===';
    
    -- Check table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subjects') THEN
        RAISE NOTICE '✓ subjects table exists in public schema';
    ELSE
        RAISE NOTICE '✗ subjects table NOT FOUND';
    END IF;
    
    -- Check columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'name') THEN
        RAISE NOTICE '✓ name column exists';
    ELSE
        RAISE NOTICE '✗ name column NOT FOUND';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'code') THEN
        RAISE NOTICE '✓ code column exists';
    ELSE
        RAISE NOTICE '✗ code column NOT FOUND';
    END IF;
    
    -- Check policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects') THEN
        RAISE NOTICE '✓ RLS policies exist';
    ELSE
        RAISE NOTICE '✗ NO policies found';
    END IF;
    
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;

-- 10. Test SELECT query
SELECT 
    id,
    name,
    code,
    program_id,
    semester,
    credits,
    created_at
FROM subjects 
LIMIT 1;

-- 11. Show all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subjects'
ORDER BY ordinal_position;

-- 12. Show all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'subjects';
