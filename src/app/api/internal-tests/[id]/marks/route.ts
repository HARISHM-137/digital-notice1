import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// POST /api/internal-tests/[id]/marks — Upload marks
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: test_id } = params;
        const body = await request.json();
        const { marks } = body; // Array of { student_id, marks_obtained }

        if (!Array.isArray(marks) || marks.length === 0) {
            return NextResponse.json(
                { error: "marks array is required" },
                { status: 400 }
            );
        }

        const marksToUpsert = marks.map((m: { student_id: string; marks_obtained: number }) => ({
            test_id,
            student_id: m.student_id,
            marks_obtained: m.marks_obtained,
            updated_at: new Date().toISOString(),
        }));

        const { data, error, count } = await supabaseAdmin
            .from("internal_test_marks")
            .upsert(marksToUpsert, { onConflict: "test_id,student_id", ignoreDuplicates: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            count: count || marks.length,
            marks: data || [],
        });
    } catch (error: unknown) {
        console.error("Internal test marks upload error:", error);
        const apiError = handleAPIError(error, "internal-tests/[id]/marks POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// GET /api/internal-tests/[id]/marks — Get marks for a test
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: test_id } = params;

        const { data, error } = await supabaseAdmin
            .from("internal_test_marks")
            .select("*, users(name, register_no)")
            .eq("test_id", test_id);

        if (error) throw error;

        return NextResponse.json({ marks: data || [] });
    } catch (error: unknown) {
        console.error("Internal test marks GET error:", error);
        const apiError = handleAPIError(error, "internal-tests/[id]/marks GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
