import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/subjects/[id] — Get subject with COs, POs, mappings
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // Fetch subject
        const { data: subject, error: subjectError } = await supabaseAdmin
            .from("subjects")
            .select("*, programs(id, name, code)")
            .eq("id", id)
            .single();

        if (subjectError || !subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        // Fetch COs
        const { data: cos } = await supabaseAdmin
            .from("course_outcomes")
            .select("*")
            .eq("subject_id", id)
            .order("co_number");

        // Fetch POs via program
        const { data: pos } = await supabaseAdmin
            .from("program_outcomes")
            .select("*")
            .eq("program_id", subject.program_id)
            .order("po_number");

        // Fetch CO-PO mappings
        const coIds = (cos || []).map((c: { id: string }) => c.id);
        let mappings: { id: string; co_id: string; po_id: string; correlation_level: number }[] = [];
        if (coIds.length > 0) {
            const { data } = await supabaseAdmin
                .from("co_po_mapping")
                .select("*")
                .in("co_id", coIds);
            mappings = data || [];
        }

        return NextResponse.json({
            subject,
            course_outcomes: cos || [],
            program_outcomes: pos || [],
            co_po_mapping: mappings,
        });
    } catch (error: unknown) {
        console.error("Subject fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch subject details" },
            { status: 500 }
        );
    }
}

// PUT /api/subjects/[id] — Update subject
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { name, code, semester, credits, program_id } = body;

        if (!name || !code) {
            return NextResponse.json(
                { error: "Name and code are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("subjects")
            .update({
                name,
                code,
                semester: semester || 1,
                credits: credits || 3,
                program_id: program_id || undefined,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.message.includes("duplicate") || error.message.includes("unique")) {
                return NextResponse.json(
                    { error: "A subject with this code already exists" },
                    { status: 409 }
                );
            }
            throw error;
        }

        return NextResponse.json({ subject: data });
    } catch (error: unknown) {
        console.error("Subject update error:", error);
        return NextResponse.json(
            { error: "Failed to update subject" },
            { status: 500 }
        );
    }
}

// DELETE /api/subjects/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { error } = await supabaseAdmin
            .from("subjects")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Subject delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete subject" },
            { status: 500 }
        );
    }
}
