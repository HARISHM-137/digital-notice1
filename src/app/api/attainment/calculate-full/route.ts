import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getCoLevel(percentage: number): number {
    if (percentage >= 80) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= 60) return 1;
    return 0;
}

export async function POST(req: NextRequest) {
    try {
        const { subject_id, academic_year = "2025-26" } = await req.json();
        if (!subject_id) return NextResponse.json({ error: "subject_id required" }, { status: 400 });

        // 1. Fetch COs with cutoff marks
        const { data: cos, error: coErr } = await supabaseAdmin
            .from("course_outcomes")
            .select("co_number, cutoff_mark, description")
            .eq("subject_id", subject_id)
            .order("co_number");
        if (coErr) throw coErr;
        if (!cos || cos.length === 0) {
            return NextResponse.json({ error: "No COs defined for this subject. Add COs with cutoff marks first." }, { status: 400 });
        }

        // 2. Fetch enrolled students
        const { data: enrolled } = await supabaseAdmin
            .from("student_subjects")
            .select("student_id")
            .eq("subject_id", subject_id)
            .eq("academic_year", academic_year);
        if (!enrolled || enrolled.length === 0) {
            return NextResponse.json({ error: "No students enrolled in this subject." }, { status: 400 });
        }
        const totalStudents = enrolled.length;
        const studentIds = enrolled.map((e: any) => e.student_id);

        // 3. Fetch all marks for enrolled students
        const { data: allMarks } = await supabaseAdmin
            .from("student_co_marks")
            .select("student_id, co_number, marks")
            .eq("subject_id", subject_id)
            .eq("academic_year", academic_year)
            .in("student_id", studentIds);

        // Validate marks exist
        const marksSet = new Set((allMarks || []).map((m: any) => `${m.student_id}_${m.co_number}`));
        const missingCOs = cos.filter((co: any) =>
            studentIds.some((sid: string) => !marksSet.has(`${sid}_${co.co_number}`))
        );
        if (missingCOs.length > 0) {
            return NextResponse.json({
                error: `Marks not entered for all students. Missing marks for CO${missingCOs.map((c: any) => c.co_number).join(", CO")}. Complete all marks before calculating.`
            }, { status: 400 });
        }

        // 4. Calculate CO attainment
        const coResults: { co_number: number; description: string; cutoff_mark: number; total_students: number; students_passed: number; percentage: number; attainment_value: number }[] = [];

        for (const co of cos) {
            const coMarks = (allMarks || []).filter((m: any) =>
                m.co_number === co.co_number && studentIds.includes(m.student_id)
            );
            const passed = coMarks.filter((m: any) => m.marks >= (co.cutoff_mark || 0)).length;
            const pct = totalStudents > 0 ? (passed / totalStudents) * 100 : 0;
            const level = getCoLevel(pct);

            coResults.push({
                co_number: co.co_number,
                description: co.description,
                cutoff_mark: co.cutoff_mark || 0,
                total_students: totalStudents,
                students_passed: passed,
                percentage: Math.round(pct * 100) / 100,
                attainment_value: level,
            });
        }

        // Save CO attainment results (upsert)
        const coUpsertRows = coResults.map((r) => ({
            subject_id,
            co_number: r.co_number,
            total_students: r.total_students,
            students_passed: r.students_passed,
            percentage: r.percentage,
            attainment_value: r.attainment_value,
            academic_year,
        }));
        await supabaseAdmin
            .from("co_attainment_results")
            .upsert(coUpsertRows, { onConflict: "subject_id,co_number,academic_year" });

        // 5. Fetch CO-PO mapping
        const { data: poMappings } = await supabaseAdmin
            .from("co_po_mapping")
            .select("co_number, po_number, mapping_value")
            .eq("subject_id", subject_id)
            .gt("mapping_value", 0);

        // 6. Calculate PO attainment
        // For each PO, avg of (co_level * mapping_val / 3) for all COs that map to it
        const coLevelMap: Record<number, number> = {};
        coResults.forEach((r) => { coLevelMap[r.co_number] = r.attainment_value; });

        const poContributions: Record<number, number[]> = {};
        (poMappings || []).forEach((m: any) => {
            const coLevel = coLevelMap[m.co_number] || 0;
            if (!poContributions[m.po_number]) poContributions[m.po_number] = [];
            poContributions[m.po_number].push((coLevel * m.mapping_value) / 3);
        });

        const poResults: { po_number: number; attainment_value: number }[] = [];
        // Generate PO1-PO12
        for (let po = 1; po <= 12; po++) {
            const contributions = poContributions[po] || [];
            const avg = contributions.length > 0
                ? contributions.reduce((s, v) => s + v, 0) / contributions.length
                : 0;
            poResults.push({ po_number: po, attainment_value: Math.round(avg * 100) / 100 });
        }

        // Save PO results
        if (poResults.some((p) => p.attainment_value > 0)) {
            const poUpsertRows = poResults.map((r) => ({
                subject_id,
                po_number: r.po_number,
                attainment_value: r.attainment_value,
                academic_year,
            }));
            await supabaseAdmin
                .from("po_attainment_results")
                .upsert(poUpsertRows, { onConflict: "subject_id,po_number,academic_year" });
        }

        // 7. Fetch CO-PSO mapping
        const { data: psoMappings } = await supabaseAdmin
            .from("co_pso_mapping")
            .select("co_number, pso_number, mapping_value")
            .eq("subject_id", subject_id)
            .gt("mapping_value", 0);

        // 8. Calculate PSO attainment
        const psoContributions: Record<number, number[]> = {};
        (psoMappings || []).forEach((m: any) => {
            const coLevel = coLevelMap[m.co_number] || 0;
            if (!psoContributions[m.pso_number]) psoContributions[m.pso_number] = [];
            psoContributions[m.pso_number].push((coLevel * m.mapping_value) / 3);
        });

        const psoResults: { pso_number: number; attainment_value: number }[] = [];
        for (let pso = 1; pso <= 3; pso++) {
            const contributions = psoContributions[pso] || [];
            const avg = contributions.length > 0
                ? contributions.reduce((s, v) => s + v, 0) / contributions.length
                : 0;
            psoResults.push({ pso_number: pso, attainment_value: Math.round(avg * 100) / 100 });
        }

        // Save PSO results
        if (psoResults.some((p) => p.attainment_value > 0)) {
            const psoUpsertRows = psoResults.map((r) => ({
                subject_id,
                pso_number: r.pso_number,
                attainment_value: r.attainment_value,
                academic_year,
            }));
            await supabaseAdmin
                .from("pso_attainment_results")
                .upsert(psoUpsertRows, { onConflict: "subject_id,pso_number,academic_year" });
        }

        return NextResponse.json({
            success: true,
            co_results: coResults,
            po_results: poResults,
            pso_results: psoResults,
        });

    } catch (error: any) {
        console.error("Attainment calculation error:", error);
        return NextResponse.json({ error: error.message || "Calculation failed" }, { status: 500 });
    }
}

// GET: Fetch previous attainment results
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const subject_id = searchParams.get("subject_id");
    const academic_year = searchParams.get("academic_year") || "2025-26";

    if (!subject_id) return NextResponse.json({ error: "subject_id required" }, { status: 400 });

    const [{ data: coResults }, { data: poResults }, { data: psoResults }] = await Promise.all([
        supabaseAdmin.from("co_attainment_results").select("*").eq("subject_id", subject_id).eq("academic_year", academic_year).order("co_number"),
        supabaseAdmin.from("po_attainment_results").select("*").eq("subject_id", subject_id).eq("academic_year", academic_year).order("po_number"),
        supabaseAdmin.from("pso_attainment_results").select("*").eq("subject_id", subject_id).eq("academic_year", academic_year).order("pso_number"),
    ]);

    return NextResponse.json({ co_results: coResults || [], po_results: poResults || [], pso_results: psoResults || [] });
}
