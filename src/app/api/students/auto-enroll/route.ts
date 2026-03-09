import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Auto-enroll a student into subjects matching their department + semesters.
 * Year → Semesters: 1→[1,2], 2→[3,4], 3→[5,6], 4→[7,8]
 */
export async function POST(request: NextRequest) {
    try {
        const { student_id } = await request.json();

        if (!student_id) {
            return NextResponse.json({ error: "student_id is required" }, { status: 400 });
        }

        // Get student info
        const { data: student, error: studentErr } = await supabaseAdmin
            .from("users")
            .select("id, department_id, year, role")
            .eq("id", student_id)
            .single();

        if (studentErr || !student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        if (student.role !== "STUDENT") {
            return NextResponse.json({ error: "User is not a student" }, { status: 400 });
        }

        if (!student.department_id || !student.year) {
            return NextResponse.json({ error: "Student must have department and year set" }, { status: 400 });
        }

        // Map year to even semesters only
        const yearToSemesters: Record<number, number[]> = {
            1: [2],
            2: [4],
            3: [6],
            4: [8],
        };

        const semesters = yearToSemesters[student.year];
        if (!semesters) {
            return NextResponse.json({ error: "Invalid year" }, { status: 400 });
        }

        // Get the program for the student's department
        const { data: programs } = await supabaseAdmin
            .from("programs")
            .select("id")
            .eq("department_id", student.department_id);

        if (!programs || programs.length === 0) {
            return NextResponse.json({ error: "No program found for department" }, { status: 404 });
        }

        const programIds = programs.map((p) => p.id);

        // Get subjects matching program + semesters
        const { data: subjects, error: subErr } = await supabaseAdmin
            .from("subjects")
            .select("id")
            .in("program_id", programIds)
            .in("semester", semesters);

        if (subErr) throw subErr;

        if (!subjects || subjects.length === 0) {
            return NextResponse.json({ message: "No subjects found for enrollment", enrolled: 0 });
        }

        // Enroll in ALL matching subjects (no limit)
        const subjectsToEnroll = subjects;

        // Build enrollment records (skip existing)
        const academicYear = "2025-26";
        const records = subjectsToEnroll.map((s) => ({
            student_id: student.id,
            subject_id: s.id,
            academic_year: academicYear,
        }));

        // Use upsert to avoid duplicate errors
        const { data: enrolled, error: enrollErr } = await supabaseAdmin
            .from("student_subjects")
            .upsert(records, { onConflict: "student_id,subject_id,academic_year" })
            .select();

        if (enrollErr) throw enrollErr;

        return NextResponse.json({
            message: `Enrolled student in ${enrolled?.length || 0} subjects`,
            enrolled: enrolled?.length || 0,
            semesters,
        });
    } catch (error: unknown) {
        console.error("Auto-enroll error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Auto-enrollment failed" },
            { status: 500 }
        );
    }
}
