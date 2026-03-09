import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS completely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bucketName = "documents";

        // Ensure bucket exists (auto-create if missing)
        try {
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            const bucketExists = buckets?.some((b) => b.name === bucketName);
            if (!bucketExists) {
                await supabaseAdmin.storage.createBucket(bucketName, { public: true });
            }
        } catch (e: any) {
            console.log("Bucket check/create note:", e.message);
        }

        // Upload the file using Uint8Array (works in all runtimes)
        const fileName = `notifications/${Date.now()}_${file.name}`;
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(fileName, uint8, {
                contentType: file.type || "application/octet-stream",
                cacheControl: "3600",
                upsert: true,
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return NextResponse.json(
                { error: "Upload failed: " + uploadError.message },
                { status: 500 }
            );
        }

        const { data: urlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            name: file.name,
        });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}
