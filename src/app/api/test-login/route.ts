import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Quick diagnostic endpoint to test login
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        console.log("🔐 Testing login for:", email);

        // Try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("❌ Auth error:", error);
            return NextResponse.json({
                success: false,
                error: error.message,
                details: error
            });
        }

        if (!data.user) {
            return NextResponse.json({
                success: false,
                error: "No user returned"
            });
        }

        // Check if user exists in users table
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

        if (userError) {
            console.error("❌ User lookup error:", userError);
            return NextResponse.json({
                success: false,
                error: "Database error",
                details: userError
            });
        }

        if (!userData) {
            console.error("❌ User not in users table");
            return NextResponse.json({
                success: false,
                error: "User profile not found in database. Auth user exists but no profile.",
                authUserId: data.user.id,
                authEmail: data.user.email
            });
        }

        console.log("✅ Login successful:", userData);

        return NextResponse.json({
            success: true,
            user: userData,
            session: { user: data.user }
        });

    } catch (error: unknown) {
        console.error("Test login error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
