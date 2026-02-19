import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleAPIError, validateSchema, AIDocumentOutputSchema } from "@/lib/errorHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================================
// TEXT EXTRACTION
// ============================================================

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        // Dynamically import pdf-parse (works in Next.js)
        const pdfParse = ((await import("pdf-parse")) as any).default || (await import("pdf-parse"));
        const data = await pdfParse(buffer);
        return data.text || "";
    } catch (error: unknown) {
        console.error("PDF parse error:", error);
        throw new Error("Failed to parse PDF. Ensure the file is a valid PDF document.");
    }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
    try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value || "";
    } catch (error: unknown) {
        console.error("DOCX parse error:", error);
        throw new Error("Failed to parse DOCX document.");
    }
}

// ============================================================
// AI ANALYSIS
// ============================================================

async function analyzeWithAI(text: string, retries = 2): Promise<{
    subject?: { name: string; code: string; semester?: number; credits?: number };
    course_outcomes?: { co_number: number; description: string }[];
    program_outcomes?: { po_number: number; description: string }[];
    co_po_mapping?: { co_number: number; po_number: number; correlation_level: number }[];
}> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert academic curriculum analyzer. Analyze the following syllabus document and extract structured information.

CRITICAL: Return ONLY valid JSON with NO markdown code fences, NO backticks, NO explanations. Just raw JSON.

JSON Structure (all fields optional except those marked required):
{
  "subject": {
    "name": "Full subject name (REQUIRED)",
    "code": "Subject code like CS101 (REQUIRED)",
    "semester": 3,
    "credits": 4
  },
  "course_outcomes": [
    { "co_number": 1, "description": "CO1 description" }
  ],
  "program_outcomes": [
    { "po_number": 1, "description": "PO1 description" }
  ],
  "co_po_mapping": [
    { "co_number": 1, "po_number": 1, "correlation_level": 3 }
  ]
}

Rules:
- co_number and po_number are integers (1, 2, 3, not CO1, PO1)
- correlation_level: 1 (Weak), 2 (Medium), 3 (Strong)
- If COs/POs not listed, infer from topics/objectives
- Standard 12 POs (PO1-PO12) if not specified
- Meaningful descriptions for all outcomes

DOCUMENT (first 15,000 chars):
${text.substring(0, 15000)}
`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            let responseText = response.text();

            // Clean markdown artifacts
            responseText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

            // Parse JSON
            let parsed: unknown;
            try {
                parsed = JSON.parse(responseText);
            } catch (parseError) {
                console.error(`JSON parse error (attempt ${attempt + 1}):`, parseError);
                console.error("Response text:", responseText.substring(0, 500));
                if (attempt === retries) {
                    throw new Error("AI returned invalid JSON after multiple attempts");
                }
                continue; // Retry
            }

            // Validate schema
            const validation = validateSchema(parsed, AIDocumentOutputSchema);
            if (!validation.success) {
                console.error(`Schema validation error (attempt ${attempt + 1}):`, validation.details);
                if (attempt === retries) {
                    throw new Error(`Schema validation failed: ${validation.details}`);
                }
                continue; // Retry
            }

            return validation.data;

        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            console.warn(`AI analysis attempt ${attempt + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
    }

    throw new Error("AI analysis failed after all retries");
}

// ============================================================
// DATABASE INSERTION WITH UPSERT
// ============================================================

async function insertData(
    analysis: Awaited<ReturnType<typeof analyzeWithAI>>,
    fileUrl: string,
    uploadedBy: string
) {
    const results: {
        subject_id?: string;
        cos_created?: number;
        pos_created?: number;
        mappings_created?: number;
    } = {};

    // 1. Get or create default program (first available)
    const { data: programs } = await supabaseAdmin
        .from("programs")
        .select("id, name")
        .limit(1)
        .maybeSingle();

    if (!programs) {
        throw new Error("No programs found. Please create at least one program first.");
    }

    const programId = programs.id;

    // 2. UPSERT Subject (if provided)
    if (analysis.subject) {
        const { data: subjectData, error: subjectError } = await supabaseAdmin
            .from("subjects")
            .upsert(
                {
                    name: analysis.subject.name,
                    code: analysis.subject.code,
                    semester: analysis.subject.semester || 1,
                    credits: analysis.subject.credits || 3,
                    program_id: programId,
                    updated_at: new Date().toISOString(),
                    updated_by: uploadedBy,
                },
                { onConflict: "code", ignoreDuplicates: false }
            )
            .select("id")
            .single();

        if (subjectError) {
            throw new Error(`Subject upsert failed: ${subjectError.message}`);
        }

        results.subject_id = subjectData.id;

        // 3. UPSERT Course Outcomes (if provided)
        if (analysis.course_outcomes && analysis.course_outcomes.length > 0) {
            const coInserts = analysis.course_outcomes.map(co => ({
                subject_id: subjectData.id,
                co_number: co.co_number,
                description: co.description,
                updated_at: new Date().toISOString(),
                updated_by: uploadedBy,
            }));

            const { error: coError, count } = await supabaseAdmin
                .from("course_outcomes")
                .upsert(coInserts, { onConflict: "subject_id,co_number", ignoreDuplicates: false });

            if (coError) {
                console.error("CO upsert error:", coError);
                throw new Error(`Course Outcomes upsert failed: ${coError.message}`);
            }

            results.cos_created = count || coInserts.length;
        }

        // 4. UPSERT Program Outcomes (if provided)
        if (analysis.program_outcomes && analysis.program_outcomes.length > 0) {
            const poInserts = analysis.program_outcomes.map(po => ({
                program_id: programId,
                po_number: po.po_number,
                description: po.description,
                updated_at: new Date().toISOString(),
                updated_by: uploadedBy,
            }));

            const { error: poError, count } = await supabaseAdmin
                .from("program_outcomes")
                .upsert(poInserts, { onConflict: "program_id,po_number", ignoreDuplicates: false });

            if (poError) {
                console.error("PO upsert error:", poError);
                throw new Error(`Program Outcomes upsert failed: ${poError.message}`);
            }

            results.pos_created = count || poInserts.length;
        }

        // 5. UPSERT CO-PO Mapping (if provided)
        if (analysis.co_po_mapping && analysis.co_po_mapping.length > 0) {
            // Fetch CO and PO IDs for mapping
            const { data: coData } = await supabaseAdmin
                .from("course_outcomes")
                .select("id, co_number")
                .eq("subject_id", subjectData.id);

            const { data: poData } = await supabaseAdmin
                .from("program_outcomes")
                .select("id, po_number")
                .eq("program_id", programId);

            if (!coData || !poData) {
                throw new Error("Failed to fetch COs/POs for mapping");
            }

            const coMap = new Map(coData.map(c => [c.co_number, c.id]));
            const poMap = new Map(poData.map(p => [p.po_number, p.id]));

            const mappingInserts = analysis.co_po_mapping
                .filter(m => coMap.has(m.co_number) && poMap.has(m.po_number))
                .map(m => ({
                    co_id: coMap.get(m.co_number)!,
                    po_id: poMap.get(m.po_number)!,
                    correlation_level: m.correlation_level,
                    updated_at: new Date().toISOString(),
                    updated_by: uploadedBy,
                }));

            if (mappingInserts.length > 0) {
                const { error: mapError, count } = await supabaseAdmin
                    .from("co_po_mapping")
                    .upsert(mappingInserts, { onConflict: "co_id,po_id", ignoreDuplicates: false });

                if (mapError) {
                    console.error("Mapping upsert error:", mapError);
                    throw new Error(`CO-PO Mapping upsert failed: ${mapError.message}`);
                }

                results.mappings_created = count || mappingInserts.length;
            }
        }

        // 6. Store document metadata
        await supabaseAdmin.from("documents").insert({
            subject_id: subjectData.id,
            file_name: "uploaded-document",
            file_url: fileUrl,
            file_type: "application/pdf",
            uploaded_by: uploadedBy,
        });
    }

    return results;
}

// ============================================================
// MAIN ROUTE HANDLER
// ============================================================

export async function POST(request: NextRequest) {
    try {
        console.log("📄 AI Document Analysis - Start");

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`📄 Processing: ${file.name} (${file.type}, ${file.size} bytes)`);

        // Extract text based on file type
        const buffer = Buffer.from(await file.arrayBuffer());
        let text: string;

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            text = await extractTextFromPDF(buffer);
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.name.endsWith(".docx")
        ) {
            text = await extractTextFromDOCX(buffer);
        } else {
            return NextResponse.json(
                { error: "Unsupported file type. Please upload PDF or DOCX." },
                { status: 400 }
            );
        }

        if (!text || text.trim().length < 50) {
            return NextResponse.json(
                { error: "Extracted text is too short. Ensure the document contains readable content." },
                { status: 400 }
            );
        }

        console.log(`✅ Text extracted: ${text.length} characters`);

        // Analyze with AI (with retries)
        console.log("🤖 Analyzing with AI...");
        const analysis = await analyzeWithAI(text);

        if (!analysis.subject) {
            return NextResponse.json(
                { error: "AI could not extract subject information from the document." },
                { status: 400 }
            );
        }

        console.log("✅ AI analysis complete:", {
            subject: analysis.subject.code,
            cos: analysis.course_outcomes?.length || 0,
            pos: analysis.program_outcomes?.length || 0,
            mappings: analysis.co_po_mapping?.length || 0,
        });

        // Insert into database
        console.log("💾 Inserting into database...");
        const results = await insertData(analysis, `temp://${file.name}`, "system");

        console.log("✅ Database insertion complete:", results);

        return NextResponse.json({
            message: "Document analyzed successfully",
            subject: analysis.subject,
            results: {
                subject_created: true,
                course_outcomes_created: results.cos_created || 0,
                program_outcomes_created: results.pos_created || 0,
                co_po_mappings_created: results.mappings_created || 0,
            },
        });

    } catch (error: unknown) {
        console.error("❌ Document analysis error:", error);
        const apiError = handleAPIError(error, "analyze-document");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
