-- ============================================================
-- CO-PO SYSTEM DATABASE UPDATE SCRIPT (v3 — COMPLETE)
-- Copy and paste this ENTIRE file into your Supabase SQL Editor and click RUN.
-- ============================================================

-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='year') THEN
        ALTER TABLE subjects ADD COLUMN year INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='total_internal_marks') THEN
        ALTER TABLE subjects ADD COLUMN total_internal_marks INTEGER DEFAULT 25;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='total_external_marks') THEN
        ALTER TABLE subjects ADD COLUMN total_external_marks INTEGER DEFAULT 75;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='academic_year') THEN
        ALTER TABLE subjects ADD COLUMN academic_year TEXT DEFAULT '2025-26';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_outcomes' AND column_name='cutoff_mark') THEN
        ALTER TABLE course_outcomes ADD COLUMN cutoff_mark INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='semester') THEN
        ALTER TABLE users ADD COLUMN semester INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='register_no') THEN
        ALTER TABLE users ADD COLUMN register_no TEXT;
    END IF;
END $$;

-- 2. CREATE TABLES IF NOT EXISTS

-- CO-PSO Mapping
CREATE TABLE IF NOT EXISTS co_pso_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    pso_number INTEGER NOT NULL,
    mapping_value INTEGER NOT NULL CHECK (mapping_value IN (0, 1, 2, 3)),
    UNIQUE(subject_id, co_number, pso_number)
);

-- Student CO Marks
CREATE TABLE IF NOT EXISTS student_co_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    UNIQUE(student_id, subject_id, co_number)
);

-- CO Attainment Results
CREATE TABLE IF NOT EXISTS co_attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    total_students INTEGER DEFAULT 0,
    students_passed INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    attainment_value INTEGER CHECK (attainment_value IN (1, 2, 3)),
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, co_number, academic_year)
);

-- PO Attainment Results
CREATE TABLE IF NOT EXISTS po_attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    po_number INTEGER NOT NULL,
    attainment_value DECIMAL(4,2) DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, po_number, academic_year)
);

-- PSO Attainment Results
CREATE TABLE IF NOT EXISTS pso_attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    pso_number INTEGER NOT NULL,
    attainment_value DECIMAL(4,2) DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, pso_number, academic_year)
);

-- 3. ENSURE UNIQUE CONSTRAINT ON faculty_subjects
ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_faculty_id_subject_id_key;
ALTER TABLE faculty_subjects ADD CONSTRAINT faculty_subjects_faculty_id_subject_id_key UNIQUE (faculty_id, subject_id);

-- 4. FIX STORAGE BUCKET + RLS POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

CREATE POLICY "Allow public uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow public downloads" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Allow public updates" ON storage.objects
    FOR UPDATE USING (bucket_id = 'documents');
CREATE POLICY "Allow public deletes" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents');

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
