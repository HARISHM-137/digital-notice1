import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/departments — List all departments
export async function GET() {
    try {
        console.log("[API] GET /api/departments — fetching all departments");
        const { data, error } = await supabaseAdmin
            .from("departments")
            .select("*")
            .order("name");

        if (error) {
            console.error("[API] Departments fetch error:", error);
            throw error;
        }

        console.log(`[API] Found ${data?.length || 0} departments`);
        return NextResponse.json({ departments: data || [] });
    } catch (error: any) {
        console.error("[API] GET /api/departments error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to fetch departments" },
            { status: 500 }
        );
    }
}

// POST /api/departments — Create a new department
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, code } = body;

        console.log("[API] POST /api/departments — creating:", { name, code });

        if (!name || !code) {
            return NextResponse.json(
                { error: "Department name and code are required." },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("departments")
            .insert({ name, code: code.toUpperCase() })
            .select()
            .single();

        if (error) {
            console.error("[API] Department insert error:", error);
            if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
                return NextResponse.json(
                    { error: "A department with this code already exists." },
                    { status: 409 }
                );
            }
            throw error;
        }

        console.log("[API] Department created:", data?.id);
        return NextResponse.json({ department: data }, { status: 201 });
    } catch (error: any) {
        console.error("[API] POST /api/departments error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to create department" },
            { status: 500 }
        );
    }
}

// PUT /api/departments — Update a department
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, code } = body;

        console.log("[API] PUT /api/departments — updating:", { id, name, code });

        if (!id || !name || !code) {
            return NextResponse.json(
                { error: "ID, name, and code are required." },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("departments")
            .update({ name, code: code.toUpperCase(), updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("[API] Department update error:", error);
            throw error;
        }

        console.log("[API] Department updated:", data?.id);
        return NextResponse.json({ department: data });
    } catch (error: any) {
        console.error("[API] PUT /api/departments error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to update department" },
            { status: 500 }
        );
    }
}

// DELETE /api/departments — Delete a department
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        console.log("[API] DELETE /api/departments — deleting:", id);

        if (!id) {
            return NextResponse.json(
                { error: "Department ID is required." },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("departments")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("[API] Department delete error:", error);
            throw error;
        }

        console.log("[API] Department deleted:", id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API] DELETE /api/departments error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to delete department" },
            { status: 500 }
        );
    }
}
