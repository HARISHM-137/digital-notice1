import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { handleAPIError } from "@/lib/errorHandler";

export const dynamic = "force-dynamic";

// POST /api/course-outcomes — Create or update CO
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subject_id, co_number, description } = body;

        if (!subject_id || !co_number || !description) {
            return NextResponse.json(
                { error: "subject_id, co_number, and description are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("course_outcomes")
            .upsert(
                {
                    subject_id,
                    co_number,
                    description,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "subject_id,co_number", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ course_outcome: data }, { status: 201 });
    } catch (error: unknown) {
        console.error("CO create error:", error);
        const apiError = handleAPIError(error, "course-outcomes POST");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// PUT /api/course-outcomes — Update CO by id
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, co_number, description } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (co_number !== undefined) updateData.co_number = co_number;
        if (description !== undefined) updateData.description = description;

        const { data, error } = await supabaseAdmin
            .from("course_outcomes")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ course_outcome: data });
    } catch (error: unknown) {
        console.error("CO update error:", error);
        const apiError = handleAPIError(error, "course-outcomes PUT");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}

// DELETE /api/course-outcomes?id=xxx
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("course_outcomes")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("CO delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete course outcome" },
            { status: 500 }
        );
    }
}
