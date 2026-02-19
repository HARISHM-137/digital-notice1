import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CO-PO Document Upload & Auto-Parsing API
 * 
 * Accepts PDF/DOCX files, extracts CO-PO matrix data using regex patterns.
 * Returns structured JSON with COs, POs, and mappings.
 * On parse failure, returns { parseSuccess: false } to trigger manual UI.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const subjectId = formData.get("subject_id") as string;

        if (!file || !subjectId) {
            return NextResponse.json(
                { error: "Missing file or subject_id" },
                { status: 400 }
            );
        }

        // Read file content
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        let text = "";

        const fileName = file.name.toLowerCase();

        // Parse based on file type
        if (fileName.endsWith(".pdf")) {
            try {
                const pdfParse = ((await import("pdf-parse")) as any).default || (await import("pdf-parse"));
                const pdfData = await pdfParse(buffer);
                text = pdfData.text;
            } catch (err) {
                console.error("PDF parse error:", err);
                return NextResponse.json({ parseSuccess: false, error: "Could not parse PDF" });
            }
        } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
            try {
                const mammoth = await import("mammoth");
                const result = await mammoth.extractRawText({ buffer });
                text = result.value;
            } catch (err) {
                console.error("DOCX parse error:", err);
                return NextResponse.json({ parseSuccess: false, error: "Could not parse DOCX" });
            }
        } else if (fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
            text = buffer.toString("utf-8");
        } else {
            return NextResponse.json({ parseSuccess: false, error: "Unsupported file type" });
        }

        if (!text || text.trim().length < 10) {
            return NextResponse.json({ parseSuccess: false, error: "Could not extract meaningful text" });
        }

        // Extract CO descriptions
        const coPattern = /CO\s*(\d+)\s*[:\-–]\s*(.+?)(?=CO\s*\d+|PO\s*\d+|$)/gi;
        const cos: { number: number; description: string }[] = [];
        let coMatch;
        while ((coMatch = coPattern.exec(text)) !== null) {
            cos.push({
                number: parseInt(coMatch[1]),
                description: coMatch[2].trim().replace(/\n/g, " ").slice(0, 500),
            });
        }

        // Extract PO descriptions
        const poPattern = /PO\s*(\d+)\s*[:\-–]\s*(.+?)(?=PO\s*\d+|CO\s*\d+|$)/gi;
        const pos: { number: number; description: string }[] = [];
        let poMatch;
        while ((poMatch = poPattern.exec(text)) !== null) {
            pos.push({
                number: parseInt(poMatch[1]),
                description: poMatch[2].trim().replace(/\n/g, " ").slice(0, 500),
            });
        }

        // Extract CO-PO mapping matrix
        // Pattern: look for rows like "CO1  3  2  1  -  2  3" or "CO1 | 3 | 2 | 1"
        const mappings: { co: number; po: number; level: number }[] = [];
        const matrixRowPattern = /CO\s*(\d+)\s*[|:,\t]?\s*([\d\-\s|,\t]+)/gi;
        let rowMatch;
        while ((rowMatch = matrixRowPattern.exec(text)) !== null) {
            const coNum = parseInt(rowMatch[1]);
            const values = rowMatch[2].split(/[\s|,\t]+/).filter((v) => v.trim());

            values.forEach((val, idx) => {
                const level = parseInt(val);
                if (!isNaN(level) && level >= 1 && level <= 3) {
                    mappings.push({ co: coNum, po: idx + 1, level });
                }
            });
        }

        // If we found COs, try to store them
        if (cos.length > 0) {
            for (const co of cos) {
                await supabaseAdmin.from("course_outcomes").upsert(
                    { subject_id: subjectId, co_number: co.number, description: co.description },
                    { onConflict: "subject_id,co_number" }
                );
            }
        }

        // Store mappings if we have them
        if (mappings.length > 0) {
            // Get CO IDs
            const { data: dbCos } = await supabaseAdmin
                .from("course_outcomes")
                .select("id, co_number")
                .eq("subject_id", subjectId);

            // Get subject's program to find POs
            const { data: subject } = await supabaseAdmin
                .from("subjects")
                .select("program_id")
                .eq("id", subjectId)
                .single();

            if (subject?.program_id) {
                const { data: dbPos } = await supabaseAdmin
                    .from("program_outcomes")
                    .select("id, po_number")
                    .eq("program_id", subject.program_id);

                if (dbCos && dbPos) {
                    // Delete existing mappings
                    const coIds = dbCos.map((c) => c.id);
                    await supabaseAdmin.from("co_po_mapping").delete().in("co_id", coIds);

                    // Insert new mappings
                    const newMappings = mappings
                        .map((m) => {
                            const co = dbCos.find((c) => c.co_number === m.co);
                            const po = dbPos.find((p) => p.po_number === m.po);
                            if (co && po) {
                                return { co_id: co.id, po_id: po.id, correlation_level: m.level };
                            }
                            return null;
                        })
                        .filter(Boolean);

                    if (newMappings.length > 0) {
                        await supabaseAdmin.from("co_po_mapping").insert(newMappings);
                    }
                }
            }
        }

        return NextResponse.json({
            parseSuccess: cos.length > 0 || mappings.length > 0,
            cos,
            pos,
            mappings,
            rawTextLength: text.length,
            message: `Found ${cos.length} COs, ${pos.length} POs, ${mappings.length} mappings`,
        });
    } catch (error: any) {
        console.error("CO-PO upload error:", error);
        return NextResponse.json(
            { parseSuccess: false, error: error?.message || "Parse failed" },
            { status: 500 }
        );
    }
}
