require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: users } = await supabase.from("users").select("id, role, department_id, year, email, name");
    console.log("Total users:", users?.length);
    console.log("Students:", users?.filter(u => u.role === "STUDENT").length);

    const { data: depts } = await supabase.from("departments").select("*");
    console.log("Departments:", depts);

    const { data: subjects } = await supabase.from("subjects").select("*");
    console.log("Subjects:", subjects?.map(s => ({ id: s.id, name: s.name, semester: s.semester, year: s.year })));

    const { data: enrollments } = await supabase.from("student_subjects").select("*");
    console.log("Enrollments:", enrollments?.length);

    const students = users?.filter(u => u.role === "STUDENT") || [];
    if (students.length > 0) {
        console.log("Sample student department:", students[0].department_id, "year:", students[0].year);
    }
}

check().catch(console.error);
