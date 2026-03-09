require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: enrolled, error } = await supabase
        .from("student_subjects")
        .select("student_id, subject_id, users(id, name, register_no)")
        .eq("subject_id", "09bceb87-567b-45c7-97a6-aad1b1ae24b8");

    console.log("Enrolled:", enrolled);
    if (error) console.error("Error:", error);
}

check().catch(console.error);
