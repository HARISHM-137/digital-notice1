import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// GET /api/end-sem-exams?subject_id=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject_id = searchParams.get("subject_id");

        if (!subject_id) {
            return NextResponse.json({ error: "subject_id is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("end_sem_exams")
            .select("*")
            .eq("subject_id", subject_id);

        if (error) throw error;

        return NextResponse.json({ exams: data || [] });
    } catch (error: unknown) {
        console.error("End sem exams GET error:", error);
        const apiError = handleAPIError(error, "end-sem-exams GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// POST /api/end-sem-exams — Create end semester exam
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            subject_id,
            exam_name,
            max_marks,
            exam_date,
            academic_year,
            created_by,
        } = body;

        if (!subject_id || !exam_name || !max_marks || !academic_year) {
            return NextResponse.json(
                { error: "subject_id, exam_name, max_marks, and academic_year are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("end_sem_exams")
            .upsert(
                {
                    subject_id,
                    exam_name,
                    max_marks,
                    exam_date: exam_date || null,
                    academic_year,
                    created_by: created_by || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "subject_id,academic_year", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ exam: data }, { status: 201 });
    } catch (error: unknown) {
        console.error("End sem exam POST error:", error);
        const apiError = handleAPIError(error, "end-sem-exams POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
