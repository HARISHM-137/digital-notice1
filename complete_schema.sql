-- ============================================================
-- CO-PO ATTAINMENT SYSTEM — COMPLETE PRODUCTION SCHEMA
-- Addresses all errors + adds all assessment modules
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 1: CORE TABLES (WITH FIXES)
-- ============================================================

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 2. Programs
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 3. Users (FIXED: Added register_no, year)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FACULTY', 'STUDENT')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    register_no TEXT UNIQUE,  -- For students
    year INTEGER,  -- For students (1-4)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 4. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL DEFAULT 1,
    credits INTEGER NOT NULL,
    total_internal_marks INTEGER DEFAULT 25,
    total_external_marks INTEGER DEFAULT 75,
    academic_year TEXT DEFAULT '2025-26',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 5. Faculty-Subject Assignment
CREATE TABLE IF NOT EXISTS faculty_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(faculty_id, subject_id, academic_year)
);

-- 6. Student Enrollments (legacy table)
CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 6b. Student Subjects (PRIMARY enrollment table used by the app)
CREATE TABLE IF NOT EXISTS student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 7. Course Outcomes (COs)
CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cutoff_mark INTEGER DEFAULT 0,             -- Marks threshold for attainment
    target_attainment DECIMAL(3,2) DEFAULT 0.60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, co_number)
);

-- 8. Program Outcomes (POs)
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    po_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(program_id, po_number)
);

-- 9. CO-PO Mapping (subject + co_number + po_number based — no FK to outcomes table)
-- This allows simple mapping without needing course_outcome rows first
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    po_number INTEGER NOT NULL,
    mapping_value INTEGER NOT NULL DEFAULT 0 CHECK (mapping_value BETWEEN 0 AND 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Keep legacy columns for backward compatibility
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INTEGER CHECK (correlation_level IN (1, 2, 3)),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, co_number, po_number)
);

-- 9b. CO-PSO Mapping (subject-level)
CREATE TABLE IF NOT EXISTS co_pso_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    pso_number INTEGER NOT NULL,
    mapping_value INTEGER NOT NULL DEFAULT 0 CHECK (mapping_value BETWEEN 0 AND 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, co_number, pso_number)
);

-- 10. Documents (for AI uploads)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: DIRECT ASSESSMENT TABLES (NEW)
-- ============================================================

-- 11. Internal Tests
CREATE TABLE IF NOT EXISTS internal_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,  -- "Internal Test 1", "Internal Test 2", etc.
    test_number INTEGER NOT NULL CHECK (test_number IN (1, 2, 3)),
    max_marks INTEGER NOT NULL,
    conducted_date DATE,
    academic_year TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, test_number, academic_year)
);

-- 12. Internal Test Question-CO Mapping
CREATE TABLE IF NOT EXISTS internal_test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES internal_tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, question_number)
);

-- 13. Internal Test Marks
CREATE TABLE IF NOT EXISTS internal_test_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES internal_tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(test_id, student_id)
);

-- 14. Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    assignment_name TEXT NOT NULL,
    assignment_number INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    due_date DATE,
    academic_year TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, assignment_number, academic_year)
);

-- 15. Assignment Marks
CREATE TABLE IF NOT EXISTS assignment_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(assignment_id, student_id)
);

-- 16. Lab Records
CREATE TABLE IF NOT EXISTS lab_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    experiment_name TEXT NOT NULL,
    experiment_number INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, experiment_number, academic_year)
);

-- 17. Lab Record Marks
CREATE TABLE IF NOT EXISTS lab_record_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_record_id UUID REFERENCES lab_records(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(lab_record_id, student_id)
);

-- 18. End Semester Exams
CREATE TABLE IF NOT EXISTS end_sem_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    max_marks INTEGER NOT NULL,
    exam_date DATE,
    academic_year TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, academic_year)
);

-- 19. End Sem Question-CO Mapping
CREATE TABLE IF NOT EXISTS end_sem_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES end_sem_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, question_number)
);

-- 20. End Sem Marks
CREATE TABLE IF NOT EXISTS end_sem_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES end_sem_exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(exam_id, student_id)
);

-- ============================================================
-- SECTION 3: INDIRECT ASSESSMENT TABLES (NEW)
-- ============================================================

-- 21. Surveys
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    survey_type TEXT NOT NULL CHECK (survey_type IN ('STUDENT', 'ALUMNI', 'EMPLOYER')),
    title TEXT NOT NULL,
    description TEXT,
    academic_year TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 22. Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, question_number)
);

-- 23. Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL for anonymous
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, question_id, respondent_id)
);

-- ============================================================
-- SECTION 4: ATTAINMENT CONFIGURATION & RESULTS
-- ============================================================

-- 24. Attainment Configuration
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

-- 25. Attainment Results (legacy - kept for backward compat)
CREATE TABLE IF NOT EXISTS attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    result_type TEXT CHECK (result_type IN ('CO', 'PO')),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    direct_attainment DECIMAL(5,2),
    indirect_attainment DECIMAL(5,2),
    final_attainment DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 4b: NEW CO-PO-PSO ATTAINMENT TABLES
-- ============================================================

-- 26. Program Specific Outcomes (PSOs)
CREATE TABLE IF NOT EXISTS program_specific_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    pso_number INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, pso_number)
);

-- 27. Student CO Marks (direct CO-level mark entry)
CREATE TABLE IF NOT EXISTS student_co_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    marks DECIMAL(6,2) NOT NULL DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, co_number, academic_year)
);

-- 28. CO Attainment Results
CREATE TABLE IF NOT EXISTS co_attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    total_students INTEGER DEFAULT 0,
    students_passed INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    attainment_value INTEGER CHECK (attainment_value IN (1, 2, 3)),  -- 1=low, 2=med, 3=high
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, co_number, academic_year)
);

-- 29. PO Attainment Results
CREATE TABLE IF NOT EXISTS po_attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    po_number INTEGER NOT NULL,
    attainment_value DECIMAL(4,2) DEFAULT 0,  -- e.g. 2.3
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, po_number, academic_year)
);

-- 30. PSO Attainment Results
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
-- SECTION 5: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- Add missing columns if they don't exist (safe idempotent)
DO $$
BEGIN
    -- Add register_no to users if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='register_no') THEN
        ALTER TABLE users ADD COLUMN register_no TEXT UNIQUE;
    END IF;
    
    -- Add year to users if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='year') THEN
        ALTER TABLE users ADD COLUMN year INTEGER;
    END IF;
    
    -- Add updated_at/updated_by to users if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_by') THEN
        ALTER TABLE users ADD COLUMN updated_by UUID;
    END IF;
    
    -- Add code to subjects if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='code') THEN
        ALTER TABLE subjects ADD COLUMN code TEXT;
        -- Add unique constraint separately to avoid conflicts
        ALTER TABLE subjects ADD CONSTRAINT subjects_code_unique UNIQUE (code);
    END IF;
    
    -- Add program_id to subjects if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='program_id') THEN
        ALTER TABLE subjects ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
    END IF;
    
    -- Add semester to subjects if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='semester') THEN
        ALTER TABLE subjects ADD COLUMN semester INTEGER DEFAULT 1;
    END IF;
    
    -- Add credits to subjects if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='credits') THEN
        ALTER TABLE subjects ADD COLUMN credits INTEGER DEFAULT 3;
    END IF;
    
    -- Add updated_at/updated_by to subjects if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='updated_at') THEN
        ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='updated_by') THEN
        ALTER TABLE subjects ADD COLUMN updated_by UUID;
    END IF;

    -- Add new academic columns to subjects if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='year') THEN
        ALTER TABLE subjects ADD COLUMN year INTEGER NOT NULL DEFAULT 1;
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

    -- Add cutoff_mark to course_outcomes if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_outcomes' AND column_name='cutoff_mark') THEN
        ALTER TABLE course_outcomes ADD COLUMN cutoff_mark INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================================
-- SECTION 6: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_register_no ON users(register_no);
CREATE INDEX IF NOT EXISTS idx_subjects_program ON subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_outcomes_subject ON course_outcomes(subject_id);
CREATE INDEX IF NOT EXISTS idx_program_outcomes_program ON program_outcomes(program_id);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_po ON co_po_mapping(po_id);
CREATE INDEX IF NOT EXISTS idx_internal_tests_subject ON internal_tests(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_lab_records_subject ON lab_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_end_sem_exams_subject ON end_sem_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_surveys_subject ON surveys(subject_id);
CREATE INDEX IF NOT EXISTS idx_attainment_results_subject ON attainment_results(subject_id);

-- ============================================================
-- SECTION 7: ROW LEVEL SECURITY (ENABLE BUT PERMISSIVE FOR NOW)
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_sem_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_results ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow service role to bypass, authenticated users can read/write)
-- Note: If policies already exist, you may need to drop them first or ignore duplicate errors

DO $$ 
BEGIN
    -- Departments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON departments FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'Allow read for authenticated') THEN
        CREATE POLICY "Allow read for authenticated" ON departments FOR SELECT TO authenticated USING (true);
    END IF;
    
    -- Programs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON programs FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Allow read for authenticated') THEN
        CREATE POLICY "Allow read for authenticated" ON programs FOR SELECT TO authenticated USING (true);
    END IF;
    
    -- Users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON users FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow read for authenticated') THEN
        CREATE POLICY "Allow read for authenticated" ON users FOR SELECT TO authenticated USING (true);
    END IF;
    
    -- Subjects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON subjects FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Allow read/write for authenticated') THEN
        CREATE POLICY "Allow read/write for authenticated" ON subjects FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Course Outcomes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_outcomes' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON course_outcomes FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_outcomes' AND policyname = 'Allow read/write for authenticated') THEN
        CREATE POLICY "Allow read/write for authenticated" ON course_outcomes FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Program Outcomes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_outcomes' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON program_outcomes FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_outcomes' AND policyname = 'Allow read/write for authenticated') THEN
        CREATE POLICY "Allow read/write for authenticated" ON program_outcomes FOR ALL TO authenticated USING (true);
    END IF;
    
    -- CO-PO Mapping
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'co_po_mapping' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON co_po_mapping FOR ALL TO service_role USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'co_po_mapping' AND policyname = 'Allow read/write for authenticated') THEN
        CREATE POLICY "Allow read/write for authenticated" ON co_po_mapping FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Internal Tests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_tests' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON internal_tests FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Assignments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON assignments FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Lab Records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_records' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON lab_records FOR ALL TO authenticated USING (true);
    END IF;
    
    -- End Sem Exams
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'end_sem_exams' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON end_sem_exams FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Surveys
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surveys' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON surveys FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Attainment Config
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attainment_config' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON attainment_config FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Attainment Results
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attainment_results' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON attainment_results FOR ALL TO authenticated USING (true);
    END IF;

    -- Student Subjects (primary enrollment table)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_subjects' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON student_subjects FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_subjects' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON student_subjects FOR ALL TO authenticated USING (true);
    END IF;

    -- Student Enrollments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_enrollments' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON student_enrollments FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_enrollments' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON student_enrollments FOR ALL TO authenticated USING (true);
    END IF;

    -- Faculty Subjects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faculty_subjects' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON faculty_subjects FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faculty_subjects' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON faculty_subjects FOR ALL TO authenticated USING (true);
    END IF;

    -- Internal Test Marks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_test_marks' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON internal_test_marks FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_test_marks' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON internal_test_marks FOR ALL TO authenticated USING (true);
    END IF;

    -- Assignment Marks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_marks' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON assignment_marks FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_marks' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON assignment_marks FOR ALL TO authenticated USING (true);
    END IF;

    -- Lab Record Marks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_record_marks' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON lab_record_marks FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_record_marks' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON lab_record_marks FOR ALL TO authenticated USING (true);
    END IF;

    -- End Sem Marks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'end_sem_marks' AND policyname = 'Allow all for service role') THEN
        CREATE POLICY "Allow all for service role" ON end_sem_marks FOR ALL TO service_role USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'end_sem_marks' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON end_sem_marks FOR ALL TO authenticated USING (true);
    END IF;

    -- Survey Questions & Responses
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_questions' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON survey_questions FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_responses' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON survey_responses FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
