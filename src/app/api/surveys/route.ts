import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/surveys — Get active surveys for a student's subjects
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get("student_id");
        const subjectId = searchParams.get("subject_id");

        if (subjectId) {
            // Get surveys + questions + existing responses for a specific subject
            const { data: surveys, error } = await supabaseAdmin
                .from("surveys")
                .select("*, survey_questions(*, course_outcomes(co_number, description))")
                .eq("subject_id", subjectId)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // If student_id provided, also fetch their existing responses
            if (studentId && surveys && surveys.length > 0) {
                for (const survey of surveys) {
                    const questionIds = survey.survey_questions.map((q: any) => q.id);
                    if (questionIds.length > 0) {
                        const { data: responses } = await supabaseAdmin
                            .from("survey_responses")
                            .select("question_id, rating")
                            .eq("survey_id", survey.id)
                            .eq("respondent_id", studentId)
                            .in("question_id", questionIds);
                        (survey as any).my_responses = responses || [];
                    }
                }
            }

            return NextResponse.json({ surveys: surveys || [] });
        }

        // Get all subjects with active surveys for a student
        if (studentId) {
            const { data: enrollments } = await supabaseAdmin
                .from("student_subjects")
                .select("subject_id, subjects(id, name, code)")
                .eq("student_id", studentId);

            if (!enrollments || enrollments.length === 0) {
                return NextResponse.json({ subjects: [] });
            }

            const subjectIds = enrollments.map((e: any) => e.subject_id);
            const { data: surveys } = await supabaseAdmin
                .from("surveys")
                .select("id, subject_id, title")
                .eq("is_active", true)
                .in("subject_id", subjectIds);

            // Group by subject
            const subjectsWithSurveys = enrollments
                .filter((e: any) => surveys?.some((s) => s.subject_id === e.subject_id))
                .map((e: any) => ({
                    ...e.subjects,
                    survey_count: surveys?.filter((s) => s.subject_id === e.subject_id).length || 0,
                }));

            return NextResponse.json({ subjects: subjectsWithSurveys });
        }

        return NextResponse.json({ error: "student_id or subject_id required" }, { status: 400 });
    } catch (error: unknown) {
        console.error("Survey fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch surveys" }, { status: 500 });
    }
}

// POST /api/surveys — Submit survey responses
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { survey_id, student_id, responses } = body;
        // responses: [{question_id, rating}]

        if (!survey_id || !student_id || !responses || responses.length === 0) {
            return NextResponse.json(
                { error: "survey_id, student_id, and responses are required" },
                { status: 400 }
            );
        }

        // Validate ratings are 1-5
        for (const r of responses) {
            if (!r.question_id || !r.rating || r.rating < 1 || r.rating > 5) {
                return NextResponse.json({ error: "Each response needs question_id and rating (1-5)" }, { status: 400 });
            }
        }

        // Build records
        const records = responses.map((r: any) => ({
            survey_id,
            question_id: r.question_id,
            respondent_id: student_id,
            rating: r.rating,
        }));

        // Upsert to allow re-submission
        const { error } = await supabaseAdmin
            .from("survey_responses")
            .upsert(records, { onConflict: "survey_id,question_id,respondent_id" });

        if (error) throw error;

        return NextResponse.json({ message: "Survey submitted successfully", count: records.length });
    } catch (error: unknown) {
        console.error("Survey submit error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to submit survey" },
            { status: 500 }
        );
    }
}
