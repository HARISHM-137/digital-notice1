-- Run this AFTER the cache fix to verify

-- 1. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subjects'
ORDER BY ordinal_position;

-- 2. Test INSERT
INSERT INTO subjects (name, code, program_id, semester, credits)
VALUES ('Test Subject', 'TEST101', NULL, 1, 3)
ON CONFLICT (code) DO NOTHING
RETURNING id, name, code;

-- 3. Test SELECT
SELECT id, name, code, semester, credits
FROM subjects
WHERE code = 'TEST101';

-- 4. Test UPDATE
UPDATE subjects 
SET name = 'Test Subject Updated'
WHERE code = 'TEST101'
RETURNING id, name, code;

-- 5. Check policies work
SELECT * FROM subjects LIMIT 5;

-- 6. Clean up test data
DELETE FROM subjects WHERE code = 'TEST101';
