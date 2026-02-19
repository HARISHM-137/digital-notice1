import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with Service Role Key for admin operations
// ONLY use this in API routes (server-side), NEVER in client components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
