import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, role, department_id, year, register_no } = body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return NextResponse.json(
                { error: "Name, email, password, and role are required." },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            );
        }

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for admin-created users
        });

        if (authError) {
            // Handle duplicate email
            if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
                return NextResponse.json(
                    { error: "A user with this email already exists." },
                    { status: 409 }
                );
            }
            console.error("Auth error:", authError);
            return NextResponse.json(
                { error: authError.message || "Failed to create auth user." },
                { status: 500 }
            );
        }

        // 2. Insert into users table with the same ID
        const { error: dbError } = await supabaseAdmin.from("users").insert({
            id: authData.user.id,
            name,
            email,
            role,
            department_id: department_id || null,
            year: year || null,
            register_no: register_no || null,
        });

        if (dbError) {
            // Rollback: delete the auth user if DB insert fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.error("DB insert error:", dbError);
            return NextResponse.json(
                { error: "Failed to save user profile. " + dbError.message },
                { status: 500 }
            );
        }

        // 3. Auto-enroll students into subjects based on dept + year
        if (role === "STUDENT" && department_id && year) {
            try {
                const yearToSemesters: Record<number, number[]> = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] };
                const semesters = yearToSemesters[year] || [];

                if (semesters.length > 0) {
                    const { data: programs } = await supabaseAdmin
                        .from("programs")
                        .select("id")
                        .eq("department_id", department_id);

                    if (programs && programs.length > 0) {
                        const programIds = programs.map((p: any) => p.id);
                        const { data: subjects } = await supabaseAdmin
                            .from("subjects")
                            .select("id")
                            .in("program_id", programIds)
                            .in("semester", semesters);

                        if (subjects && subjects.length > 0) {
                            const records = subjects.map((s: any) => ({
                                student_id: authData.user.id,
                                subject_id: s.id,
                                academic_year: "2025-26",
                            }));
                            await supabaseAdmin
                                .from("student_subjects")
                                .upsert(records, { onConflict: "student_id,subject_id,academic_year" });
                        }
                    }
                }
            } catch (enrollError) {
                console.warn("Auto-enrollment failed (non-critical):", enrollError);
            }
        }

        return NextResponse.json(
            { message: "User created successfully.", userId: authData.user.id },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("Create user error:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
