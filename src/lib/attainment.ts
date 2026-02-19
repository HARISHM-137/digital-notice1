import { supabaseAdmin } from "./supabaseServer";

/**
 * NBA-compliant CO-PO Attainment Calculation Engine
 *
 * CO Attainment = (Direct_Attainment × 0.8) + (Indirect_Attainment × 0.2)
 * PO Attainment = Weighted average of mapped CO attainments based on correlation_level (1,2,3)
 */

interface COAttainmentResult {
    co_id: string;
    co_number: number;
    description: string;
    direct_attainment: number;
    indirect_attainment: number;
    final_attainment: number;
    students_above_target: number;
    total_students: number;
}

interface POAttainmentResult {
    po_id: string;
    po_number: number;
    description: string;
    final_attainment: number;
}

export interface AttainmentOutput {
    co_attainments: COAttainmentResult[];
    po_attainments: POAttainmentResult[];
    direct_weight: number;
    indirect_weight: number;
    target_percentage: number;
}

/**
 * Calculate Direct CO Attainment from actual assessment tables.
 * Direct CO = (Students scoring >= target / Total students) × 100
 *
 * Sources: internal_test_marks, assignment_marks, end_sem_marks
 * Each assessment's questions/assignments link to a specific CO via co_id.
 */
async function calculateDirectCOAttainment(
    subjectId: string,
    targetPercentage: number
): Promise<Record<string, { attainment: number; above: number; total: number }>> {
    const { data: cos } = await supabaseAdmin
        .from("course_outcomes")
        .select("id, co_number")
        .eq("subject_id", subjectId)
        .order("co_number");

    if (!cos || cos.length === 0) return {};

    const result: Record<string, { attainment: number; above: number; total: number }> = {};

    for (const co of cos) {
        const studentScores: Record<string, { obtained: number; max: number }> = {};

        // 1. Internal test marks (questions linked to CO via internal_test_questions)
        const { data: testQuestions } = await supabaseAdmin
            .from("internal_test_questions")
            .select("test_id, max_marks")
            .eq("co_id", co.id);

        if (testQuestions && testQuestions.length > 0) {
            for (const tq of testQuestions) {
                const { data: marks } = await supabaseAdmin
                    .from("internal_test_marks")
                    .select("student_id, marks_obtained")
                    .eq("test_id", tq.test_id);

                if (marks) {
                    for (const m of marks) {
                        if (!studentScores[m.student_id]) {
                            studentScores[m.student_id] = { obtained: 0, max: 0 };
                        }
                        studentScores[m.student_id].obtained += Number(m.marks_obtained);
                        studentScores[m.student_id].max += tq.max_marks;
                    }
                }
            }
        }

        // 2. Assignment marks (assignments linked to CO)
        const { data: assignments } = await supabaseAdmin
            .from("assignments")
            .select("id, max_marks")
            .eq("co_id", co.id)
            .eq("subject_id", subjectId);

        if (assignments && assignments.length > 0) {
            for (const a of assignments) {
                const { data: marks } = await supabaseAdmin
                    .from("assignment_marks")
                    .select("student_id, marks_obtained")
                    .eq("assignment_id", a.id);

                if (marks) {
                    for (const m of marks) {
                        if (!studentScores[m.student_id]) {
                            studentScores[m.student_id] = { obtained: 0, max: 0 };
                        }
                        studentScores[m.student_id].obtained += Number(m.marks_obtained);
                        studentScores[m.student_id].max += a.max_marks;
                    }
                }
            }
        }

        // 3. End sem marks (questions linked to CO via end_sem_questions)
        const { data: endQuestions } = await supabaseAdmin
            .from("end_sem_questions")
            .select("exam_id, max_marks")
            .eq("co_id", co.id);

        if (endQuestions && endQuestions.length > 0) {
            for (const eq of endQuestions) {
                const { data: marks } = await supabaseAdmin
                    .from("end_sem_marks")
                    .select("student_id, marks_obtained")
                    .eq("exam_id", eq.exam_id);

                if (marks) {
                    for (const m of marks) {
                        if (!studentScores[m.student_id]) {
                            studentScores[m.student_id] = { obtained: 0, max: 0 };
                        }
                        studentScores[m.student_id].obtained += Number(m.marks_obtained);
                        studentScores[m.student_id].max += eq.max_marks;
                    }
                }
            }
        }

        // Calculate percentage of students meeting target
        const students = Object.values(studentScores);
        const totalStudents = students.length;
        const meetingTarget = students.filter(
            (s) => s.max > 0 && (s.obtained / s.max) * 100 >= targetPercentage
        ).length;

        result[co.id] = {
            attainment: totalStudents > 0 ? (meetingTarget / totalStudents) * 100 : 0,
            above: meetingTarget,
            total: totalStudents,
        };
    }

    return result;
}

/**
 * Calculate Indirect CO Attainment from survey responses.
 * Indirect CO = (Average rating / 5) × 100
 *
 * Uses survey_questions.co_id and survey_responses.rating
 */
async function calculateIndirectCOAttainment(
    subjectId: string
): Promise<Record<string, number>> {
    const { data: surveys } = await supabaseAdmin
        .from("surveys")
        .select("id")
        .eq("subject_id", subjectId)
        .eq("is_active", true);

    if (!surveys || surveys.length === 0) return {};

    const surveyIds = surveys.map((s) => s.id);

    // Get questions linked to COs
    const { data: questions } = await supabaseAdmin
        .from("survey_questions")
        .select("id, co_id")
        .in("survey_id", surveyIds)
        .not("co_id", "is", null);

    if (!questions || questions.length === 0) return {};

    const coRatings: Record<string, number[]> = {};

    for (const q of questions) {
        if (!q.co_id) continue;

        const { data: responses } = await supabaseAdmin
            .from("survey_responses")
            .select("rating")
            .eq("question_id", q.id)
            .not("rating", "is", null);

        if (responses && responses.length > 0) {
            if (!coRatings[q.co_id]) coRatings[q.co_id] = [];
            for (const r of responses) {
                coRatings[q.co_id].push(r.rating);
            }
        }
    }

    // Average rating per CO, normalized to percentage: (avg/5) * 100
    const result: Record<string, number> = {};
    for (const [coId, ratings] of Object.entries(coRatings)) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        result[coId] = (avg / 5) * 100;
    }

    return result;
}

/**
 * Calculate PO attainment from CO attainments using CO-PO mapping.
 * PO = weighted average of COs, weighted by correlation_level (1, 2, 3).
 */
async function calculatePOAttainment(
    subjectId: string,
    coAttainments: Record<string, number>
): Promise<POAttainmentResult[]> {
    const { data: subject } = await supabaseAdmin
        .from("subjects")
        .select("program_id")
        .eq("id", subjectId)
        .single();

    if (!subject) return [];

    const { data: pos } = await supabaseAdmin
        .from("program_outcomes")
        .select("id, po_number, description")
        .eq("program_id", subject.program_id)
        .order("po_number");

    if (!pos || pos.length === 0) return [];

    const coIds = Object.keys(coAttainments);
    if (coIds.length === 0) {
        return pos.map((po) => ({
            po_id: po.id,
            po_number: po.po_number,
            description: po.description,
            final_attainment: 0,
        }));
    }

    const { data: mappings } = await supabaseAdmin
        .from("co_po_mapping")
        .select("co_id, po_id, correlation_level")
        .in("co_id", coIds);

    if (!mappings) {
        return pos.map((po) => ({
            po_id: po.id,
            po_number: po.po_number,
            description: po.description,
            final_attainment: 0,
        }));
    }

    const results: POAttainmentResult[] = [];

    for (const po of pos) {
        const poMappings = mappings.filter((m) => m.po_id === po.id);

        if (poMappings.length === 0) {
            results.push({ po_id: po.id, po_number: po.po_number, description: po.description, final_attainment: 0 });
            continue;
        }

        let weightedSum = 0;
        let totalWeight = 0;

        for (const mapping of poMappings) {
            const coAttainment = coAttainments[mapping.co_id] || 0;
            const weight = mapping.correlation_level;
            weightedSum += coAttainment * weight;
            totalWeight += weight;
        }

        const poAttainment = totalWeight > 0 ? weightedSum / totalWeight : 0;
        results.push({
            po_id: po.id,
            po_number: po.po_number,
            description: po.description,
            final_attainment: Math.round(poAttainment * 100) / 100,
        });
    }

    return results;
}

/**
 * Main attainment calculation function.
 * Final CO = (0.8 × Direct) + (0.2 × Indirect)
 */
export async function calculateAttainment(
    subjectId: string,
    academicYear: string = "2025-26"
): Promise<AttainmentOutput> {
    // Get or use default config
    const { data: config } = await supabaseAdmin
        .from("attainment_config")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("academic_year", academicYear)
        .maybeSingle();

    const directWeight = config?.direct_weight ?? 0.8;
    const indirectWeight = config?.indirect_weight ?? 0.2;
    const targetPercentage = config?.target_percentage ?? 60;

    // Calculate direct and indirect attainments
    const directAttainments = await calculateDirectCOAttainment(subjectId, targetPercentage);
    const indirectAttainments = await calculateIndirectCOAttainment(subjectId);

    // Get COs with descriptions
    const { data: cos } = await supabaseAdmin
        .from("course_outcomes")
        .select("id, co_number, description")
        .eq("subject_id", subjectId)
        .order("co_number");

    if (!cos) return { co_attainments: [], po_attainments: [], direct_weight: directWeight, indirect_weight: indirectWeight, target_percentage: targetPercentage };

    // Calculate final CO attainments
    const coResults: COAttainmentResult[] = [];
    const coFinalMap: Record<string, number> = {};

    for (const co of cos) {
        const directData = directAttainments[co.id] || { attainment: 0, above: 0, total: 0 };
        const indirect = indirectAttainments[co.id] || 0;
        const final_val = (directData.attainment * directWeight) + (indirect * indirectWeight);

        coResults.push({
            co_id: co.id,
            co_number: co.co_number,
            description: co.description,
            direct_attainment: Math.round(directData.attainment * 100) / 100,
            indirect_attainment: Math.round(indirect * 100) / 100,
            final_attainment: Math.round(final_val * 100) / 100,
            students_above_target: directData.above,
            total_students: directData.total,
        });

        coFinalMap[co.id] = final_val;

        // Store CO result
        await supabaseAdmin
            .from("attainment_results")
            .upsert(
                {
                    subject_id: subjectId,
                    co_id: co.id,
                    po_id: null,
                    result_type: "CO",
                    direct_attainment: Math.round(directData.attainment * 100) / 100,
                    indirect_attainment: Math.round(indirect * 100) / 100,
                    final_attainment: Math.round(final_val * 100) / 100,
                    academic_year: academicYear,
                },
                { onConflict: "subject_id,co_id,result_type,academic_year", ignoreDuplicates: false }
            );
    }

    // Calculate PO attainments
    const poResults = await calculatePOAttainment(subjectId, coFinalMap);

    // Store PO results
    for (const po of poResults) {
        await supabaseAdmin
            .from("attainment_results")
            .upsert(
                {
                    subject_id: subjectId,
                    co_id: null,
                    po_id: po.po_id,
                    result_type: "PO",
                    direct_attainment: 0,
                    indirect_attainment: 0,
                    final_attainment: po.final_attainment,
                    academic_year: academicYear,
                },
                { onConflict: "subject_id,po_id,result_type,academic_year", ignoreDuplicates: false }
            );
    }

    return {
        co_attainments: coResults,
        po_attainments: poResults,
        direct_weight: directWeight,
        indirect_weight: indirectWeight,
        target_percentage: targetPercentage,
    };
}
