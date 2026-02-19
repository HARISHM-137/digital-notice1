import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// GET /api/assignments?subject_id=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject_id = searchParams.get("subject_id");

        if (!subject_id) {
            return NextResponse.json({ error: "subject_id is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("assignments")
            .select("*, course_outcomes(co_number, description)")
            .eq("subject_id", subject_id)
            .order("assignment_number");

        if (error) throw error;

        return NextResponse.json({ assignments: data || [] });
    } catch (error: unknown) {
        console.error("Assignments GET error:", error);
        const apiError = handleAPIError(error, "assignments GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// POST /api/assignments — Create assignment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            subject_id,
            assignment_name,
            assignment_number,
            max_marks,
            co_id,
            due_date,
            academic_year,
            created_by,
        } = body;

        if (!subject_id || !assignment_name || !assignment_number || !max_marks || !co_id || !academic_year) {
            return NextResponse.json(
                { error: "subject_id, assignment_name, assignment_number, max_marks, co_id, and academic_year are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("assignments")
            .upsert(
                {
                    subject_id,
                    assignment_name,
                    assignment_number,
                    max_marks,
                    co_id,
                    due_date: due_date || null,
                    academic_year,
                    created_by: created_by || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "subject_id,assignment_number,academic_year", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ assignment: data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Assignment POST error:", error);
        const apiError = handleAPIError(error, "assignments POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
