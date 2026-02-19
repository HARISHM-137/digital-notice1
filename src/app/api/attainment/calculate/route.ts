import { NextRequest, NextResponse } from "next/server";
import { calculateAttainment } from "@/lib/attainment";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subject_id, academic_year } = body;

        if (!subject_id) {
            return NextResponse.json(
                { error: "subject_id is required" },
                { status: 400 }
            );
        }

        const result = await calculateAttainment(
            subject_id,
            academic_year || "2025-26"
        );

        return NextResponse.json({
            success: true,
            ...result,
            message: `Calculated ${result.co_attainments.length} CO and ${result.po_attainments.length} PO attainments.`,
        });
    } catch (error: unknown) {
        console.error("Attainment calculation error:", error);
        const message =
            error instanceof Error ? error.message : "Calculation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
