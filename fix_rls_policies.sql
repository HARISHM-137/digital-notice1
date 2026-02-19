-- Fix RLS policies for departments table
-- This allows anonymous and authenticated users to read departments

-- First, DROP existing policies to start fresh
DROP POLICY IF EXISTS "Allow all for service role" ON departments;
DROP POLICY IF EXISTS "Allow read for authenticated" ON departments;

-- Create new permissive policies
CREATE POLICY "Enable read access for all users" ON departments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON departments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON departments
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON departments
    FOR DELETE USING (true);

-- Verify RLS is enabled  
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Test query after fixing policies
SELECT * FROM departments;
