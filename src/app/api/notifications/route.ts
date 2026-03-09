import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/notifications — List all notifications
export async function GET() {
    try {
        console.log("[API] GET /api/notifications — fetching all notifications");
        const { data, error } = await supabaseAdmin
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[API] Notifications fetch error:", error);
            throw error;
        }

        console.log(`[API] Found ${data?.length || 0} notifications`);
        return NextResponse.json({ notifications: data || [] });
    } catch (error: any) {
        console.error("[API] GET /api/notifications error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}

// POST /api/notifications — Create a notification
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("[API] POST /api/notifications — creating:", body.title);

        const { title, message, role_target, department_target, year_target, semester_target, document_url, document_name, created_by } = body;

        if (!title || !message) {
            return NextResponse.json(
                { error: "Title and message are required." },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("notifications")
            .insert({
                title,
                message,
                role_target: role_target || "STUDENT",
                department_target: department_target || null,
                year_target: year_target || null,
                semester_target: semester_target || null,
                document_url: document_url || null,
                document_name: document_name || null,
                created_by: created_by || null,
            })
            .select()
            .single();

        if (error) {
            console.error("[API] Notification insert error:", error);
            throw error;
        }

        console.log("[API] Notification created:", data?.id);
        return NextResponse.json({ notification: data }, { status: 201 });
    } catch (error: any) {
        console.error("[API] POST /api/notifications error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to create notification" },
            { status: 500 }
        );
    }
}

// PUT /api/notifications — Update a notification
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, title, message } = body;

        console.log("[API] PUT /api/notifications — updating:", id);

        if (!id || !title || !message) {
            return NextResponse.json(
                { error: "ID, title, and message are required." },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("notifications")
            .update({ title, message })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("[API] Notification update error:", error);
            throw error;
        }

        console.log("[API] Notification updated:", data?.id);
        return NextResponse.json({ notification: data });
    } catch (error: any) {
        console.error("[API] PUT /api/notifications error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to update notification" },
            { status: 500 }
        );
    }
}

// DELETE /api/notifications — Delete a notification
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        console.log("[API] DELETE /api/notifications — deleting:", id);

        if (!id) {
            return NextResponse.json(
                { error: "Notification ID is required." },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("notifications")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("[API] Notification delete error:", error);
            throw error;
        }

        console.log("[API] Notification deleted:", id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API] DELETE /api/notifications error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to delete notification" },
            { status: 500 }
        );
    }
}
