import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/subjects — Centralized: fetch all subjects with program info
export async function GET() {
    try {
        console.log("[API] GET /api/subjects — fetching all subjects");
        const { data, error } = await supabaseAdmin
            .from("subjects")
            .select("*, programs(id, name, code, department_id)")
            .order("code");

        if (error) {
            console.error("[API] Subjects fetch error:", error);
            throw error;
        }

        console.log(`[API] Found ${data?.length || 0} subjects`);
        return NextResponse.json({ subjects: data || [] });
    } catch (error: any) {
        console.error("[API] GET /api/subjects error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to fetch subjects" },
            { status: 500 }
        );
    }
}
