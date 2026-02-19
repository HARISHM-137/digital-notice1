-- ============================================================
-- CLEANUP SCRIPT - Run this FIRST before complete_schema.sql
-- This drops all tables that might have schema conflicts
-- ============================================================

-- Drop tables in correct order (respecting foreign keys)
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

DROP TABLE IF EXISTS attainment_results CASCADE;
DROP TABLE IF EXISTS attainment_config CASCADE;

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS co_po_mapping CASCADE;
DROP TABLE IF EXISTS program_outcomes CASCADE;
DROP TABLE IF EXISTS course_outcomes CASCADE;

DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;

-- Don't drop subjects, users, programs, departments
-- We'll just add missing columns to them

-- ============================================================
-- CLEANUP COMPLETE
-- Now run complete_schema.sql to recreate all tables
-- ============================================================
