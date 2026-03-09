import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all student CO marks for a subject
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const subject_id = searchParams.get("subject_id");
    const academic_year = searchParams.get("academic_year") || "2025-26";

    console.log("[API] GET /api/student-co-marks — subject_id:", subject_id, "academic_year:", academic_year);

    if (!subject_id) {
        return NextResponse.json({ error: "subject_id required" }, { status: 400 });
    }

    try {
        // Get enrolled students
        const { data: enrolled } = await supabaseAdmin
            .from("student_subjects")
            .select("student_id")
            .eq("subject_id", subject_id)
            .eq("academic_year", academic_year);

        // Fetch users manually due to missing PostgreSQL foreign key
        let users: any[] = [];
        const studentIds = (enrolled || []).map((e: any) => e.student_id);
        if (studentIds.length > 0) {
            const { data: uData } = await supabaseAdmin
                .from("users")
                .select("id, name, register_no")
                .in("id", studentIds);
            users = uData || [];
        }

        // Get COs for subject
        const { data: cos } = await supabaseAdmin
            .from("course_outcomes")
            .select("co_number, cutoff_mark, description")
            .eq("subject_id", subject_id)
            .order("co_number");

        // Get all marks for this subject
        const { data: marks } = await supabaseAdmin
            .from("student_co_marks")
            .select("student_id, co_number, marks, lab_marks, assignment_marks")
            .eq("subject_id", subject_id)
            .eq("academic_year", academic_year);

        // Build a lookup map: {student_id: {co_number: marks, lab: 0, assignment: 0}}
        const marksMap: Record<string, any> = {};
        (marks || []).forEach((m: any) => {
            if (!marksMap[m.student_id]) {
                marksMap[m.student_id] = { marks: {}, lab: m.lab_marks || 0, assignment: m.assignment_marks || 0 };
            }
            // Update lab/assignment (they are the same across all CO rows for a single student)
            if (m.lab_marks !== undefined) marksMap[m.student_id].lab = m.lab_marks;
            if (m.assignment_marks !== undefined) marksMap[m.student_id].assignment = m.assignment_marks;
            marksMap[m.student_id].marks[m.co_number] = m.marks;
        });

        // Build student rows
        const students = (enrolled || []).map((e: any) => {
            const user = users.find(u => u.id === e.student_id);
            return {
                id: e.student_id,
                name: user?.name || "Unknown",
                register_no: user?.register_no || "",
                marks: marksMap[e.student_id]?.marks || {},
                lab_marks: marksMap[e.student_id]?.lab || 0,
                assignment_marks: marksMap[e.student_id]?.assignment || 0,
            };
        });

        console.log(`[API] student-co-marks: ${students.length} students, ${(cos || []).length} COs found`);
        return NextResponse.json({ students, cos: cos || [] });
    } catch (error: any) {
        console.error("[API] student-co-marks GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Save or update student CO marks
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { subject_id, academic_year = "2025-26", marks } = body;
        // marks: [{student_id, co_number, marks}]

        console.log("[API] POST /api/student-co-marks — subject_id:", subject_id, "marks count:", marks?.length);

        if (!subject_id || !marks || marks.length === 0) {
            return NextResponse.json({ error: "subject_id and marks required" }, { status: 400 });
        }

        const rows = marks.map((m: any) => ({
            student_id: m.student_id,
            subject_id,
            co_number: m.co_number,
            marks: m.marks || 0,
            lab_marks: m.lab_marks || 0,
            assignment_marks: m.assignment_marks || 0,
            academic_year,
        }));

        const { error } = await supabaseAdmin
            .from("student_co_marks")
            .upsert(rows, { onConflict: "student_id,subject_id,co_number,academic_year" });

        if (error) {
            // If the schema hasn't been updated yet, fall back without lab/assignment to prevent failures
            if (error.message?.includes("lab_marks") || error.message?.includes("assignment_marks")) {
                const basicRows = marks.map((m: any) => ({
                    student_id: m.student_id,
                    subject_id,
                    co_number: m.co_number,
                    marks: m.marks || 0,
                    academic_year,
                }));
                const { error: basicError } = await supabaseAdmin
                    .from("student_co_marks")
                    .upsert(basicRows, { onConflict: "student_id,subject_id,co_number,academic_year" });
                if (basicError) throw basicError;
            } else {
                throw error;
            }
        }

        console.log(`[API] student-co-marks: saved ${rows.length} marks`);
        return NextResponse.json({ success: true, saved: rows.length });
    } catch (error: any) {
        console.error("[API] student-co-marks POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
