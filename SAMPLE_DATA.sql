-- ============================================================
-- SAMPLE DATA FOR CO-PO ATTAINMENT SYSTEM
-- Run this AFTER creating the schema
-- ============================================================

-- Clean up existing sample data (optional)
DELETE FROM users WHERE email LIKE '%@sample.edu';
DELETE FROM programs WHERE code IN ('CSE', 'ECE', 'MECH');
DELETE FROM departments WHERE code IN ('CS', 'EC', 'ME');

-- ============================================================
-- 1. SAMPLE DEPARTMENTS
-- ============================================================

INSERT INTO departments (id, name, code, created_at) VALUES
('10000000-0000-0000-0000-000000000001', 'Computer Science & Engineering', 'CS', NOW()),
('20000000-0000-0000-0000-000000000002', 'Electronics & Communication Engineering', 'EC', NOW()),
('30000000-0000-0000-0000-000000000003', 'Mechanical Engineering', 'ME', NOW());

-- ============================================================
-- 2. SAMPLE PROGRAMS
-- ============================================================

INSERT INTO programs (id, name, code, department_id, created_at) VALUES
('a0000000-0000-0000-0000-00000000000a', 'B.Tech Computer Science & Engineering', 'CSE', '10000000-0000-0000-0000-000000000001', NOW()),
('b0000000-0000-0000-0000-00000000000b', 'B.Tech Electronics & Communication', 'ECE', '20000000-0000-0000-0000-000000000002', NOW()),
('c0000000-0000-0000-0000-00000000000c', 'B.Tech Mechanical Engineering', 'MECH', '30000000-0000-0000-0000-000000000003', NOW());

-- ============================================================
-- 3. SAMPLE USERS
-- ============================================================

-- ADMIN USERS
-- Email: admin@sample.edu, Password: Admin@123
INSERT INTO users (id, email, name, role, department_id, created_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'admin@sample.edu', 'Dr. Admin Kumar', 'ADMIN', '10000000-0000-0000-0000-000000000001', NOW());

-- Email: principal@sample.edu, Password: Principal@123
INSERT INTO users (id, email, name, role, department_id, created_at) VALUES
('a2000000-0000-0000-0000-000000000002', 'principal@sample.edu', 'Dr. Principal Sharma', 'ADMIN', NULL, NOW());

-- FACULTY USERS
-- Email: faculty1@sample.edu, Password: Faculty@123
INSERT INTO users (id, email, name, role, department_id, created_at) VALUES
('f1000000-0000-0000-0000-00000000000f', 'faculty1@sample.edu', 'Dr. Rajesh Verma', 'FACULTY', '10000000-0000-0000-0000-000000000001', NOW());

-- Email: faculty2@sample.edu, Password: Faculty@123
INSERT INTO users (id, email, name, role, department_id, created_at) VALUES
('f2000000-0000-0000-0000-00000000000f', 'faculty2@sample.edu', 'Dr. Priya Singh', 'FACULTY', '10000000-0000-0000-0000-000000000001', NOW());

-- Email: faculty3@sample.edu, Password: Faculty@123
INSERT INTO users (id, email, name, role, department_id, created_at) VALUES
('f3000000-0000-0000-0000-00000000000f', 'faculty3@sample.edu', 'Dr. Amit Patel', 'FACULTY', '20000000-0000-0000-0000-000000000002', NOW());

-- Email: hod@sample.edu, Password: Hod@123
INSERT INTO users (id, email, name, role, department_id, created_at) VALUES
('f4000000-0000-0000-0000-00000000000f', 'hod@sample.edu', 'Dr. HOD Rao (CS Dept)', 'FACULTY', '10000000-0000-0000-0000-000000000001', NOW());

-- STUDENT USERS
-- Email: student1@sample.edu, Password: Student@123
INSERT INTO users (id, email, name, role, department_id, register_no, year, created_at) VALUES
('11110000-0000-0000-0000-000000000001', 'student1@sample.edu', 'Rahul Sharma', 'STUDENT', '10000000-0000-0000-0000-000000000001', 'CSE2023001', 3, NOW());

-- Email: student2@sample.edu, Password: Student@123
INSERT INTO users (id, email, name, role, department_id, register_no, year, created_at) VALUES
('22220000-0000-0000-0000-000000000002', 'student2@sample.edu', 'Priya Gupta', 'STUDENT', '10000000-0000-0000-0000-000000000001', 'CSE2023002', 3, NOW());

-- Email: student3@sample.edu, Password: Student@123
INSERT INTO users (id, email, name, role, department_id, register_no, year, created_at) VALUES
('33330000-0000-0000-0000-000000000003', 'student3@sample.edu', 'Amit Kumar', 'STUDENT', '10000000-0000-0000-0000-000000000001', 'CSE2023003', 3, NOW());

-- Email: student4@sample.edu, Password: Student@123
INSERT INTO users (id, email, name, role, department_id, register_no, year, created_at) VALUES
('44440000-0000-0000-0000-000000000004', 'student4@sample.edu', 'Sneha Reddy', 'STUDENT', '10000000-0000-0000-0000-000000000001', 'CSE2023004', 3, NOW());

-- Email: student5@sample.edu, Password: Student@123
INSERT INTO users (id, email, name, role, department_id, register_no, year, created_at) VALUES
('55550000-0000-0000-0000-000000000005', 'student5@sample.edu', 'Vikram Singh', 'STUDENT', '20000000-0000-0000-0000-000000000002', 'ECE2023001', 2, NOW());

-- ============================================================
-- 4. SAMPLE SUBJECTS
-- ============================================================

INSERT INTO subjects (id, name, code, program_id, semester, credits, created_at) VALUES
('d1110000-0000-0000-0000-000000000001', 'Data Structures and Algorithms', 'CS301', 'a0000000-0000-0000-0000-00000000000a', 3, 4, NOW()),
('d2220000-0000-0000-0000-000000000002', 'Database Management Systems', 'CS302', 'a0000000-0000-0000-0000-00000000000a', 3, 4, NOW()),
('d3330000-0000-0000-0000-000000000003', 'Operating Systems', 'CS303', 'a0000000-0000-0000-0000-00000000000a', 5, 3, NOW()),
('d4440000-0000-0000-0000-000000000004', 'Computer Networks', 'CS304', 'a0000000-0000-0000-0000-00000000000a', 5, 3, NOW()),
('d5550000-0000-0000-0000-000000000005', 'Digital Signal Processing', 'EC301', 'b0000000-0000-0000-0000-00000000000b', 3, 4, NOW());

-- ============================================================
-- 5. FACULTY-SUBJECT ASSIGNMENTS
-- ============================================================

INSERT INTO faculty_subjects (faculty_id, subject_id, academic_year, created_at) VALUES
('f1000000-0000-0000-0000-00000000000f', 'd1110000-0000-0000-0000-000000000001', '2024-25', NOW()),
('f2000000-0000-0000-0000-00000000000f', 'd2220000-0000-0000-0000-000000000002', '2024-25', NOW()),
('f1000000-0000-0000-0000-00000000000f', 'd3330000-0000-0000-0000-000000000003', '2024-25', NOW()),
('f2000000-0000-0000-0000-00000000000f', 'd4440000-0000-0000-0000-000000000004', '2024-25', NOW()),
('f3000000-0000-0000-0000-00000000000f', 'd5550000-0000-0000-0000-000000000005', '2024-25', NOW());

-- ============================================================
-- 6. STUDENT ENROLLMENTS
-- ============================================================

-- Enroll CS students in CS subjects
INSERT INTO student_enrollments (student_id, subject_id, academic_year, created_at) VALUES
('11110000-0000-0000-0000-000000000001', 'd1110000-0000-0000-0000-000000000001', '2024-25', NOW()),
('11110000-0000-0000-0000-000000000001', 'd2220000-0000-0000-0000-000000000002', '2024-25', NOW()),
('22220000-0000-0000-0000-000000000002', 'd1110000-0000-0000-0000-000000000001', '2024-25', NOW()),
('22220000-0000-0000-0000-000000000002', 'd2220000-0000-0000-0000-000000000002', '2024-25', NOW()),
('33330000-0000-0000-0000-000000000003', 'd1110000-0000-0000-0000-000000000001', '2024-25', NOW()),
('33330000-0000-0000-0000-000000000003', 'd2220000-0000-0000-0000-000000000002', '2024-25', NOW()),
('44440000-0000-0000-0000-000000000004', 'd1110000-0000-0000-0000-000000000001', '2024-25', NOW()),
('44440000-0000-0000-0000-000000000004', 'd2220000-0000-0000-0000-000000000002', '2024-25', NOW()),
('55550000-0000-0000-0000-000000000005', 'd5550000-0000-0000-0000-000000000005', '2024-25', NOW());

-- ============================================================
-- 7. SAMPLE COURSE OUTCOMES (for DSA subject)
-- ============================================================

INSERT INTO course_outcomes (subject_id, co_number, description, created_at) VALUES
('d1110000-0000-0000-0000-000000000001', 1, 'Understand fundamental data structures like arrays, linked lists, stacks, and queues', NOW()),
('d1110000-0000-0000-0000-000000000001', 2, 'Analyze and implement various sorting and searching algorithms', NOW()),
('d1110000-0000-0000-0000-000000000001', 3, 'Design and implement tree and graph data structures', NOW()),
('d1110000-0000-0000-0000-000000000001', 4, 'Apply appropriate data structures to solve real-world problems', NOW()),
('d1110000-0000-0000-0000-000000000001', 5, 'Evaluate algorithm efficiency using time and space complexity analysis', NOW());

-- ============================================================
-- 8. SAMPLE PROGRAM OUTCOMES
-- ============================================================

INSERT INTO program_outcomes (program_id, po_number, description, created_at) VALUES
('a0000000-0000-0000-0000-00000000000a', 1, 'Engineering knowledge: Apply knowledge of mathematics, science, engineering fundamentals to solve complex problems', NOW()),
('a0000000-0000-0000-0000-00000000000a', 2, 'Problem analysis: Identify, formulate, and analyze complex engineering problems', NOW()),
('a0000000-0000-0000-0000-00000000000a', 3, 'Design/development of solutions: Design solutions for complex problems considering public health, safety, and cultural aspects', NOW()),
('a0000000-0000-0000-0000-00000000000a', 4, 'Conduct investigations: Use research-based knowledge and methods for complex problems', NOW()),
('a0000000-0000-0000-0000-00000000000a', 5, 'Modern tool usage: Create, select, and apply appropriate techniques and modern engineering tools', NOW());

-- ============================================================
-- SAMPLE DATA INSERTION COMPLETE ✅
-- ============================================================

-- Summary of created users:
-- Admins: admin@sample.edu, principal@sample.edu
-- Faculty: faculty1-3@sample.edu, hod@sample.edu
-- Students: student1-5@sample.edu
-- 
-- NOTE: You need to create these users in Supabase Auth separately
-- with the passwords mentioned in comments above.
