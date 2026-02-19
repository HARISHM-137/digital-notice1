-- ============================================================
-- NUCLEAR OPTION: COMPLETE TABLE RECREATION
-- This will DROP and RECREATE subjects table from scratch
-- WARNING: This will delete all data in subjects table
-- ============================================================

-- Step 1: Drop everything related to subjects
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS survey_questions CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS attainment_results CASCADE;
DROP TABLE IF EXISTS attainment_config CASCADE;
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

-- Step 2: Recreate subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL DEFAULT 1,
    credits INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- Step 3: Recreate dependent tables
CREATE TABLE faculty_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(faculty_id, subject_id, academic_year)
);

CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, academic_year)
);

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

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE internal_test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES internal_tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, question_number)
);

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

CREATE TABLE end_sem_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES end_sem_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, question_number)
);

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

-- Step 4: Create indexes
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_program ON subjects(program_id);
CREATE INDEX idx_course_outcomes_subject ON course_outcomes(subject_id);
CREATE INDEX idx_program_outcomes_program ON program_outcomes(program_id);
CREATE INDEX idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX idx_co_po_mapping_po ON co_po_mapping(po_id);

-- Step 5: Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mapping ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
CREATE POLICY "Allow all for service role" ON subjects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON subjects FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON course_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON course_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON program_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON program_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON co_po_mapping FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON co_po_mapping FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 7: Grant permissions
GRANT ALL ON subjects TO authenticated;
GRANT ALL ON subjects TO service_role;
GRANT ALL ON subjects TO anon;
GRANT ALL ON course_outcomes TO authenticated;
GRANT ALL ON course_outcomes TO service_role;
GRANT ALL ON program_outcomes TO authenticated;
GRANT ALL ON program_outcomes TO service_role;
GRANT ALL ON co_po_mapping TO authenticated;
GRANT ALL ON co_po_mapping TO service_role;

-- Step 8: Notify PostgREST
NOTIFY pgrst, 'reload schema';

-- Step 9: Insert test data
INSERT INTO subjects (name, code, program_id, semester, credits)
VALUES 
    ('Database Management Systems', 'CS301', NULL, 3, 4),
    ('Operating Systems', 'CS302', NULL, 3, 4),
    ('Computer Networks', 'CS303', NULL, 4, 3)
ON CONFLICT (code) DO NOTHING;

-- Step 10: Verify
SELECT 
    'subjects' as table_name,
    count(*) as row_count,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM subjects, information_schema.columns 
WHERE table_name = 'subjects' AND table_schema = 'public'
GROUP BY table_name;

-- Test query
SELECT id, name, code, semester, credits FROM subjects;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '✅ COMPLETE! subjects table recreated';
    RAISE NOTICE '✅ Schema reloaded';
    RAISE NOTICE '✅ Test data inserted';
    RAISE NOTICE '';
    RAISE NOTICE 'Try in frontend: supabase.from("subjects").select("*")';
END $$;
