import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// GET /api/internal-tests/[id] — Get test details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const { data, error } = await supabaseAdmin
            .from("internal_tests")
            .select("*, internal_test_questions(*)")
            .eq("id", id)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: "Test not found" }, { status: 404 });
        }

        return NextResponse.json({ test: data });
    } catch (error: unknown) {
        console.error("Internal test GET error:", error);
        const apiError = handleAPIError(error, "internal-tests/[id] GET");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// PATCH /api/internal-tests/[id] — Update test
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.test_name !== undefined) updateData.test_name = body.test_name;
        if (body.max_marks !== undefined) updateData.max_marks = body.max_marks;
        if (body.conducted_date !== undefined) updateData.conducted_date = body.conducted_date;
        if (body.updated_by !== undefined) updateData.updated_by = body.updated_by;

        const { data, error } = await supabaseAdmin
            .from("internal_tests")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ test: data });
    } catch (error: unknown) {
        console.error("Internal test PATCH error:", error);
        const apiError = handleAPIError(error, "internal-tests/[id] PATCH");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// DELETE /api/internal-tests/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const { error } = await supabaseAdmin
            .from("internal_tests")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Internal test DELETE error:", error);
        const apiError = handleAPIError(error, "internal-tests/[id] DELETE");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
