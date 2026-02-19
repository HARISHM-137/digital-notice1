import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// POST /api/co-po-mapping — Create or update mapping
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { co_id, po_id, correlation_level } = body;

        if (!co_id || !po_id || !correlation_level) {
            return NextResponse.json(
                { error: "co_id, po_id, and correlation_level are required" },
                { status: 400 }
            );
        }

        if (![1, 2, 3].includes(correlation_level)) {
            return NextResponse.json(
                { error: "correlation_level must be 1, 2, or 3" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("co_po_mapping")
            .upsert(
                {
                    co_id,
                    po_id,
                    correlation_level,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "co_id,po_id" }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ mapping: data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Mapping create error:", error);
        return NextResponse.json(
            { error: "Failed to create/update CO-PO mapping" },
            { status: 500 }
        );
    }
}

// DELETE /api/co-po-mapping?id=xxx
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("co_po_mapping")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Mapping delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete CO-PO mapping" },
            { status: 500 }
        );
    }
}
