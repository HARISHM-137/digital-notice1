import { z } from "zod";

// Centralized error handler for API routes
export function handleAPIError(error: unknown, context: string) {
    console.error(`[${context}] Error:`, error);

    if (error instanceof z.ZodError) {
        return {
            error: "Validation error",
            details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", "),
            status: 400
        };
    }

    if (error instanceof Error) {
        // Check for common Supabase/Postgres errors
        const msg = error.message.toLowerCase();

        if (msg.includes('duplicate') || msg.includes('unique constraint')) {
            return {
                error: "Duplicate entry",
                details: "A record with this identifier already exists",
                status: 409
            };
        }

        if (msg.includes('foreign key') || msg.includes('violates')) {
            return {
                error: "Invalid reference",
                details: "Referenced record does not exist",
                status: 400
            };
        }

        if (msg.includes('null value') || msg.includes('not-null')) {
            return {
                error: "Missing required field",
                details: error.message,
                status: 400
            };
        }

        return {
            error: error.message,
            status: 500
        };
    }

    return {
        error: "An unexpected error occurred",
        status: 500
    };
}

// Schema validation wrapper
export function validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; error: string; details: string } {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: "Validation failed",
                details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")
            };
        }
        return {
            success: false,
            error: "Validation failed",
            details: "Unknown validation error"
        };
    }
}

// AI output validation schemas
export const AISubjectSchema = z.object({
    code: z.string().min(1, "Subject code is required"),
    name: z.string().min(1, "Subject name is required"),
    credits: z.number().int().positive().optional(),
    semester: z.number().int().positive().optional()
});

export const AICourseOutcomeSchema = z.object({
    co_number: z.number().int().positive(),
    description: z.string().min(1, "CO description is required")
});

export const AIProgramOutcomeSchema = z.object({
    po_number: z.number().int().positive(),
    description: z.string().min(1, "PO description is required")
});

export const AICOPOMappingSchema = z.object({
    co_number: z.number().int().positive(),
    po_number: z.number().int().positive(),
    correlation_level: z.number().int().min(1).max(3)
});

export const AIDocumentOutputSchema = z.object({
    subject: AISubjectSchema.optional(),
    course_outcomes: z.array(AICourseOutcomeSchema).optional(),
    program_outcomes: z.array(AIProgramOutcomeSchema).optional(),
    co_po_mapping: z.array(AICOPOMappingSchema).optional()
});

export const AIStudentSchema = z.object({
    name: z.string().min(1, "Student name is required"),
    register_no: z.string().min(1, "Register number is required"),
    year: z.number().int().min(1).max(4).optional(),
    department: z.string().optional()
});

export const AIStudentListSchema = z.object({
    students: z.array(AIStudentSchema)
});
