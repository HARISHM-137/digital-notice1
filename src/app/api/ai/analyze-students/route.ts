import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleAPIError, validateSchema, AIStudentListSchema } from "@/lib/errorHandler";

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

// ============================================================
// AI STUDENT EXTRACTION
// ============================================================

async function extractStudentsWithAI(text: string, retries = 2): Promise<{
    students: {
        name: string;
        register_no: string;
        year?: number;
        department?: string;
    }[];
}> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert at extracting structured student data from academic documents.

Analyze the following document and extract all student records.

CRITICAL: Return ONLY valid JSON with NO markdown code fences, NO backticks, NO explanations. Just raw JSON.

JSON Structure:
{
  "students": [
    {
      "name": "Full Name (REQUIRED)",
      "register_no": "Unique registration number (REQUIRED)",
      "year": 1,
      "department": "Department name or code (optional)"
    }
  ]
}

Rules:
- name and register_no are REQUIRED for each student
- year should be 1, 2, 3, or 4 (optional, infer from context)
- department is optional (use if mentioned)
- register_no must be unique per student
- Extract ALL students found in the document
- If register_no format varies, normalize it (e.g., remove spaces, make uppercase)

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
            const validation = validateSchema(parsed, AIStudentListSchema);
            if (!validation.success) {
                console.error(`Schema validation error (attempt ${attempt + 1}):`, validation.details);
                if (attempt === retries) {
                    throw new Error(`Schema validation failed: ${validation.details}`);
                }
                continue; // Retry
            }

            if (!validation.data.students || validation.data.students.length === 0) {
                throw new Error("No students found in the document");
            }

            return validation.data;

        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            console.warn(`AI student extraction attempt ${attempt + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
    }

    throw new Error("Student extraction failed after all retries");
}

// ============================================================
// MAIN ROUTE HANDLER
// ============================================================

export async function POST(request: NextRequest) {
    try {
        console.log("👥 AI Student Analysis - Start");

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`📄 Processing: ${file.name} (${file.type}, ${file.size} bytes)`);

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json(
                { error: "Only PDF files are supported for student upload." },
                { status: 400 }
            );
        }

        // Extract text from PDF
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromPDF(buffer);

        if (!text || text.trim().length < 20) {
            return NextResponse.json(
                { error: "Could not extract readable text from the PDF." },
                { status: 400 }
            );
        }

        console.log(`✅ Text extracted: ${text.length} characters`);

        // Extract students via AI (with retries)
        console.log("🤖 Extracting student data with AI...");
        const aiResult = await extractStudentsWithAI(text);

        console.log(`✅ AI extraction complete: ${aiResult.students.length} students found`);

        // Fetch departments for matching
        const { data: departments } = await supabaseAdmin
            .from("departments")
            .select("id, name, code");

        const deptMap: Record<string, string> = {};
        if (departments) {
            for (const dept of departments) {
                deptMap[dept.name.toLowerCase()] = dept.id;
                deptMap[dept.code.toLowerCase()] = dept.id;
                // Also map without spaces
                deptMap[dept.name.toLowerCase().replace(/\s+/g, "")] = dept.id;
            }
        }

        // Process students with UPSERT logic
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const student of aiResult.students) {
            try {
                // Check if user already exists by register_no or email
                const email = student.name
                    .toLowerCase()
                    .replace(/\s+/g, ".")
                    .replace(/[^a-z0-9.]/g, "") + "@student.edu";

                const { data: existingByRegNo } = await supabaseAdmin
                    .from("users")
                    .select("id, email, role, year")
                    .eq("register_no", student.register_no)
                    .maybeSingle();

                const { data: existingByEmail } = await supabaseAdmin
                    .from("users")
                    .select("id, register_no, role, year")
                    .eq("email", email)
                    .maybeSingle();

                const existing = existingByRegNo || existingByEmail;

                if (existing) {
                    // Update existing user if needed
                    const { error: updateError } = await supabaseAdmin
                        .from("users")
                        .update({
                            name: student.name,
                            register_no: student.register_no,
                            year: student.year || existing.year || null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", existing.id);

                    if (updateError) {
                        errors.push(`${student.name} (${student.register_no}): Update failed - ${updateError.message}`);
                    } else {
                        updated++;
                    }
                    continue;
                }

                // Find department ID
                const deptId = student.department
                    ? deptMap[student.department.toLowerCase()] ||
                    deptMap[student.department.toLowerCase().replace(/\s+/g, "")] ||
                    null
                    : null;

                // Create new auth user
                const password = `Student@${student.register_no}`;
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                });

                if (authError) {
                    if (authError.message?.includes("already") || authError.message?.includes("exists")) {
                        skipped++;
                        continue;
                    }
                    errors.push(`${student.name} (${student.register_no}): Auth creation failed - ${authError.message}`);
                    continue;
                }

                // Insert into public.users with UPSERT by register_no
                const { error: dbError } = await supabaseAdmin.from("users").upsert(
                    {
                        id: authData.user.id,
                        name: student.name,
                        email,
                        role: "STUDENT",
                        department_id: deptId,
                        year: student.year || null,
                        register_no: student.register_no,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "register_no", ignoreDuplicates: false }
                );

                if (dbError) {
                    // Rollback auth user if DB insert fails
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    errors.push(`${student.name} (${student.register_no}): DB insert failed - ${dbError.message}`);
                    continue;
                }

                created++;

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                errors.push(`${student.name} (${student.register_no}): ${msg}`);
            }
        }

        console.log(`✅ Student processing complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

        return NextResponse.json({
            success: true,
            summary: {
                total: aiResult.students.length,
                created,
                updated,
                skipped,
                errorCount: errors.length,
                errors: errors.slice(0, 10), // Limit error details to first 10
            },
            students: aiResult.students.map(s => ({
                name: s.name,
                register_no: s.register_no,
                year: s.year,
                department: s.department,
            })),
        });

    } catch (error: unknown) {
        console.error("❌ Student upload error:", error);
        const apiError = handleAPIError(error, "analyze-students");
        return NextResponse.json(
            { error: apiError.error, details: apiError.details },
            { status: apiError.status }
        );
    }
}
