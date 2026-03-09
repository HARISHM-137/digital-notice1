-- ============================================================
-- COMPLETE POSTGREST SCHEMA CACHE FIX + VERIFICATION
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: FORCE SCHEMA RELOAD
-- ============================================================

-- Force schema reload with no-op column modifications
ALTER TABLE subjects ALTER COLUMN name TYPE text;
ALTER TABLE subjects ALTER COLUMN code TYPE text;
ALTER TABLE subjects ALTER COLUMN created_at TYPE timestamptz;

-- Add comments to force cache invalidation
COMMENT ON TABLE subjects IS 'Subjects table - schema cache refreshed';
COMMENT ON COLUMN subjects.name IS 'Subject name column';
COMMENT ON COLUMN subjects.code IS 'Subject code column';

-- ============================================================
-- PART 2: RESET RLS POLICIES
-- ============================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all for service role" ON subjects;
DROP POLICY IF EXISTS "Allow all for authenticated" ON subjects;
DROP POLICY IF EXISTS "Allow read/write for authenticated" ON subjects;
DROP POLICY IF EXISTS "Allow read for authenticated" ON subjects;
DROP POLICY IF EXISTS "Enable read access for all users" ON subjects;

-- Create fresh permissive policies
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

-- Ensure RLS is enabled
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON subjects TO authenticated;
GRANT ALL ON subjects TO service_role;
GRANT ALL ON subjects TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;

-- ============================================================
-- PART 4: NOTIFY POSTGREST TO RELOAD
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PART 5: VERIFICATION
-- ============================================================

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

-- ============================================================
-- PART 6: TEST QUERIES
-- ============================================================

-- Show all columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subjects'
ORDER BY ordinal_position;

-- Show all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'subjects';

-- Test SELECT (should work now)
SELECT id, name, code, program_id, semester, credits
FROM subjects 
LIMIT 5;

-- ============================================================
-- PART 7: FUNCTIONAL TESTS
-- ============================================================

-- Test INSERT
INSERT INTO subjects (name, code, program_id, semester, credits)
VALUES ('Test Subject', 'TEST101', NULL, 1, 3)
ON CONFLICT (code) DO NOTHING
RETURNING id, name, code;

-- Test SELECT specific
SELECT id, name, code, semester, credits
FROM subjects
WHERE code = 'TEST101';

-- Test UPDATE
UPDATE subjects 
SET name = 'Test Subject Updated'
WHERE code = 'TEST101'
RETURNING id, name, code;

-- Clean up test data
DELETE FROM subjects WHERE code = 'TEST101';

-- ============================================================
-- DONE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PostgREST cache fix complete!';
    RAISE NOTICE '✅ All policies reset!';
    RAISE NOTICE '✅ Permissions granted!';
    RAISE NOTICE '✅ Schema reloaded!';
    RAISE NOTICE '';
    RAISE NOTICE 'Your frontend should now work. Try:';
    RAISE NOTICE 'const { data } = await supabase.from("subjects").select("*")';
END $$;
