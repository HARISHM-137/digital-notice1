-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Programs
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (Student, Faculty, Admin)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Maps to Supabase Auth ID if using Auth
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FACULTY', 'STUDENT')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Faculty Subject Assignment
CREATE TABLE IF NOT EXISTS faculty_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(faculty_id, subject_id, academic_year)
);

-- 6. Student Enrollment
CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

-- 7. Course Outcomes (COs)
CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    co_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    target_attainment NUMERIC DEFAULT 0.6, -- e.g., 0.6 for 60%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, co_number)
);

-- 8. Program Outcomes (POs)
CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    po_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, po_number)
);

-- 9. CO-PO Mapping
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_level INTEGER CHECK (correlation_level IN (1, 2, 3)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(co_id, po_id)
);

-- 10. Student Marks
CREATE TABLE IF NOT EXISTS student_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    internal_marks NUMERIC DEFAULT 0,
    lab_marks NUMERIC DEFAULT 0,
    exam_marks NUMERIC DEFAULT 0,
    total_marks NUMERIC GENERATED ALWAYS AS (internal_marks + lab_marks + exam_marks) STORED,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id)
);

-- 11. Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES users(id),
    visibility TEXT CHECK (visibility IN ('ALL_STUDENTS', 'SPECIFIC_STUDENTS', 'ADMIN_ONLY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT CHECK (target_role IN ('STUDENT', 'FACULTY', 'ADMIN', 'ALL')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Application Settings (For Weightage & Thresholds)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE, -- e.g., 'direct_weightage', 'level_1_threshold'
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Program Specific Outcomes (PSOs)
CREATE TABLE IF NOT EXISTS program_specific_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    pso_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, pso_number)
);

-- 15. CO-PSO Mapping
CREATE TABLE IF NOT EXISTS co_pso_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    pso_id UUID REFERENCES program_specific_outcomes(id) ON DELETE CASCADE,
    correlation_level INTEGER CHECK (correlation_level IN (1, 2, 3)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(co_id, pso_id)
);

-- 16. Surveys (Indirect Assessment)
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL, -- e.g. "Course Exit Survey 2026"
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    type TEXT DEFAULT 'RATING', -- RATING (1-5), TEXT
    linked_co_id UUID REFERENCES course_outcomes(id), -- Optional link to CO
    order_index INTEGER DEFAULT 0
);

-- 18. Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
    response_value INTEGER, -- For Rating 1-5
    response_text TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions for new tables
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_specific_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_pso_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing polices if they exist to avoid errors (or use DO block, but keep simple for now)
-- Better: Create policies with unique names or handle error. 
-- For this environment, we'll use DO block to prevent errors if policies already exist.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'app_settings') THEN
        CREATE POLICY "Allow all access" ON app_settings FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'program_specific_outcomes') THEN
        CREATE POLICY "Allow all access" ON program_specific_outcomes FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'co_pso_mapping') THEN
        CREATE POLICY "Allow all access" ON co_pso_mapping FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'surveys') THEN
        CREATE POLICY "Allow all access" ON surveys FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'survey_questions') THEN
        CREATE POLICY "Allow all access" ON survey_questions FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'survey_responses') THEN
        CREATE POLICY "Allow all access" ON survey_responses FOR ALL USING (true);
    END IF;
END $$;


-- Row Level Security (RLS) - Simple permissive policies for Hackathon
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all access for valid users (Simplify for demo)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'users') THEN
        CREATE POLICY "Allow all access" ON users FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'departments') THEN
        CREATE POLICY "Allow all access" ON departments FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'programs') THEN
        CREATE POLICY "Allow all access" ON programs FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'subjects') THEN
        CREATE POLICY "Allow all access" ON subjects FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'faculty_subjects') THEN
        CREATE POLICY "Allow all access" ON faculty_subjects FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'student_enrollments') THEN
        CREATE POLICY "Allow all access" ON student_enrollments FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'course_outcomes') THEN
        CREATE POLICY "Allow all access" ON course_outcomes FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'program_outcomes') THEN
        CREATE POLICY "Allow all access" ON program_outcomes FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'co_po_mapping') THEN
        CREATE POLICY "Allow all access" ON co_po_mapping FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'student_marks') THEN
        CREATE POLICY "Allow all access" ON student_marks FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'documents') THEN
        CREATE POLICY "Allow all access" ON documents FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'notifications') THEN
        CREATE POLICY "Allow all access" ON notifications FOR ALL USING (true);
    END IF;
END $$;
