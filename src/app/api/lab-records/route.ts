import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// GET /api/lab-records?subject_id=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject_id = searchParams.get("subject_id");

        if (!subject_id) {
            return NextResponse.json({ error: "subject_id is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("lab_records")
            .select("*, course_outcomes(co_number, description)")
            .eq("subject_id", subject_id)
            .order("experiment_number");

        if (error) throw error;

        return NextResponse.json({ lab_records: data || [] });
    } catch (error: unknown) {
        console.error("Lab records GET error:", error);
        const apiError = handleAPIError(error, "lab-records GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// POST /api/lab-records — Create lab experiment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            subject_id,
            experiment_name,
            experiment_number,
            max_marks,
            co_id,
            academic_year,
            created_by,
        } = body;

        if (!subject_id || !experiment_name || !experiment_number || !max_marks || !co_id || !academic_year) {
            return NextResponse.json(
                { error: "subject_id, experiment_name, experiment_number, max_marks, co_id, and academic_year are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("lab_records")
            .upsert(
                {
                    subject_id,
                    experiment_name,
                    experiment_number,
                    max_marks,
                    co_id,
                    academic_year,
                    created_by: created_by || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "subject_id,experiment_number,academic_year", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ lab_record: data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Lab record POST error:", error);
        const apiError = handleAPIError(error, "lab-records POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
