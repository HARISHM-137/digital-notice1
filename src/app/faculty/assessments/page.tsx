"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

type TabType = "internal" | "assignment" | "lab";

interface StudentRow {
    student_id: string;
    name: string;
    register_no: string;
    marks: number | null;
}

export default function FacultyAssessmentsPage() {
    // const { showToast } = useToast(); // Removed hook usage
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>("internal");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Assessment data
    const [tests, setTests] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [labRecords, setLabRecords] = useState<any[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState("");
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [cos, setCos] = useState<any[]>([]);

    // Create assessment form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newAssessment, setNewAssessment] = useState({
        name: "",
        number: 1,
        max_marks: 50,
        co_id: "",
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            fetchCOs();
            fetchAssessments();
        }
    }, [selectedSubject, activeTab]);

    useEffect(() => {
        if (selectedAssessment) {
            fetchStudentMarks();
        }
    }, [selectedAssessment]);

    const fetchSubjects = async () => {
        try {
            const user = await getTestUser('FACULTY');
            if (!user) {
                // No faculty in DB yet — show all subjects
                const { data, error } = await supabase
                    .from("subjects")
                    .select("id, name, code")
                    .order("name");
                if (!error && data) {
                    setSubjects(data);
                    if (data.length > 0) setSelectedSubject(data[0].id);
                }
                return;
            }

            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subject:subjects(id, name, code)")
                .eq("faculty_id", user.id);

            if (error) throw error;
            let formatted = (data || [])
                .map((item: any) => item.subject)
                .filter(Boolean);

            // Fallback: if faculty has no assigned subjects, show all subjects
            if (formatted.length === 0) {
                const { data: allSubjects } = await supabase
                    .from("subjects")
                    .select("id, name, code")
                    .order("name");
                formatted = allSubjects || [];
            }

            setSubjects(formatted);
            if (formatted.length > 0) setSelectedSubject(formatted[0].id);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCOs = async () => {
        const { data } = await supabase
            .from("course_outcomes")
            .select("id, co_number, description")
            .eq("subject_id", selectedSubject)
            .order("co_number");
        setCos(data || []);
    };

    const fetchAssessments = async () => {
        setSelectedAssessment("");
        setStudents([]);

        if (activeTab === "internal") {
            const { data } = await supabase
                .from("internal_tests")
                .select("*")
                .eq("subject_id", selectedSubject)
                .order("test_number");
            setTests(data || []);
        } else if (activeTab === "assignment") {
            const { data } = await supabase
                .from("assignments")
                .select("*")
                .eq("subject_id", selectedSubject)
                .order("assignment_number");
            setAssignments(data || []);
        } else {
            const { data } = await supabase
                .from("lab_records")
                .select("*")
                .eq("subject_id", selectedSubject)
                .order("experiment_number");
            setLabRecords(data || []);
        }
    };

    const fetchStudentMarks = async () => {
        try {
            // Get enrolled students
            const { data: enrollments } = await supabase
                .from("student_subjects")
                .select("student_id, users(id, name, register_no)")
                .eq("subject_id", selectedSubject);

            if (!enrollments || enrollments.length === 0) {
                setStudents([]);
                return;
            }

            // Get existing marks
            let marksMap: Record<string, number> = {};

            if (activeTab === "internal") {
                const { data: marks } = await supabase
                    .from("internal_test_marks")
                    .select("student_id, marks_obtained")
                    .eq("test_id", selectedAssessment);
                marks?.forEach((m: any) => { marksMap[m.student_id] = Number(m.marks_obtained); });
            } else if (activeTab === "assignment") {
                const { data: marks } = await supabase
                    .from("assignment_marks")
                    .select("student_id, marks_obtained")
                    .eq("assignment_id", selectedAssessment);
                marks?.forEach((m: any) => { marksMap[m.student_id] = Number(m.marks_obtained); });
            } else {
                const { data: marks } = await supabase
                    .from("lab_record_marks")
                    .select("student_id, marks_obtained")
                    .eq("lab_record_id", selectedAssessment);
                marks?.forEach((m: any) => { marksMap[m.student_id] = Number(m.marks_obtained); });
            }

            const studentRows: StudentRow[] = enrollments.map((e: any) => ({
                student_id: e.users?.id || e.student_id,
                name: e.users?.name || "Unknown",
                register_no: e.users?.register_no || "—",
                marks: marksMap[e.student_id] ?? null,
            }));

            studentRows.sort((a, b) => a.register_no.localeCompare(b.register_no));
            setStudents(studentRows);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const getMaxMarks = () => {
        if (activeTab === "internal") {
            return tests.find((t) => t.id === selectedAssessment)?.max_marks || 100;
        } else if (activeTab === "assignment") {
            return assignments.find((a) => a.id === selectedAssessment)?.max_marks || 100;
        } else {
            return labRecords.find((l) => l.id === selectedAssessment)?.max_marks || 100;
        }
    };

    const handleMarksChange = (studentId: string, value: string) => {
        const numValue = value === "" ? null : Number(value);
        const maxMarks = getMaxMarks();
        if (numValue !== null && (numValue < 0 || numValue > maxMarks)) return;

        setStudents((prev) =>
            prev.map((s) => s.student_id === studentId ? { ...s, marks: numValue } : s)
        );
    };

    const saveMarks = async () => {
        setSaving(true);
        try {
            const toSave = students.filter((s) => s.marks !== null);

            if (activeTab === "internal") {
                for (const s of toSave) {
                    await supabase.from("internal_test_marks").upsert(
                        { test_id: selectedAssessment, student_id: s.student_id, marks_obtained: s.marks },
                        { onConflict: "test_id,student_id" }
                    );
                }
            } else if (activeTab === "assignment") {
                for (const s of toSave) {
                    await supabase.from("assignment_marks").upsert(
                        { assignment_id: selectedAssessment, student_id: s.student_id, marks_obtained: s.marks },
                        { onConflict: "assignment_id,student_id" }
                    );
                }
            } else {
                for (const s of toSave) {
                    await supabase.from("lab_record_marks").upsert(
                        { lab_record_id: selectedAssessment, student_id: s.student_id, marks_obtained: s.marks },
                        { onConflict: "lab_record_id,student_id" }
                    );
                }
            }

            showToast(`Marks saved for ${toSave.length} students!`, "success");
        } catch (error: any) {
            console.error("Error saving marks:", error);
            showToast(error.message || "Error saving marks", "error");
        } finally {
            setSaving(false);
        }
    };

    const createAssessment = async () => {
        try {
            const user = await getTestUser('FACULTY');

            const academic_year = "2025-26";

            if (activeTab === "internal") {
                const { error } = await supabase.from("internal_tests").insert({
                    subject_id: selectedSubject,
                    test_name: newAssessment.name || `CAT ${newAssessment.number}`,
                    test_number: newAssessment.number,
                    max_marks: newAssessment.max_marks,
                    academic_year,
                    created_by: user.id,
                });
                if (error) throw error;
            } else if (activeTab === "assignment") {
                const { error } = await supabase.from("assignments").insert({
                    subject_id: selectedSubject,
                    assignment_name: newAssessment.name || `Assignment ${newAssessment.number}`,
                    assignment_number: newAssessment.number,
                    max_marks: newAssessment.max_marks,
                    co_id: newAssessment.co_id || null,
                    academic_year,
                    created_by: user.id,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from("lab_records").insert({
                    subject_id: selectedSubject,
                    experiment_name: newAssessment.name || `Experiment ${newAssessment.number}`,
                    experiment_number: newAssessment.number,
                    max_marks: newAssessment.max_marks,
                    co_id: newAssessment.co_id || null,
                    academic_year,
                    created_by: user.id,
                });
                if (error) throw error;
            }

            showToast("Assessment created!", "success");
            setShowCreateForm(false);
            setNewAssessment({ name: "", number: 1, max_marks: 50, co_id: "" });
            fetchAssessments();
        } catch (error: any) {
            console.error("Error creating assessment:", error);
            showToast(error.message || "Failed to create", "error");
        }
    };

    const getAssessmentList = () => {
        if (activeTab === "internal") return tests.map((t) => ({ id: t.id, label: `${t.test_name} (Max: ${t.max_marks})` }));
        if (activeTab === "assignment") return assignments.map((a) => ({ id: a.id, label: `${a.assignment_name} (Max: ${a.max_marks})` }));
        return labRecords.map((l) => ({ id: l.id, label: `${l.experiment_name} (Max: ${l.max_marks})` }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const tabs = [
        { key: "internal" as TabType, label: "📝 CAT Marks", icon: "📝" },
        { key: "assignment" as TabType, label: "📋 Assignments", icon: "📋" },
        { key: "lab" as TabType, label: "🔬 Lab Records", icon: "🔬" },
    ];

    const assessmentList = getAssessmentList();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Assessment & Marks Entry</h1>
                <p className="text-slate-500">Create assessments and enter marks for enrolled students</p>
            </div>

            {/* Subject Selection */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Choose subject</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {selectedSubject && (
                <>
                    {/* Tab Navigation */}
                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setSelectedAssessment(""); setStudents([]); }}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-600 hover:text-slate-800"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Assessment List + Create */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {activeTab === "internal" && "Internal Tests (CAT)"}
                                {activeTab === "assignment" && "Assignments"}
                                {activeTab === "lab" && "Lab Records"}
                            </h3>
                            <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="outline">
                                {showCreateForm ? "Cancel" : "+ New"}
                            </Button>
                        </div>

                        {/* Create Form */}
                        {showCreateForm && (
                            <div className="p-4 bg-slate-50 rounded-lg mb-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={newAssessment.name}
                                            onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                                            placeholder={activeTab === "internal" ? "CAT 1" : activeTab === "assignment" ? "Assignment 1" : "Experiment 1"}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Number</label>
                                        <input
                                            type="number"
                                            value={newAssessment.number}
                                            onChange={(e) => setNewAssessment({ ...newAssessment, number: Number(e.target.value) })}
                                            min={1}
                                            max={activeTab === "internal" ? 3 : 10}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Max Marks</label>
                                        <input
                                            type="number"
                                            value={newAssessment.max_marks}
                                            onChange={(e) => setNewAssessment({ ...newAssessment, max_marks: Number(e.target.value) })}
                                            min={1}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    {activeTab !== "internal" && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Linked CO</label>
                                            <select
                                                value={newAssessment.co_id}
                                                onChange={(e) => setNewAssessment({ ...newAssessment, co_id: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            >
                                                <option value="">No CO</option>
                                                {cos.map((co) => (
                                                    <option key={co.id} value={co.id}>CO{co.co_number}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <Button onClick={createAssessment}>Create Assessment</Button>
                            </div>
                        )}

                        {/* Assessment Selector */}
                        {assessmentList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <p>No assessments created yet. Click &quot;+ New&quot; to create one.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assessmentList.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => setSelectedAssessment(a.id)}
                                        className={`w-full text-left p-3 rounded-lg text-sm transition-all ${selectedAssessment === a.id
                                            ? "bg-indigo-50 border-2 border-indigo-400 text-indigo-700 font-medium"
                                            : "bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700"
                                            }`}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Marks Entry Table */}
                    {selectedAssessment && (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800">
                                    Enter Marks (Max: {getMaxMarks()})
                                </h3>
                                <Button onClick={saveMarks} disabled={saving}>
                                    {saving ? "Saving..." : "💾 Save All Marks"}
                                </Button>
                            </div>

                            {students.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <p className="font-medium">No students enrolled</p>
                                    <p className="text-sm mt-1">Students must be enrolled via admin or auto-enrollment</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Register No</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student Name</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-600">Marks</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-600">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((s, idx) => {
                                                const pct = s.marks !== null ? Math.round((s.marks / getMaxMarks()) * 100) : null;
                                                return (
                                                    <tr key={s.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-mono text-sm">{s.register_no}</td>
                                                        <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                value={s.marks ?? ""}
                                                                onChange={(e) => handleMarksChange(s.student_id, e.target.value)}
                                                                min={0}
                                                                max={getMaxMarks()}
                                                                className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500"
                                                                placeholder="—"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {pct !== null ? (
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${pct >= 60 ? "bg-green-100 text-green-700"
                                                                    : pct >= 40 ? "bg-yellow-100 text-yellow-700"
                                                                        : "bg-red-100 text-red-700"
                                                                    }`}>
                                                                    {pct}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
