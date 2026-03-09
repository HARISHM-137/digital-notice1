import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    // 🔓 AUTHENTICATION DISABLED FOR TESTING
    // All routes are accessible without login
    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/faculty/:path*", "/student/:path*"],
};
