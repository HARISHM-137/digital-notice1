import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

export async function GET() {
    const results: string[] = [];

    // ── 1. Add missing columns via raw SQL ──────────────────────────
    const sqlStatements = [
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 1`,
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS total_internal_marks INTEGER DEFAULT 25`,
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS total_external_marks INTEGER DEFAULT 75`,
        `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-26'`,
        `ALTER TABLE course_outcomes ADD COLUMN IF NOT EXISTS cutoff_mark INTEGER DEFAULT 0`,
    ];

    for (const sql of sqlStatements) {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SERVICE_KEY,
                    "Authorization": `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({}),
            });
            // We'll use a different approach - direct pg call
        } catch (e: any) {
            results.push(`SQL warning: ${e.message}`);
        }
    }

    // Use the Supabase SQL endpoint directly (pg-meta)
    try {
        const sqlBlock = `
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='year') THEN
        ALTER TABLE subjects ADD COLUMN year INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='total_internal_marks') THEN
        ALTER TABLE subjects ADD COLUMN total_internal_marks INTEGER DEFAULT 25;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='total_external_marks') THEN
        ALTER TABLE subjects ADD COLUMN total_external_marks INTEGER DEFAULT 75;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='academic_year') THEN
        ALTER TABLE subjects ADD COLUMN academic_year TEXT DEFAULT '2025-26';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_outcomes' AND column_name='cutoff_mark') THEN
        ALTER TABLE course_outcomes ADD COLUMN cutoff_mark INTEGER DEFAULT 0;
    END IF;
END $$;
        `.trim();

        // Execute via pg-meta SQL endpoint
        const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SERVICE_KEY,
                "Authorization": `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ query: sqlBlock }),
        });

        if (pgRes.ok) {
            results.push("✅ Schema columns added successfully");
        } else {
            const errText = await pgRes.text();
            results.push(`⚠️ Schema via pg-meta: ${pgRes.status} - ${errText}`);
        }
    } catch (e: any) {
        results.push(`⚠️ Schema update: ${e.message}`);
    }

    // ── 2. Create storage bucket ────────────────────────────────────
    try {
        const { data, error } = await supabaseAdmin.storage.createBucket("documents", {
            public: true,
        });
        if (error) {
            if (error.message.includes("already exists")) {
                results.push("✅ Storage bucket 'documents' already exists");
            } else {
                results.push(`⚠️ Bucket creation: ${error.message}`);
            }
        } else {
            results.push("✅ Storage bucket 'documents' created successfully");
        }
    } catch (e: any) {
        results.push(`⚠️ Bucket: ${e.message}`);
    }

    // ── 3. Reload PostgREST schema cache ────────────────────────────
    try {
        const reloadRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: "GET",
            headers: {
                "apikey": SERVICE_KEY,
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "Accept": "application/json",
            },
        });

        // Also try sending NOTIFY via pg-meta
        try {
            await fetch(`${SUPABASE_URL}/pg/query`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SERVICE_KEY,
                    "Authorization": `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({ query: "NOTIFY pgrst, 'reload schema'" }),
            });
        } catch { }

        results.push("✅ Schema cache reload requested");
    } catch (e: any) {
        results.push(`⚠️ Schema reload: ${e.message}`);
    }

    // ── 4. Verify columns exist ─────────────────────────────────────
    try {
        const { data, error } = await supabaseAdmin
            .from("subjects")
            .select("academic_year, total_internal_marks, total_external_marks")
            .limit(1);

        if (error) {
            results.push(`❌ Verification FAILED: ${error.message}`);
            results.push("💡 The schema cache has not refreshed yet. Trying alternative approach...");
        } else {
            results.push("✅ Verification PASSED: academic_year column is accessible");
        }
    } catch (e: any) {
        results.push(`❌ Verification error: ${e.message}`);
    }

    return NextResponse.json({
        message: "Setup complete. See results below.",
        results,
        next_steps: [
            "If verification PASSED, reload the page and try creating a subject.",
            "If verification FAILED, go to Supabase Dashboard > Settings > API > Click 'Reload' next to schema cache.",
        ]
    }, { status: 200 });
}
