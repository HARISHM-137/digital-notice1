import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Configuration ---
const CONFIG = {
    adminCount: 3,
    facultyCount: 6,
    studentCount: 50,
    academicYear: "2025-26",
    semesters: [2, 4, 6, 8], // EVEN SEMESTERS ONLY
};

const DEPARTMENTS = ["Computer Science and Engineering", "Electronics and Communication Engineering", "Mechanical Engineering"];

async function seed() {
    console.log("🌱 Starting Seed Script (Even Semesters Only)...");

    // 1. Get Departments & Programs
    console.log("   - Fetching metadata...");
    const { data: depts } = await supabase.from("departments").select("*");
    const { data: programs } = await supabase.from("programs").select("*");

    if (!depts?.length || !programs?.length) {
        console.error("❌ No departments or programs found. Run seed-data.mjs first.");
        return;
    }

    // 2. Clear Existing Data (Optional - be careful)
    // await supabase.from("users").delete().neq("role", "ADMIN"); // Dangerous in prod

    // 3. Create Users
    const users = [];

    // --- Admins ---
    for (let i = 1; i <= CONFIG.adminCount; i++) {
        const email = `admin${i}@college.edu`;
        const { data: authUser, error } = await supabase.auth.admin.createUser({
            email,
            password: "password123",
            email_confirm: true,
        });

        if (authUser?.user) {
            users.push({
                id: authUser.user.id,
                email,
                name: `Admin User ${i}`,
                role: "ADMIN",
                department_id: depts[0].id, // Default to first dept
            });
            console.log(`   + Created Admin: ${email}`);
        }
    }

    // --- Faculty ---
    const facultyIds = [];
    for (let i = 1; i <= CONFIG.facultyCount; i++) {
        const dept = depts[i % depts.length];
        const email = `faculty${i}@college.edu`;
        const { data: authUser } = await supabase.auth.admin.createUser({
            email,
            password: "password123",
            email_confirm: true,
        });

        if (authUser?.user) {
            const user = {
                id: authUser.user.id,
                email,
                name: `Faculty ${i} (${dept.code})`,
                role: "FACULTY",
                department_id: dept.id,
            };
            users.push(user);
            facultyIds.push(user);
            console.log(`   + Created Faculty: ${email}`);
        }
    }

    // --- Students ---
    const studentIds = [];
    for (let i = 1; i <= CONFIG.studentCount; i++) {
        const dept = depts[i % depts.length];
        // Year 1-4
        const year = (i % 4) + 1;
        const email = `student${i}@college.edu`;
        const { data: authUser } = await supabase.auth.admin.createUser({
            email,
            password: "password123",
            email_confirm: true,
        });

        if (authUser?.user) {
            const user = {
                id: authUser.user.id,
                email,
                name: `Student ${i} (Yr ${year})`,
                role: "STUDENT",
                department_id: dept.id,
                year: year,
                register_no: `REG${2025000 + i}`,
            };
            users.push(user);
            studentIds.push(user);
            // console.log(`   + Created Student: ${email} (Year ${year})`);
        } else {
            // If user already exists, try to fetch them to use their ID
            const { data: existing } = await supabase.from('users').select('id, year, department_id').eq('email', email).single();
            if (existing) {
                studentIds.push({ id: existing.id, year: existing.year, department_id: existing.department_id });
            }
        }
    }

    // 4. Insert Users into Public Table
    if (users.length > 0) {
        const { error } = await supabase.from("users").upsert(users, { onConflict: "id" });
        if (error) console.error("❌ Error inserting users:", error.message);
        else console.log(`✅ Inserted/Updated ${users.length} users in 'users' table.`);
    }

    // 5. Assign Subjects (Even Semesters)
    console.log("   - Assigning subjects...");

    // Get all subjects
    const { data: allSubjects } = await supabase.from("subjects").select("*");

    if (!allSubjects?.length) {
        console.error("❌ No subjects found!");
        return;
    }

    // Filter for EVEN semesters (2, 4, 6, 8)
    const evenSubjects = allSubjects.filter(s => s.semester % 2 === 0);
    console.log(`   Found ${evenSubjects.length} even-semester subjects.`);

    const facultyAssignments = [];
    const studentEnrollments = [];

    // --- Distribute Subjects to Faculty ---
    // Ensure each faculty gets ~3 subjects
    evenSubjects.forEach((subj, idx) => {
        const faculty = facultyIds[idx % facultyIds.length];
        facultyAssignments.push({
            faculty_id: faculty.id,
            subject_id: subj.id,
            academic_year: CONFIG.academicYear
        });
    });

    // --- Enroll Students ---
    // Enroll students in subjects matching their Year -> Semester
    // Year 1 -> Sem 2
    // Year 2 -> Sem 4
    // Year 3 -> Sem 6
    // Year 4 -> Sem 8

    for (const student of studentIds) {
        const targetSem = student.year * 2; // 1->2, 2->4, etc.
        // Find subjects for this student's department and target semester
        // Get program for student department
        const prog = programs.find(p => p.department_id === student.department_id);
        if (!prog) continue;

        const subjectsForStudent = evenSubjects.filter(s =>
            s.program_id === prog.id && s.semester === targetSem
        );

        // Enroll in all matching subjects (usually 5-6)
        for (const subj of subjectsForStudent) {
            studentEnrollments.push({
                student_id: student.id,
                subject_id: subj.id,
                academic_year: CONFIG.academicYear
            });
        }
    }

    // Batch insert assignments
    if (facultyAssignments.length > 0) {
        await supabase.from("faculty_subjects").upsert(facultyAssignments, { onConflict: "faculty_id,subject_id,academic_year" });
        console.log(`   ✅ Assigned ${facultyAssignments.length} faculty-subject pairs.`);
    }

    // Batch insert enrollments (using student_subjects table)
    if (studentEnrollments.length > 0) {
        const { error } = await supabase.from("student_subjects").upsert(studentEnrollments, { onConflict: "student_id,subject_id,academic_year" });
        if (error) console.error("Error enrolling:", error);
        else console.log(`   ✅ Enrolled students in ${studentEnrollments.length} subject pairs.`);
    }

    // 6. Generate Assessment Marks & CO Attainment
    console.log("   - Generating random marks & attainment...");

    // For a subset of enrolled students and subjects, generate marks
    // We'll Create 1 Internal Test for each subject and add marks

    // Get unique subjects that have students
    const activeSubjects = [...new Set(studentEnrollments.map(e => e.subject_id))];

    for (const subjId of activeSubjects) {
        // Create a test
        const { data: test } = await supabase.from("internal_tests").insert({
            subject_id: subjId,
            test_name: "CAT 1 (Sample)",
            test_number: 1,
            max_marks: 50,
            academic_year: CONFIG.academicYear,
        }).select().single();

        if (test) {
            // Add marks for enrolled students
            const studentsInSubj = studentEnrollments.filter(e => e.subject_id === subjId);
            const marksEntries = studentsInSubj.map(s => ({
                test_id: test.id,
                student_id: s.student_id,
                marks_obtained: Math.floor(Math.random() * 40) + 10 // Random 10-50
            }));

            await supabase.from("internal_test_marks").upsert(marksEntries, { onConflict: "test_id,student_id" });
        }

        // Also create some CO attainment results directly used by dashboard
        // Fetch COs
        const { data: cos } = await supabase.from("course_outcomes").select("id").eq("subject_id", subjId);
        if (cos && cos.length > 0) {
            const results = cos.map(co => ({
                subject_id: subjId,
                co_id: co.id,
                result_type: "CO",
                academic_year: CONFIG.academicYear,
                direct_attainment: 70 + Math.random() * 20,
                indirect_attainment: 80 + Math.random() * 10,
                final_attainment: 75 + Math.random() * 15
            }));
            await supabase.from("attainment_results").upsert(results, { onConflict: "subject_id,co_id,result_type,academic_year" });
        }
    }

    console.log("✅ Seed complete! Login credentials:");
    console.log("   Admin: admin1@college.edu / password123");
    console.log("   Faculty: faculty1@college.edu / password123");
    console.log("   Student: student1@college.edu / password123");
}

seed().catch(console.error);
