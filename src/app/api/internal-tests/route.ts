import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// GET /api/internal-tests?subject_id=xxx — Get all tests for a subject
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject_id = searchParams.get("subject_id");

        if (!subject_id) {
            return NextResponse.json({ error: "subject_id is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("internal_tests")
            .select("*")
            .eq("subject_id", subject_id)
            .order("test_number");

        if (error) throw error;

        return NextResponse.json({ tests: data || [] });
    } catch (error: unknown) {
        console.error("Internal tests GET error:", error);
        const apiError = handleAPIError(error, "internal-tests GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// POST /api/internal-tests — Create test
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            subject_id,
            test_name,
            test_number,
            max_marks,
            conducted_date,
            academic_year,
            created_by,
        } = body;

        if (!subject_id || !test_name || !test_number || !max_marks || !academic_year) {
            return NextResponse.json(
                { error: "subject_id, test_name, test_number, max_marks, and academic_year are required" },
                { status: 400 }
            );
        }

        if (![1, 2, 3].includes(test_number)) {
            return NextResponse.json(
                { error: "test_number must be 1, 2, or 3" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("internal_tests")
            .upsert(
                {
                    subject_id,
                    test_name,
                    test_number,
                    max_marks,
                    conducted_date: conducted_date || null,
                    academic_year,
                    created_by: created_by || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "subject_id,test_number,academic_year", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ test: data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Internal test POST error:", error);
        const apiError = handleAPIError(error, "internal-tests POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
