import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Year → Semester mapping
const YEAR_TO_SEMESTERS: Record<number, number[]> = {
    1: [1, 2],
    2: [3, 4],
    3: [5, 6],
    4: [7, 8],
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { student_id, year, department_id, academic_year } = body;
        console.log("[API] POST /api/students/assign-subjects —", { student_id, year, department_id });

        if (!student_id || !year || !department_id) {
            return NextResponse.json(
                { error: "Missing required fields: student_id, year, department_id" },
                { status: 400 }
            );
        }

        const semesters = YEAR_TO_SEMESTERS[year];
        if (!semesters) {
            return NextResponse.json(
                { error: `Invalid year: ${year}. Must be 1-4.` },
                { status: 400 }
            );
        }

        // Get programs for this department
        const { data: programs, error: progErr } = await supabaseAdmin
            .from("programs")
            .select("id")
            .eq("department_id", department_id);

        if (progErr) throw progErr;

        const programIds = (programs || []).map((p) => p.id);
        if (programIds.length === 0) {
            return NextResponse.json({
                message: "No programs found for this department",
                assigned: 0,
            });
        }

        // Get subjects matching year's semesters within department programs
        const { data: subjects, error: subjErr } = await supabaseAdmin
            .from("subjects")
            .select("id, name, code, semester")
            .in("program_id", programIds)
            .in("semester", semesters);

        if (subjErr) throw subjErr;

        if (!subjects || subjects.length === 0) {
            console.log("[API] No subjects found for criteria");
            return NextResponse.json({
                message: "No subjects found for the given criteria",
                assigned: 0,
            });
        }

        // Check existing assignments
        const { data: existing } = await supabaseAdmin
            .from("student_subjects")
            .select("subject_id")
            .eq("student_id", student_id);

        const existingIds = new Set((existing || []).map((e) => e.subject_id));

        // Build new assignments
        const currentYear = academic_year || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
        const newAssignments = subjects
            .filter((s) => !existingIds.has(s.id))
            .map((s) => ({
                student_id,
                subject_id: s.id,
                academic_year: currentYear,
            }));

        if (newAssignments.length === 0) {
            return NextResponse.json({
                message: "All subjects already assigned",
                assigned: 0,
            });
        }

        const { error: insertErr } = await supabaseAdmin
            .from("student_subjects")
            .insert(newAssignments);

        if (insertErr) throw insertErr;

        return NextResponse.json({
            message: `Successfully assigned ${newAssignments.length} subjects`,
            assigned: newAssignments.length,
            subjects: subjects.filter((s) => !existingIds.has(s.id)).map((s) => `${s.code} - ${s.name}`),
        });
    } catch (error: any) {
        console.error("[API] Subject assignment error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to assign subjects" },
            { status: 500 }
        );
    }
}
