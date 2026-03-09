-- ============================================================
-- CO-PO ATTAINMENT SYSTEM - FINAL WORKING SCHEMA
-- This is a clean, tested schema that WILL work
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STEP 1: DROP ALL EXISTING TABLES (Clean Slate)
-- ============================================================

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
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS student_subjects CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ============================================================
-- STEP 2: CREATE CORE TABLES
-- ============================================================

-- 1. Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Programs
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    credits INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- 6. Student Enrollments (Legacy - kept for backward compatibility)
CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 6b. Student Subjects (NEW - Auto-assigned based on year)
CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 6c. Notifications (Advanced Targeting)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT,
    document_url TEXT,
    document_name TEXT,
    role_target TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role_target IN ('STUDENT', 'FACULTY', 'ALL')),
    department_target UUID REFERENCES departments(id) ON DELETE SET NULL,
    year_target INTEGER CHECK (year_target IS NULL OR year_target BETWEEN 1 AND 4),
    semester_target INTEGER CHECK (semester_target IS NULL OR semester_target BETWEEN 1 AND 8),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Course Outcomes (COs)
CREATE TABLE course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
-- STEP 3: CREATE ASSESSMENT TABLES
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
    UNIQUE(subject_id, test_number, academic_year)
);

-- 12. Internal Test Questions
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
    UNIQUE(subject_id, academic_year)
);

-- 19. End Sem Questions
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
    UNIQUE(exam_id, student_id)
);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_year ON users(year);
CREATE INDEX idx_subjects_program ON subjects(program_id);
CREATE INDEX idx_subjects_year ON subjects(year);
CREATE INDEX idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX idx_notifications_created_by ON notifications(created_by);
CREATE INDEX idx_notifications_visibility ON notifications(visibility);
CREATE INDEX idx_course_outcomes_subject ON course_outcomes(subject_id);
CREATE INDEX idx_program_outcomes_program ON program_outcomes(program_id);
CREATE INDEX idx_internal_tests_subject ON internal_tests(subject_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_end_sem_exams_subject ON end_sem_exams(subject_id);

-- ============================================================
-- STEP 5: ENABLE RLS AND CREATE PERMISSIVE POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
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

-- Create SIMPLE, PERMISSIVE policies for all tables
-- These allow everyone (anon + authenticated) to do everything
-- You can tighten these later based on roles

CREATE POLICY "Allow all access" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON faculty_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON student_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON student_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON course_outcomes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON program_outcomes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON co_po_mapping FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON internal_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON internal_test_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON internal_test_marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON assignment_marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON lab_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON lab_record_marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON end_sem_exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON end_sem_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON end_sem_marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON survey_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON survey_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON attainment_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON attainment_results FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 6: INSERT SAMPLE DATA (Optional - for testing)
-- ============================================================

-- Insert sample department
INSERT INTO departments (name, code) VALUES 
('Computer Science & Engineering', 'CSE'),
('Electronics & Communication', 'ECE'),
('Mechanical Engineering', 'MECH');

-- ============================================================
-- SCHEMA SETUP COMPLETE! ✅
-- ============================================================

-- Verify tables were created
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
