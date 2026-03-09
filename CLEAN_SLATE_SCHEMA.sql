-- ============================================================
-- CO-PO ATTAINMENT SYSTEM — CLEAN SLATE SCHEMA
-- This drops all existing tables and recreates them fresh
-- 
-- ⚠️ WARNING: This will DELETE ALL DATA in these tables!
-- Only run this if you want to start completely fresh.
-- ============================================================

-- STEP 1: Drop all existing tables (in reverse dependency order)
DROP TABLE IF EXISTS attainment_results CASCADE;
DROP TABLE IF EXISTS attainment_config CASCADE;

DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS survey_questions CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;

DROP TABLE IF EXISTS end_sem_marks CASCADE;
DROP TABLE IF EXISTS end_sem_questions CASCADE;
DROP TABLE IF EXISTS end_sem_exams CASCADE;

DROP TABLE IF EXISTS lab_record_marks CASCADE;
DROP TABLE IF EXISTS lab_records CASCADE;

DROP TABLE IF EXISTS assignment_marks CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

DROP TABLE IF EXISTS internal_test_marks CASCADE;
DROP TABLE IF EXISTS internal_test_questions CASCADE;
DROP TABLE IF EXISTS internal_tests CASCADE;

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS co_po_mapping CASCADE;
DROP TABLE IF EXISTS program_outcomes CASCADE;
DROP TABLE IF EXISTS course_outcomes CASCADE;

DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;

DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 1: CORE TABLES
-- ============================================================

-- 1. Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 2. Programs
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 3. Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FACULTY', 'STUDENT')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    register_no TEXT UNIQUE,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 4. Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- 5. Faculty-Subject Assignment
CREATE TABLE faculty_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(faculty_id, subject_id, academic_year)
);

-- 6. Student Enrollments
CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 7. Course Outcomes (COs)
CREATE TABLE course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(subject_id, co_number)
);

-- 8. Program Outcomes (POs)
CREATE TABLE program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    po_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(program_id, po_number)
);

-- 9. CO-PO Mapping
CREATE TABLE co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INTEGER CHECK (correlation_level IN (1, 2, 3)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(co_id, po_id)
);

-- 10. Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: DIRECT ASSESSMENT TABLES
-- ============================================================

-- 11. Internal Tests
CREATE TABLE internal_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
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
CREATE TABLE internal_test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES internal_tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, question_number)
);

-- 13. Internal Test Marks
CREATE TABLE internal_test_marks (
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
CREATE TABLE assignments (
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
CREATE TABLE assignment_marks (
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
CREATE TABLE lab_records (
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
CREATE TABLE lab_record_marks (
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
CREATE TABLE end_sem_exams (
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
CREATE TABLE end_sem_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES end_sem_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, question_number)
);

-- 20. End Sem Marks
CREATE TABLE end_sem_marks (
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
-- SECTION 3: INDIRECT ASSESSMENT TABLES
-- ============================================================

-- 21. Surveys
CREATE TABLE surveys (
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
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, question_number)
);

-- 23. Survey Responses
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, question_id, respondent_id)
);

-- ============================================================
-- SECTION 4: ATTAINMENT CONFIGURATION & RESULTS
-- ============================================================

-- 24. Attainment Configuration
CREATE TABLE attainment_config (
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

-- 25. Attainment Results
CREATE TABLE attainment_results (
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
-- SECTION 5: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_register_no ON users(register_no);
CREATE INDEX idx_subjects_program ON subjects(program_id);
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_course_outcomes_subject ON course_outcomes(subject_id);
CREATE INDEX idx_program_outcomes_program ON program_outcomes(program_id);
CREATE INDEX idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX idx_co_po_mapping_po ON co_po_mapping(po_id);
CREATE INDEX idx_internal_tests_subject ON internal_tests(subject_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_lab_records_subject ON lab_records(subject_id);
CREATE INDEX idx_end_sem_exams_subject ON end_sem_exams(subject_id);
CREATE INDEX idx_surveys_subject ON surveys(subject_id);
CREATE INDEX idx_attainment_results_subject ON attainment_results(subject_id);

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_test_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_record_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_sem_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_sem_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_sem_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_results ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all for service role" ON departments FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read for authenticated" ON departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON programs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read for authenticated" ON programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read for authenticated" ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON subjects FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read/write for authenticated" ON subjects FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated" ON faculty_subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON student_enrollments FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON course_outcomes FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read/write for authenticated" ON course_outcomes FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON program_outcomes FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read/write for authenticated" ON program_outcomes FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON co_po_mapping FOR ALL TO service_role USING (true);
CREATE POLICY "Allow read/write for authenticated" ON co_po_mapping FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated" ON documents FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON internal_tests FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON internal_test_questions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON internal_test_marks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON assignment_marks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON lab_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON lab_record_marks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON end_sem_exams FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON end_sem_questions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON end_sem_marks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON surveys FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON survey_questions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON survey_responses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON attainment_config FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON attainment_results FOR ALL TO authenticated USING (true);

-- ============================================================
-- MIGRATION COMPLETE ✅
-- All 25 tables created with indexes and RLS policies
-- ============================================================
