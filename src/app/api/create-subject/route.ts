import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("[API] POST /api/create-subject —", { name: body.name, code: body.code });
        const {
            name, code, department_id, semester, year, credits,
            academic_year, faculty_id,
            lab_max_marks, assignment_max_marks,
            cos,        // [{co_number, description, max_marks, cutoff_mark}]
            po_mapping, // [{co_number, po_number, mapping_value}]
            pso_mapping // [{co_number, pso_number, mapping_value}]
        } = body;

        // 1. Create subject (no program_id)
        const payload: any = {
            name,
            code: code.toUpperCase(),
            semester,
            year: year || Math.ceil((semester || 1) / 2),
            credits: credits || 3,
        };
        // Add optional columns — won't fail if column doesn't exist due to upsert fallback
        const extPayload: any = {
            ...payload,
            academic_year: academic_year || "2025-26",
            lab_max_marks: lab_max_marks || 0,
            assignment_max_marks: assignment_max_marks || 0,
        };

        let subject: any = null;
        let { data: sData, error: sErr } = await supabaseAdmin
            .from("subjects").insert(extPayload).select().single();

        if (sErr && (sErr.message?.includes("lab_max_marks") || sErr.message?.includes("assignment_max_marks"))) {
            // Columns don't exist yet — try without them
            const { data: fb, error: fbErr } = await supabaseAdmin
                .from("subjects").insert(payload).select().single();
            if (fbErr) throw fbErr;
            subject = fb;
        } else if (sErr) {
            throw sErr;
        } else {
            subject = sData;
        }

        const subjectId = subject.id;
        console.log("[API] Subject created:", subjectId);

        // 2. Faculty assignment
        if (faculty_id) {
            const { error: facErr } = await supabaseAdmin
                .from("faculty_subjects")
                .upsert({ faculty_id, subject_id: subjectId, academic_year: academic_year || "2025-26" },
                    { onConflict: "faculty_id,subject_id" });
            if (facErr) console.warn("[API] Faculty assignment:", facErr.message);
        }

        // 3. Create COs with max_marks
        if (cos && cos.length > 0) {
            const coRows = cos.map((co: any) => ({
                subject_id: subjectId,
                co_number: co.co_number,
                description: co.description || `CO${co.co_number}`,
                cutoff_mark: co.cutoff_mark || 0,
                max_marks: co.max_marks || 20,
                target_attainment: 0.60,
            }));
            let { error: coErr } = await supabaseAdmin.from("course_outcomes").insert(coRows);
            if (coErr && coErr.message?.includes("max_marks")) {
                // Fallback without max_marks
                const basicRows = cos.map((co: any) => ({
                    subject_id: subjectId,
                    co_number: co.co_number,
                    description: co.description || `CO${co.co_number}`,
                    cutoff_mark: co.cutoff_mark || 0,
                    target_attainment: 0.60,
                }));
                const { error: coErr2 } = await supabaseAdmin.from("course_outcomes").insert(basicRows);
                if (coErr2) console.warn("CO insert:", coErr2.message);
            } else if (coErr) {
                console.warn("CO insert:", coErr.message);
            }
        }

        // 4. CO-PO mapping
        if (po_mapping && po_mapping.length > 0) {
            const poRows = po_mapping.filter((m: any) => m.mapping_value > 0).map((m: any) => ({
                subject_id: subjectId,
                co_number: m.co_number,
                po_number: m.po_number,
                mapping_value: m.mapping_value,
            }));
            if (poRows.length > 0) {
                const { error } = await supabaseAdmin.from("co_po_mapping").insert(poRows);
                if (error) console.warn("CO-PO mapping:", error.message);
            }
        }

        // 5. CO-PSO mapping
        if (pso_mapping && pso_mapping.length > 0) {
            const psoRows = pso_mapping.filter((m: any) => m.mapping_value > 0).map((m: any) => ({
                subject_id: subjectId,
                co_number: m.co_number,
                pso_number: m.pso_number,
                mapping_value: m.mapping_value,
            }));
            if (psoRows.length > 0) {
                const { error } = await supabaseAdmin.from("co_pso_mapping").insert(psoRows);
                if (error) console.warn("CO-PSO mapping:", error.message);
            }
        }

        // 6. Auto-enroll students by department + year
        let enrolledCount = 0;
        if (department_id) {
            const stuYear = year || Math.ceil((semester || 1) / 2);
            const { data: students } = await supabaseAdmin
                .from("users").select("id")
                .eq("role", "STUDENT").eq("department_id", department_id).eq("year", stuYear);

            if (students && students.length > 0) {
                const enrollRows = students.map((s: any) => ({
                    student_id: s.id,
                    subject_id: subjectId,
                    academic_year: academic_year || "2025-26",
                }));
                const { error: enErr } = await supabaseAdmin
                    .from("student_subjects")
                    .upsert(enrollRows, { onConflict: "student_id,subject_id,academic_year" });
                if (!enErr) enrolledCount = students.length;
            }
        }

        return NextResponse.json({
            success: true,
            subject_id: subjectId,
            enrolled_students: enrolledCount,
            faculty_assigned: !!faculty_id,
            message: `Subject created. ${faculty_id ? "Faculty assigned. " : ""}${enrolledCount} students auto-enrolled.`
        });

    } catch (error: any) {
        console.error("Create subject error:", error);
        return NextResponse.json({ error: error.message || "Failed to create subject" }, { status: 500 });
    }
}
