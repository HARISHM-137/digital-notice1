-- ============================================================
-- CO-PO ATTAINMENT SYSTEM — SCHEMA MIGRATION V2
-- Run this in Supabase SQL Editor
-- Adds missing tables and fixes RLS policies
-- ============================================================

-- 1. Create student_subjects table (code uses this instead of student_enrollments)
CREATE TABLE IF NOT EXISTS student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 2. Create student_co_marks table for CO-wise marks
CREATE TABLE IF NOT EXISTS student_co_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    marks DECIMAL(5,2) NOT NULL DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, co_number, academic_year)
);

-- 3. Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    document_url TEXT,
    document_name TEXT,
    role_target TEXT NOT NULL DEFAULT 'STUDENT',
    department_target UUID REFERENCES departments(id) ON DELETE SET NULL,
    year_target INTEGER,
    semester_target INTEGER,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create co_pso_mapping table if not exists
CREATE TABLE IF NOT EXISTS co_pso_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    pso_number INTEGER NOT NULL,
    mapping_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on new tables
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_co_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_pso_mapping ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive RLS policies (allow all for authenticated users)
-- student_subjects
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON student_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for service role" ON student_subjects FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON student_subjects FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- student_co_marks
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON student_co_marks FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for service role" ON student_co_marks FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON student_co_marks FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notifications
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for service role" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON notifications FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- co_pso_mapping
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON co_pso_mapping FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for service role" ON co_pso_mapping FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Fix departments RLS - allow ALL operations for authenticated + anon (not just SELECT)
DROP POLICY IF EXISTS "Allow read for authenticated" ON departments;
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON departments FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Fix programs RLS
DROP POLICY IF EXISTS "Allow read for authenticated" ON programs;
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON programs FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Fix users RLS - allow writes
DROP POLICY IF EXISTS "Allow read for authenticated" ON users;
DO $$ BEGIN
    CREATE POLICY "Allow all for authenticated" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. Fix subjects RLS
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON subjects FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. Fix course_outcomes RLS
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON course_outcomes FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 12. Fix faculty_subjects RLS
DO $$ BEGIN
    CREATE POLICY "Allow all for anon" ON faculty_subjects FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_co_marks_student ON student_co_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_co_marks_subject ON student_co_marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ============================================================
-- 14. ADDITIONAL TABLES NEEDED FOR ATTAINMENT CALCULATION
-- ============================================================

-- Add updated_at to notifications if missing
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Program Outcomes (POs)
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    po_number INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(program_id, po_number)
);

-- Program Specific Outcomes (PSOs)
CREATE TABLE IF NOT EXISTS program_specific_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    pso_number INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, pso_number)
);

-- CO-PO Mapping — add missing columns to existing table (it may already exist with co_id/po_id only)
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID,
    po_id UUID,
    correlation_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- Add new columns needed by create-subject and attainment APIs
ALTER TABLE co_po_mapping ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE co_po_mapping ADD COLUMN IF NOT EXISTS co_number INTEGER;
ALTER TABLE co_po_mapping ADD COLUMN IF NOT EXISTS po_number INTEGER;
ALTER TABLE co_po_mapping ADD COLUMN IF NOT EXISTS mapping_value INTEGER DEFAULT 0;

-- Add unique constraint (ignore if already exists)
DO $$ BEGIN
    ALTER TABLE co_po_mapping ADD CONSTRAINT co_po_mapping_subject_co_po_unique UNIQUE (subject_id, co_number, po_number);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- Also add missing columns to co_pso_mapping if they don't exist
ALTER TABLE co_pso_mapping ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE co_pso_mapping ADD COLUMN IF NOT EXISTS co_number INTEGER;
ALTER TABLE co_pso_mapping ADD COLUMN IF NOT EXISTS pso_number INTEGER;
ALTER TABLE co_pso_mapping ADD COLUMN IF NOT EXISTS mapping_value INTEGER DEFAULT 0;
DO $$ BEGIN
    ALTER TABLE co_pso_mapping ADD CONSTRAINT co_pso_mapping_subject_co_pso_unique UNIQUE (subject_id, co_number, pso_number);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- Attainment Configuration
CREATE TABLE IF NOT EXISTS attainment_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    direct_weight DECIMAL(3,2) DEFAULT 0.80,
    indirect_weight DECIMAL(3,2) DEFAULT 0.20,
    target_percentage INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, academic_year)
);

-- Legacy attainment results (used by student dashboard)
CREATE TABLE IF NOT EXISTS attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    result_type TEXT CHECK (result_type IN ('CO', 'PO')),
    co_id UUID,
    po_id UUID,
    direct_attainment DECIMAL(5,2),
    indirect_attainment DECIMAL(5,2),
    final_attainment DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- ============================================================
-- 15. RLS POLICIES FOR NEW ATTAINMENT TABLES
-- ============================================================

ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_attainment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_attainment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE pso_attainment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_results ENABLE ROW LEVEL SECURITY;

-- program_outcomes
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON program_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON program_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for anon" ON program_outcomes FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- co_po_mapping
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON co_po_mapping FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON co_po_mapping FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for anon" ON co_po_mapping FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- co_attainment_results
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON co_attainment_results FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON co_attainment_results FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for anon" ON co_attainment_results FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- po_attainment_results
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON po_attainment_results FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON po_attainment_results FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for anon" ON po_attainment_results FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pso_attainment_results
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON pso_attainment_results FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON pso_attainment_results FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for anon" ON pso_attainment_results FOR ALL TO anon USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- attainment_config
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON attainment_config FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON attainment_config FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- attainment_results
DO $$ BEGIN CREATE POLICY "Allow all for authenticated" ON attainment_results FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow all for service role" ON attainment_results FOR ALL TO service_role USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 28. New Schema Updates for Phase 2 Overhaul
ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS max_marks INTEGER DEFAULT 20;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lab_max_marks INTEGER DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS assignment_max_marks INTEGER DEFAULT 0;

ALTER TABLE student_co_marks ADD COLUMN IF NOT EXISTS lab_marks DECIMAL(5,2) DEFAULT 0;
ALTER TABLE student_co_marks ADD COLUMN IF NOT EXISTS assignment_marks DECIMAL(5,2) DEFAULT 0;

-- ============================================================
-- MIGRATION V2 COMPLETE ✅
-- After running this, run sample_data.sql to insert test data
-- ============================================================
