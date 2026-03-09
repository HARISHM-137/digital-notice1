import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

interface ReportCO {
    co_number: number;
    description: string;
    direct_attainment: number;
    indirect_attainment: number;
    final_attainment: number;
}

interface ReportPO {
    po_number: number;
    description: string;
    final_attainment: number;
}

interface MappingCell {
    co_number: number;
    po_number: number;
    correlation_level: number;
}

// POST /api/reports/generate — Generate report data
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, subject_id, program_id, academic_year } = body;

        if (type === "course" && subject_id) {
            return NextResponse.json(await generateCourseReport(subject_id, academic_year || "2025-26"));
        }

        if (type === "program" && program_id) {
            return NextResponse.json(await generateProgramReport(program_id, academic_year || "2025-26"));
        }

        return NextResponse.json({ error: "type (course/program) and corresponding id required" }, { status: 400 });
    } catch (error: unknown) {
        console.error("Report generation error:", error);
        const msg = error instanceof Error ? error.message : "Report generation failed";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

async function generateCourseReport(subjectId: string, academicYear: string) {
    // Fetch subject
    const { data: subject } = await supabaseAdmin
        .from("subjects")
        .select("*, programs(name, code, departments(name, code))")
        .eq("id", subjectId)
        .single();

    if (!subject) throw new Error("Subject not found");

    // Fetch COs
    const { data: cos } = await supabaseAdmin
        .from("course_outcomes")
        .select("*")
        .eq("subject_id", subjectId)
        .order("co_number");

    // Fetch POs
    const { data: pos } = await supabaseAdmin
        .from("program_outcomes")
        .select("*")
        .eq("program_id", subject.program_id)
        .order("po_number");

    // Fetch CO-PO mappings
    const coIds = (cos || []).map((c: { id: string }) => c.id);
    let mappings: MappingCell[] = [];
    if (coIds.length > 0) {
        const { data } = await supabaseAdmin
            .from("co_po_mapping")
            .select("co_id, po_id, correlation_level")
            .in("co_id", coIds);

        // Convert to co_number/po_number
        if (data) {
            const coMap: Record<string, number> = {};
            (cos || []).forEach((c: { id: string; co_number: number }) => { coMap[c.id] = c.co_number; });
            const poMap: Record<string, number> = {};
            (pos || []).forEach((p: { id: string; po_number: number }) => { poMap[p.id] = p.po_number; });

            mappings = data.map(m => ({
                co_number: coMap[m.co_id] || 0,
                po_number: poMap[m.po_id] || 0,
                correlation_level: m.correlation_level,
            }));
        }
    }

    // Fetch attainment results
    const { data: coResults } = await supabaseAdmin
        .from("attainment_results")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("result_type", "CO")
        .eq("academic_year", academicYear);

    const { data: poResults } = await supabaseAdmin
        .from("attainment_results")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("result_type", "PO")
        .eq("academic_year", academicYear);

    // Build CO report data
    const coReport: ReportCO[] = (cos || []).map((co: { id: string; co_number: number; description: string }) => {
        const result = (coResults || []).find((r: { co_id: string }) => r.co_id === co.id);
        return {
            co_number: co.co_number,
            description: co.description,
            direct_attainment: result?.direct_attainment || 0,
            indirect_attainment: result?.indirect_attainment || 0,
            final_attainment: result?.final_attainment || 0,
        };
    });

    // Build PO report data
    const poReport: ReportPO[] = (pos || []).map((po: { id: string; po_number: number; description: string }) => {
        const result = (poResults || []).find((r: { po_id: string }) => r.po_id === po.id);
        return {
            po_number: po.po_number,
            description: po.description,
            final_attainment: result?.final_attainment || 0,
        };
    });

    // Fetch attainment config
    const { data: config } = await supabaseAdmin
        .from("attainment_config")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("academic_year", academicYear)
        .maybeSingle();

    // Student count
    const { count: studentCount } = await supabaseAdmin
        .from("student_subjects")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", subjectId);

    return {
        type: "course",
        report: {
            subject: {
                name: subject.name,
                code: subject.code,
                semester: subject.semester,
                credits: subject.credits,
                program: subject.programs?.name || "N/A",
                department: subject.programs?.departments?.name || "N/A",
            },
            academic_year: academicYear,
            student_count: studentCount || 0,
            config: {
                direct_weight: config?.direct_weight || 0.8,
                indirect_weight: config?.indirect_weight || 0.2,
                target_percentage: config?.target_percentage || 60,
            },
            course_outcomes: coReport,
            program_outcomes: poReport,
            co_po_mapping: mappings,
            gap_analysis: coReport.map(co => ({
                co_number: co.co_number,
                target: config?.target_percentage || 60,
                attainment: co.final_attainment,
                gap: parseFloat((co.final_attainment - (config?.target_percentage || 60)).toFixed(2)),
                comments: co.final_attainment >= (config?.target_percentage || 60) ? "Target Achieved" : "Target Not Achieved"
            })),
            action_plan: coReport.filter(co => co.final_attainment < (config?.target_percentage || 60)).map(co => ({
                co_number: co.co_number,
                action: "Conduct remedial classes and provide additional assignments to improve understanding of this outcome."
            })),
            assessment_tools: {
                direct: ["Internal Tests (CAT 1, 2, 3)", "Assignments", "Lab Records", "End Semester Exam"],
                indirect: ["Course Exit Survey"]
            },
            performance_distribution: {
                high: 0, // Placeholder
                medium: 0,
                low: 0
            }
        },
    };
}

async function generateProgramReport(programId: string, academicYear: string) {
    // Fetch program
    const { data: program } = await supabaseAdmin
        .from("programs")
        .select("*, departments(name, code)")
        .eq("id", programId)
        .single();

    if (!program) throw new Error("Program not found");

    // Fetch all subjects in program
    const { data: subjects } = await supabaseAdmin
        .from("subjects")
        .select("id, name, code, semester")
        .eq("program_id", programId)
        .order("semester, code");

    // Fetch POs
    const { data: pos } = await supabaseAdmin
        .from("program_outcomes")
        .select("*")
        .eq("program_id", programId)
        .order("po_number");

    // Aggregate PO attainment across all subjects
    const subjectIds = (subjects || []).map((s: { id: string }) => s.id);
    let aggregatedPOs: ReportPO[] = [];

    if (pos && subjectIds.length > 0) {
        const { data: poResults } = await supabaseAdmin
            .from("attainment_results")
            .select("*")
            .in("subject_id", subjectIds)
            .eq("result_type", "PO")
            .eq("academic_year", academicYear);

        aggregatedPOs = (pos || []).map((po: { id: string; po_number: number; description: string }) => {
            const results = (poResults || []).filter((r: { po_id: string }) => r.po_id === po.id);
            const avg = results.length > 0
                ? results.reduce((sum: number, r: { final_attainment: number }) => sum + r.final_attainment, 0) / results.length
                : 0;
            return { po_number: po.po_number, description: po.description, final_attainment: Math.round(avg * 100) / 100 };
        });
    }

    return {
        type: "program",
        report: {
            program: { name: program.name, code: program.code, department: program.departments?.name || "N/A" },
            academic_year: academicYear,
            subjects: subjects || [],
            program_outcomes: aggregatedPOs,
        },
    };
}
