// seed-data.mjs — Seeds Anna University B.E. CSE R2017 curriculum data
// Run with: node seed-data.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xdvnlkjmadngwgmxtkqf.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkdm5sa2ptYWRuZ3dnbXh0a3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYzNTkyMywiZXhwIjoyMDg2MjExOTIzfQ.b5XtKtcHjTz3aTxytYn4VqrTO1YCdGOnp3EK3vdIwqU";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// DATA DEFINITIONS
// ============================================================

const DEPARTMENT = { name: "Computer Science and Engineering", code: "CSE" };

const PROGRAM = { name: "B.E. Computer Science and Engineering (R2017)", code: "BE-CSE-R2017" };

// 12 POs + 3 PSOs (as PO13-PO15)
const PROGRAM_OUTCOMES = [
    { po_number: 1, description: "Engineering knowledge: Apply the knowledge of mathematics, science, engineering fundamentals and an engineering specialization to the solution of complex engineering problems." },
    { po_number: 2, description: "Problem analysis: Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences." },
    { po_number: 3, description: "Design/development of solutions: Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, and the cultural, societal, and environmental considerations." },
    { po_number: 4, description: "Conduct investigations of complex problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions." },
    { po_number: 5, description: "Modern tool usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of the limitations." },
    { po_number: 6, description: "The engineer and society: Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional engineering practice." },
    { po_number: 7, description: "Environment and sustainability: Understand the impact of the professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development." },
    { po_number: 8, description: "Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice." },
    { po_number: 9, description: "Individual and team work: Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings." },
    { po_number: 10, description: "Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large, such as, being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions." },
    { po_number: 11, description: "Project management and finance: Demonstrate knowledge and understanding of the engineering and management principles and apply these to one's own work, as a member and leader in a team, to manage projects and in multidisciplinary environments." },
    { po_number: 12, description: "Life-long learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change." },
    // PSOs stored as PO13-15
    { po_number: 13, description: "PSO1: Analyze, design and develop computing solutions by applying foundational concepts of Computer Science and Engineering." },
    { po_number: 14, description: "PSO2: Apply software engineering principles and practices for developing quality software for scientific and business applications." },
    { po_number: 15, description: "PSO3: Adapt to emerging Information and Communication Technologies (ICT) to innovate ideas and solutions to existing/novel problems." },
];

// Subjects: [code, name, semester, year, credits, category]
const SUBJECTS = [
    // SEMESTER I
    ["HS8151", "Communicative English", 1, 1, 4, "HS"],
    ["MA8151", "Engineering Mathematics - I", 1, 1, 4, "BS"],
    ["PH8151", "Engineering Physics", 1, 1, 3, "BS"],
    ["CY8151", "Engineering Chemistry", 1, 1, 3, "BS"],
    ["GE8151", "Problem Solving and Python Programming", 1, 1, 3, "ES"],
    ["GE8152", "Engineering Graphics", 1, 1, 4, "ES"],
    ["GE8161", "Problem Solving and Python Programming Laboratory", 1, 1, 2, "ES"],
    ["BS8161", "Physics and Chemistry Laboratory", 1, 1, 2, "BS"],

    // SEMESTER II
    ["HS8251", "Technical English", 2, 1, 4, "HS"],
    ["MA8251", "Engineering Mathematics - II", 2, 1, 4, "BS"],
    ["PH8252", "Physics for Information Science", 2, 1, 3, "BS"],
    ["BE8255", "Basic Electrical, Electronics and Measurement Engineering", 2, 1, 3, "ES"],
    ["GE8291", "Environmental Science and Engineering", 2, 1, 3, "HS"],
    ["CS8251", "Programming in C", 2, 1, 3, "PC"],
    ["GE8261", "Engineering Practices Laboratory", 2, 1, 2, "ES"],
    ["CS8261", "C Programming Laboratory", 2, 1, 2, "PC"],

    // SEMESTER III
    ["MA8351", "Discrete Mathematics", 3, 2, 4, "BS"],
    ["CS8351", "Digital Principles and System Design", 3, 2, 4, "ES"],
    ["CS8391", "Data Structures", 3, 2, 3, "PC"],
    ["CS8392", "Object Oriented Programming", 3, 2, 3, "PC"],
    ["EC8395", "Communication Engineering", 3, 2, 3, "ES"],
    ["CS8381", "Data Structures Laboratory", 3, 2, 2, "PC"],
    ["CS8383", "Object Oriented Programming Laboratory", 3, 2, 2, "PC"],
    ["CS8382", "Digital Systems Laboratory", 3, 2, 2, "ES"],
    ["HS8381", "Interpersonal Skills/Listening & Speaking", 3, 2, 1, "EEC"],

    // SEMESTER IV
    ["MA8402", "Probability and Queueing Theory", 4, 2, 4, "BS"],
    ["CS8491", "Computer Architecture", 4, 2, 3, "PC"],
    ["CS8492", "Database Management Systems", 4, 2, 3, "PC"],
    ["CS8451", "Design and Analysis of Algorithms", 4, 2, 3, "PC"],
    ["CS8493", "Operating Systems", 4, 2, 3, "PC"],
    ["CS8494", "Software Engineering", 4, 2, 3, "PC"],
    ["CS8481", "Database Management Systems Laboratory", 4, 2, 2, "PC"],
    ["CS8461", "Operating Systems Laboratory", 4, 2, 2, "PC"],
    ["HS8461", "Advanced Reading and Writing", 4, 2, 1, "EEC"],

    // SEMESTER V
    ["MA8551", "Algebra and Number Theory", 5, 3, 4, "BS"],
    ["CS8591", "Computer Networks", 5, 3, 3, "PC"],
    ["EC8691", "Microprocessors and Microcontrollers", 5, 3, 3, "PC"],
    ["CS8501", "Theory of Computation", 5, 3, 3, "PC"],
    ["CS8592", "Object Oriented Analysis and Design", 5, 3, 3, "PC"],
    ["EC8681", "Microprocessors and Microcontrollers Laboratory", 5, 3, 2, "PC"],
    ["CS8582", "Object Oriented Analysis and Design Laboratory", 5, 3, 2, "PC"],
    ["CS8581", "Networks Laboratory", 5, 3, 2, "PC"],

    // SEMESTER VI
    ["CS8651", "Internet Programming", 6, 3, 3, "PC"],
    ["CS8691", "Artificial Intelligence", 6, 3, 3, "PC"],
    ["CS8601", "Mobile Computing", 6, 3, 3, "PC"],
    ["CS8602", "Compiler Design", 6, 3, 4, "PC"],
    ["CS8603", "Distributed Systems", 6, 3, 3, "PC"],
    ["CS8661", "Internet Programming Laboratory", 6, 3, 2, "PC"],
    ["CS8662", "Mobile Application Development Laboratory", 6, 3, 2, "PC"],
    ["CS8611", "Mini Project", 6, 3, 1, "EEC"],
    ["HS8581", "Professional Communication", 6, 3, 1, "EEC"],

    // Professional Electives - Semester VI
    ["CS8075", "Data Warehousing and Data Mining", 6, 3, 3, "PE"],
    ["IT8076", "Software Testing", 6, 3, 3, "PE"],
    ["IT8072", "Embedded Systems", 6, 3, 3, "PE"],
    ["CS8072", "Agile Methodologies", 6, 3, 3, "PE"],
    ["CS8077", "Graph Theory and Applications", 6, 3, 3, "PE"],
    ["IT8071", "Digital Signal Processing", 6, 3, 3, "PE"],
    ["GE8075", "Intellectual Property Rights", 6, 3, 3, "PE"],

    // SEMESTER VII
    ["MG8591", "Principles of Management", 7, 4, 3, "HS"],
    ["CS8792", "Cryptography and Network Security", 7, 4, 3, "PC"],
    ["CS8791", "Cloud Computing", 7, 4, 3, "PC"],
    ["CS8711", "Cloud Computing Laboratory", 7, 4, 2, "PC"],
    ["IT8761", "Security Laboratory", 7, 4, 2, "PC"],

    // Professional Electives - Semester VII (Elective II)
    ["CS8091", "Big Data Analytics", 7, 4, 3, "PE"],
    ["CS8082", "Machine Learning Techniques", 7, 4, 3, "PE"],
    ["CS8092", "Computer Graphics and Multimedia", 7, 4, 3, "PE"],
    ["IT8075", "Software Project Management", 7, 4, 3, "PE"],
    ["CS8081", "Internet of Things", 7, 4, 3, "PE"],
    ["IT8074", "Service Oriented Architecture", 7, 4, 3, "PE"],
    ["GE8077", "Total Quality Management", 7, 4, 3, "PE"],

    // Professional Electives - Semester VII (Elective III)
    ["CS8083", "Multi-core Architectures and Programming", 7, 4, 3, "PE"],
    ["CS8079", "Human Computer Interaction", 7, 4, 3, "PE"],
    ["CS8073", "C# and .Net Programming", 7, 4, 3, "PE"],
    ["CS8088", "Wireless Adhoc and Sensor Networks", 7, 4, 3, "PE"],
    ["CS8071", "Advanced Topics on Databases", 7, 4, 3, "PE"],
    ["GE8072", "Foundation Skills in Integrated Product Development", 7, 4, 3, "PE"],
    ["GE8074", "Human Rights", 7, 4, 3, "PE"],
    ["GE8071", "Disaster Management", 7, 4, 3, "PE"],

    // SEMESTER VIII
    ["CS8811", "Project Work", 8, 4, 10, "EEC"],

    // Professional Electives - Semester VIII (Elective IV)
    ["EC8093", "Digital Image Processing", 8, 4, 3, "PE"],
    ["CS8085", "Social Network Analysis", 8, 4, 3, "PE"],
    ["IT8073", "Information Security", 8, 4, 3, "PE"],
    ["CS8087", "Software Defined Networks", 8, 4, 3, "PE"],
    ["CS8074", "Cyber Forensics", 8, 4, 3, "PE"],
    ["CS8086", "Soft Computing", 8, 4, 3, "PE"],
    ["GE8076", "Professional Ethics in Engineering", 8, 4, 3, "PE"],

    // Professional Electives - Semester VIII (Elective V)
    ["CS8080", "Information Retrieval Techniques", 8, 4, 3, "PE"],
    ["CS8078", "Green Computing", 8, 4, 3, "PE"],
    ["CS8076", "GPU Architecture and Programming", 8, 4, 3, "PE"],
    ["CS8084", "Natural Language Processing", 8, 4, 3, "PE"],
    ["CS8001", "Parallel Algorithms", 8, 4, 3, "PE"],
    ["IT8077", "Speech Processing", 8, 4, 3, "PE"],
    ["GE8073", "Fundamentals of Nanoscience", 8, 4, 3, "PE"],
];

// CO-PO Mapping: subject_code -> array of PO numbers that have a tick (√)
const CO_PO_MAP = {
    // SEMESTER I
    "HS8151": [9, 10, 11, 12],
    "MA8151": [1, 2, 3, 5],
    "PH8151": [1, 2, 3],
    "CY8151": [1, 2, 3],
    "GE8151": [1, 2, 3],
    "GE8152": [1, 2, 3, 5, 9, 10, 11, 12],
    "GE8161": [1, 2, 3, 4, 5, 9, 10, 12],
    "BS8161": [1, 2, 3, 4, 5, 9],

    // SEMESTER II
    "HS8251": [9, 10, 11, 12],
    "MA8251": [1, 2, 3, 5],
    "PH8252": [1, 2, 3],
    "BE8255": [1, 2, 3],
    "GE8291": [1, 2, 3, 6, 7, 8, 9, 12],
    "CS8251": [1, 2, 3, 4, 5, 9, 10],
    "GE8261": [1, 2, 3, 5, 9, 10, 11, 12],
    "CS8261": [1, 2, 3, 4, 5, 9, 12],

    // SEMESTER III
    "MA8351": [1, 2, 3, 5],
    "CS8351": [1, 2, 3],
    "CS8391": [1, 2, 3],
    "CS8392": [1, 2, 3],
    "EC8395": [1, 2, 3],
    "CS8381": [1, 2, 3, 4, 5, 9, 10],
    "CS8383": [1, 2, 3, 4, 5, 9, 10],
    "CS8382": [1, 2, 3, 4, 5, 9, 10, 12],
    "HS8381": [9, 10, 11, 12],

    // SEMESTER IV
    "MA8402": [1, 2, 3, 4, 5, 12],
    "CS8491": [1, 2, 3],
    "CS8492": [1, 2, 3],
    "CS8451": [1, 2, 3, 4, 5, 12],
    "CS8493": [1, 2, 3],
    "CS8494": [1, 2, 3, 4, 5, 8, 9, 10, 11],
    "CS8481": [1, 2, 3, 4, 5, 9, 10],
    "CS8461": [1, 2, 3, 4, 5, 9, 10],
    "HS8461": [9, 10, 11, 12],

    // SEMESTER V
    "MA8551": [1, 2, 3, 5],
    "CS8591": [1, 2, 3],
    "EC8691": [1, 2, 3],
    "CS8501": [1, 2, 3],
    "CS8592": [1, 2, 3, 4],
    "EC8681": [1, 2, 3, 4, 5, 9, 10],
    "CS8582": [1, 2, 3, 4, 5, 8, 9, 10, 11],
    "CS8581": [1, 2, 3, 4, 5, 9, 10],

    // SEMESTER VI
    "CS8651": [1, 2, 3, 4, 5, 9, 10],
    "CS8691": [1, 2, 3],
    "CS8601": [1, 2, 3],
    "CS8602": [1, 2, 3, 4, 5, 9, 10],
    "CS8603": [1, 2, 3],
    "CS8661": [1, 2, 3, 4, 5, 9, 10, 12],
    "CS8662": [1, 2, 3, 4, 5, 9, 10, 11, 12],
    "CS8611": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

    // PE VI
    "CS8075": [1, 2, 3],
    "IT8076": [1, 2, 3, 4, 5, 9],
    "IT8072": [1, 2, 3],
    "CS8072": [1, 2, 3],
    "CS8077": [1, 2, 3],
    "GE8075": [1, 2, 3, 6, 7, 8, 9],
    "IT8071": [1, 2, 3],

    // SEMESTER VII
    "MG8591": [9, 10, 11, 12],
    "CS8792": [1, 2, 3],
    "CS8791": [1, 2, 3],
    "CS8711": [1, 2, 3, 4, 5, 9, 10, 12],
    "IT8761": [1, 2, 3, 4, 5, 9, 10, 12],

    // PE VII
    "CS8091": [1, 2, 3, 4, 5, 12],
    "CS8082": [1, 2, 3, 4, 5, 12],
    "CS8092": [1, 2, 3],
    "IT8075": [1, 2, 3, 4, 5, 8, 9, 10, 11],
    "CS8081": [1, 2, 3],
    "IT8074": [1, 2, 3],
    "GE8077": [1, 2, 3, 9],
    "CS8083": [1, 2, 3],
    "CS8079": [1, 2, 3],
    "CS8073": [1, 2, 3, 4, 5, 9],
    "CS8088": [1, 2, 3],
    "CS8071": [1, 2, 3],
    "GE8072": [1, 2, 3],
    "GE8074": [1, 2, 3],
    "GE8071": [1, 2, 3, 9],

    // SEMESTER VIII
    "CS8811": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

    // PE VIII
    "EC8093": [1, 2, 3],
    "CS8085": [1, 2, 3],
    "IT8073": [1, 2, 3, 9],
    "CS8087": [1, 2, 3],
    "CS8074": [1, 2, 3, 9],
    "CS8086": [1, 2, 3],
    "GE8076": [1, 2, 3, 6, 7, 8, 9],
    "CS8080": [1, 2, 3],
    "CS8078": [1, 2, 3],
    "CS8076": [1, 2, 3],
    "CS8084": [1, 2, 3],
    "CS8001": [1, 2, 3],
    "IT8077": [1, 2, 3],
    "GE8073": [1, 2, 3],
};

// ============================================================
// SEEDING LOGIC
// ============================================================

async function seed() {
    console.log("🚀 Starting Anna University B.E. CSE R2017 data seeding...\n");

    // --- 1. Department ---
    console.log("📁 Seeding department...");
    let { data: dept, error: deptErr } = await supabase
        .from("departments")
        .upsert({ name: DEPARTMENT.name, code: DEPARTMENT.code }, { onConflict: "code" })
        .select()
        .single();
    if (deptErr) {
        // Try fetching if upsert fails
        const { data: existing } = await supabase.from("departments").select().eq("code", DEPARTMENT.code).single();
        if (existing) dept = existing;
        else { console.error("❌ Department error:", deptErr); return; }
    }
    console.log(`  ✅ Department: ${dept.name} (${dept.id})`);

    // --- 2. Program ---
    console.log("📚 Seeding program...");
    let { data: prog, error: progErr } = await supabase
        .from("programs")
        .upsert({ name: PROGRAM.name, code: PROGRAM.code, department_id: dept.id }, { onConflict: "code" })
        .select()
        .single();
    if (progErr) {
        const { data: existing } = await supabase.from("programs").select().eq("code", PROGRAM.code).single();
        if (existing) prog = existing;
        else { console.error("❌ Program error:", progErr); return; }
    }
    console.log(`  ✅ Program: ${prog.name} (${prog.id})`);

    // --- 3. Program Outcomes ---
    console.log("🎯 Seeding program outcomes (12 POs + 3 PSOs)...");
    const poRecords = PROGRAM_OUTCOMES.map((po) => ({
        program_id: prog.id,
        po_number: po.po_number,
        description: po.description,
    }));

    // Delete existing POs for this program first, then insert fresh
    await supabase.from("program_outcomes").delete().eq("program_id", prog.id);
    const { data: insertedPOs, error: poErr } = await supabase
        .from("program_outcomes")
        .insert(poRecords)
        .select();
    if (poErr) {
        console.error("❌ PO insert error:", poErr);
        return;
    }
    console.log(`  ✅ Inserted ${insertedPOs.length} Program Outcomes`);

    // Build PO lookup: po_number -> id
    const poLookup = {};
    insertedPOs.forEach((po) => { poLookup[po.po_number] = po.id; });

    // --- 4. Subjects ---
    console.log("📖 Seeding subjects...");
    let subjectCount = 0;
    let skipCount = 0;
    const subjectLookup = {}; // code -> id

    for (const [code, name, semester, year, credits] of SUBJECTS) {
        const { data: existing } = await supabase.from("subjects").select("id").eq("code", code).maybeSingle();
        if (existing) {
            subjectLookup[code] = existing.id;
            skipCount++;
            continue;
        }
        const { data: sub, error: subErr } = await supabase
            .from("subjects")
            .insert({ name, code, program_id: prog.id, semester, year, credits })
            .select()
            .single();
        if (subErr) {
            console.warn(`  ⚠️  Skip ${code}: ${subErr.message}`);
            continue;
        }
        subjectLookup[code] = sub.id;
        subjectCount++;
    }
    console.log(`  ✅ Inserted ${subjectCount} subjects (${skipCount} already existed)`);

    // --- 5. CO-PO Mapping (using course outcomes) ---
    console.log("🔗 Seeding CO-PO mappings...");
    let mappingCount = 0;
    let mappingSkip = 0;

    for (const [subjectCode, poNumbers] of Object.entries(CO_PO_MAP)) {
        const subjectId = subjectLookup[subjectCode];
        if (!subjectId) {
            mappingSkip++;
            continue;
        }

        // Create a single course outcome per subject for the mapping (CO1)
        let coId;
        const { data: existingCO } = await supabase
            .from("course_outcomes")
            .select("id")
            .eq("subject_id", subjectId)
            .eq("co_number", 1)
            .maybeSingle();

        if (existingCO) {
            coId = existingCO.id;
        } else {
            const { data: newCO, error: coErr } = await supabase
                .from("course_outcomes")
                .insert({ subject_id: subjectId, co_number: 1, description: `CO1 for ${subjectCode}` })
                .select()
                .single();
            if (coErr) {
                console.warn(`  ⚠️  CO error for ${subjectCode}: ${coErr.message}`);
                continue;
            }
            coId = newCO.id;
        }

        // Insert mappings to each PO
        for (const poNum of poNumbers) {
            const poId = poLookup[poNum];
            if (!poId) continue;

            const { data: existingMap } = await supabase
                .from("co_po_mapping")
                .select("id")
                .eq("co_id", coId)
                .eq("po_id", poId)
                .maybeSingle();

            if (existingMap) continue;

            const { error: mapErr } = await supabase
                .from("co_po_mapping")
                .insert({ co_id: coId, po_id: poId, correlation_level: 3 });

            if (!mapErr) mappingCount++;
        }
    }
    console.log(`  ✅ Inserted ${mappingCount} CO-PO mappings (${mappingSkip} subjects skipped)`);

    // --- Summary ---
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Seeding complete!");
    console.log(`  Department: ${dept.name}`);
    console.log(`  Program:    ${prog.name}`);
    console.log(`  POs/PSOs:   ${insertedPOs.length}`);
    console.log(`  Subjects:   ${subjectCount + skipCount}`);
    console.log(`  Mappings:   ${mappingCount}`);
    console.log("=".repeat(50));
}

seed().catch(console.error);
