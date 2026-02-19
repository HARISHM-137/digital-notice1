-- Test query to check if departments table exists and is accessible
SELECT COUNT(*) FROM departments;

-- If the above works, try to insert a test department
INSERT INTO departments (name, code) VALUES ('Test Department', 'TEST');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual  
FROM pg_policies 
WHERE tablename = 'departments';
