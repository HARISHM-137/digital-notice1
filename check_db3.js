require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from("student_subjects")
        .select(`
            student_id,
            users ( id, name, register_no )
        `)
        .limit(1);
    console.log("Without '!student_id':", data, error);
}
check().catch(console.error);
