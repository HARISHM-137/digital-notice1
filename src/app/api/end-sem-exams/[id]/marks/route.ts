import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// POST /api/end-sem-exams/[id]/marks — Upload marks
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: exam_id } = params;
        const body = await request.json();
        const { marks } = body; // Array of { student_id, marks_obtained }

        if (!Array.isArray(marks) || marks.length === 0) {
            return NextResponse.json(
                { error: "marks array is required" },
                { status: 400 }
            );
        }

        const marksToUpsert = marks.map((m: { student_id: string; marks_obtained: number }) => ({
            exam_id,
            student_id: m.student_id,
            marks_obtained: m.marks_obtained,
            updated_at: new Date().toISOString(),
        }));

        const { data, error, count } = await supabaseAdmin
            .from("end_sem_marks")
            .upsert(marksToUpsert, { onConflict: "exam_id,student_id", ignoreDuplicates: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            count: count || marks.length,
            marks: data || [],
        });
    } catch (error: unknown) {
        console.error("End sem marks upload error:", error);
        const apiError = handleAPIError(error, "end-sem-exams/[id]/marks POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// GET /api/end-sem-exams/[id]/marks — Get marks for an exam
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: exam_id } = params;

        const { data, error } = await supabaseAdmin
            .from("end_sem_marks")
            .select("*, users(name, register_no)")
            .eq("exam_id", exam_id);

        if (error) throw error;

        return NextResponse.json({ marks: data || [] });
    } catch (error: unknown) {
        console.error("End sem marks GET error:", error);
        const apiError = handleAPIError(error, "end-sem-exams/[id]/marks GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
