// seed-users.mjs — Run with: node seed-users.mjs
const BASE = "http://localhost:3000";

const users = [
    { name: "Admin User", email: "admin@copo.edu", password: "Admin@123", role: "ADMIN" },
    { name: "Dr. Rajesh Kumar", email: "rajesh.kumar@copo.edu", password: "Faculty@123", role: "FACULTY" },
    { name: "Dr. Priya Sharma", email: "priya.sharma@copo.edu", password: "Faculty@123", role: "FACULTY" },
    { name: "Amit Patel", email: "amit.patel@copo.edu", password: "Student@123", role: "STUDENT", year: 2, register_no: "STU2024001" },
    { name: "Sneha Reddy", email: "sneha.reddy@copo.edu", password: "Student@123", role: "STUDENT", year: 3, register_no: "STU2024002" },
];

(async () => {
    console.log("Creating sample users...\n");
    for (const u of users) {
        try {
            const res = await fetch(`${BASE}/api/auth/create-user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(u),
            });
            const data = await res.json();
            const icon = res.status === 201 ? "✅" : res.status === 409 ? "⚠️ " : "❌";
            console.log(`${icon} [${u.role}] ${u.name} (${u.email}) → ${res.status}: ${JSON.stringify(data)}`);
        } catch (err) {
            console.log(`❌ [${u.role}] ${u.name}: ${err.message}`);
        }
    }
    console.log("\nDone! Login credentials:");
    console.log("  Admin:   admin@copo.edu / Admin@123");
    console.log("  Faculty: rajesh.kumar@copo.edu / Faculty@123");
    console.log("  Faculty: priya.sharma@copo.edu / Faculty@123");
    console.log("  Student: amit.patel@copo.edu / Student@123");
    console.log("  Student: sneha.reddy@copo.edu / Student@123");
})();
