-- ============================================================
-- CO-PO Attainment System — Schema Migration
-- Run this in Supabase SQL Editor (idempotent — safe to re-run)
-- ============================================================

-- 0. Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add missing columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS year INTEGER NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT NULL;

-- 2. Add updated_at / updated_by to major tables
DO $$ BEGIN
  ALTER TABLE subjects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE subjects ADD COLUMN updated_by UUID NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE course_outcomes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE course_outcomes ADD COLUMN updated_by UUID NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE program_outcomes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE program_outcomes ADD COLUMN updated_by UUID NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE co_po_mapping ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE co_po_mapping ADD COLUMN updated_by UUID NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INTERNAL','ASSIGNMENT','LAB','END_SEMESTER')),
    max_marks NUMERIC NOT NULL DEFAULT 100,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, name, academic_year)
);

-- 4. Assessment Scores (per student per CO)
CREATE TABLE IF NOT EXISTS assessment_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE SET NULL,
    marks_obtained NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id, co_id)
);

-- 5. Attainment Config (weights)
CREATE TABLE IF NOT EXISTS attainment_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    direct_weight NUMERIC NOT NULL DEFAULT 0.8,
    indirect_weight NUMERIC NOT NULL DEFAULT 0.2,
    target_percentage NUMERIC NOT NULL DEFAULT 60,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, academic_year)
);

-- 6. Attainment Results
CREATE TABLE IF NOT EXISTS attainment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
    result_type TEXT NOT NULL CHECK (result_type IN ('CO','PO')),
    direct_attainment NUMERIC DEFAULT 0,
    indirect_attainment NUMERIC DEFAULT 0,
    final_attainment NUMERIC DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-26',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, co_id, po_id, result_type, academic_year)
);

-- 7. Enable RLS on new tables
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE attainment_results ENABLE ROW LEVEL SECURITY;

-- 8. Permissive policies for new tables (service role bypasses RLS)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'assessments') THEN
        CREATE POLICY "Allow all access" ON assessments FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'assessment_scores') THEN
        CREATE POLICY "Allow all access" ON assessment_scores FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'attainment_config') THEN
        CREATE POLICY "Allow all access" ON attainment_config FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'attainment_results') THEN
        CREATE POLICY "Allow all access" ON attainment_results FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_scores_assessment ON assessment_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_student ON assessment_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_attainment_results_subject ON attainment_results(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_outcomes_subject ON course_outcomes(subject_id);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_po ON co_po_mapping(po_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Done!
