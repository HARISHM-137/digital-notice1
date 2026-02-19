"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Student {
    id: string;
    name: string;
    email: string;
    year: number;
    department_id: string;
    departments?: { name: string };
    programs?: { id: string; name: string; code: string }[];
}

interface Subject {
    id: string;
    name: string;
    code: string;
    semester: number;
    credits: number;
    program_id: string;
    programs?: { name: string; code: string };
}

interface AssignedSubject {
    id: string;
    subject_id: string;
    academic_year: string;
    subjects?: { name: string; code: string; semester: number; credits: number };
}

const ACADEMIC_YEAR = "2025-26";
const EVEN_SEMESTERS = [2, 4, 6, 8];
const MAX_SUBJECTS = 6;

export default function AdminStudentManagementPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedYear, setSelectedYear] = useState<number | "all">("all");

    // Modal state
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    // Subject counts per student
    const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [studRes, subjRes] = await Promise.all([
                supabase
                    .from("users")
                    .select("id, name, email, year, department_id, departments(name)")
                    .eq("role", "STUDENT")
                    .order("name"),
                supabase
                    .from("subjects")
                    .select("id, name, code, semester, credits, program_id, programs(name, code)")
                    .in("semester", EVEN_SEMESTERS)
                    .order("semester")
                    .order("code"),
            ]);

            const studentList: Student[] = (studRes.data as any) || [];
            setStudents(studentList);
            setSubjects((subjRes.data as any) || []);

            // Fetch subject counts for all students at once
            if (studentList.length > 0) {
                const { data: countData } = await supabase
                    .from("student_subjects")
                    .select("student_id")
                    .eq("academic_year", ACADEMIC_YEAR)
                    .in("student_id", studentList.map(s => s.id));

                const counts: Record<string, number> = {};
                (countData || []).forEach((row: any) => {
                    counts[row.student_id] = (counts[row.student_id] || 0) + 1;
                });
                setSubjectCounts(counts);
            }
        } finally {
            setLoading(false);
        }
    };

    const openModal = useCallback(async (student: Student) => {
        setSelectedStudent(student);
        setModalLoading(true);
        setMessage({ text: "", type: "" });
        try {
            const { data } = await supabase
                .from("student_subjects")
                .select("id, subject_id, academic_year, subjects(name, code, semester, credits)")
                .eq("student_id", student.id)
                .eq("academic_year", ACADEMIC_YEAR);

            const assigned: AssignedSubject[] = (data as any) || [];
            setAssignedSubjects(assigned);
            setSelectedSubjectIds(new Set(assigned.map(a => a.subject_id)));
        } finally {
            setModalLoading(false);
        }
    }, []);

    const closeModal = () => {
        setSelectedStudent(null);
        setAssignedSubjects([]);
        setSelectedSubjectIds(new Set());
        setMessage({ text: "", type: "" });
    };

    const toggleSubject = (subjectId: string) => {
        setSelectedSubjectIds(prev => {
            const next = new Set(prev);
            if (next.has(subjectId)) {
                next.delete(subjectId);
            } else {
                if (next.size >= MAX_SUBJECTS) {
                    setMessage({ text: `Maximum ${MAX_SUBJECTS} subjects allowed`, type: "error" });
                    return prev;
                }
                next.add(subjectId);
            }
            return next;
        });
    };

    const handleAutoSelect = () => {
        if (!selectedStudent) return;
        const evenSem = (selectedStudent.year || 1) * 2;
        const semSubjects = subjects.filter(s => s.semester === evenSem);
        const toSelect = semSubjects.slice(0, MAX_SUBJECTS).map(s => s.id);
        setSelectedSubjectIds(new Set(toSelect));
        setMessage({ text: `Auto-selected ${toSelect.length} subjects for Semester ${evenSem}`, type: "success" });
    };

    const handleSave = async () => {
        if (!selectedStudent) return;
        setSaving(true);
        setMessage({ text: "", type: "" });
        try {
            // Delete all current assignments for this student this year
            await supabase
                .from("student_subjects")
                .delete()
                .eq("student_id", selectedStudent.id)
                .eq("academic_year", ACADEMIC_YEAR);

            // Insert new assignments
            if (selectedSubjectIds.size > 0) {
                const records = Array.from(selectedSubjectIds).map(sid => ({
                    student_id: selectedStudent.id,
                    subject_id: sid,
                    academic_year: ACADEMIC_YEAR,
                }));
                const { error } = await supabase.from("student_subjects").insert(records);
                if (error) throw error;
            }

            setMessage({ text: `✅ Saved ${selectedSubjectIds.size} subjects for ${selectedStudent.name}`, type: "success" });

            // Update the count in the table
            setSubjectCounts(prev => ({ ...prev, [selectedStudent.id]: selectedSubjectIds.size }));

            // Refresh assigned list
            const { data } = await supabase
                .from("student_subjects")
                .select("id, subject_id, academic_year, subjects(name, code, semester, credits)")
                .eq("student_id", selectedStudent.id)
                .eq("academic_year", ACADEMIC_YEAR);
            setAssignedSubjects((data as any) || []);
        } catch (err: any) {
            setMessage({ text: `Error: ${err.message}`, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    // Filter logic
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase());
        const matchesYear = selectedYear === "all" || s.year === selectedYear;
        return matchesSearch && matchesYear;
    });

    // Available subjects in modal (filtered by student's even semester)
    const studentEvenSem = selectedStudent ? (selectedStudent.year || 1) * 2 : null;
    const modalSubjects = selectedStudent
        ? subjects.filter(s => s.semester === studentEvenSem)
        : [];
    const otherSubjects = selectedStudent
        ? subjects.filter(s => s.semester !== studentEvenSem)
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
                <p className="text-slate-500 mt-1">Assign subjects to students for academic year {ACADEMIC_YEAR}</p>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(yr => {
                    const count = students.filter(s => s.year === yr).length;
                    const assigned = students.filter(s => s.year === yr && (subjectCounts[s.id] || 0) > 0).length;
                    return (
                        <Card key={yr} className="text-center cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedYear(yr === selectedYear ? "all" : yr)}>
                            <p className="text-xs text-slate-500 font-medium">Year {yr} · Sem {yr * 2}</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{count}</p>
                            <p className="text-xs text-emerald-600">{assigned} assigned</p>
                        </Card>
                    );
                })}
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-48 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">All Years</option>
                    {[1, 2, 3, 4].map(yr => <option key={yr} value={yr}>Year {yr}</option>)}
                </select>
            </div>

            {/* Student Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-slate-200">
                                <th className="pb-3 pr-4 font-semibold text-slate-600">Student</th>
                                <th className="pb-3 pr-4 font-semibold text-slate-600">Year / Sem</th>
                                <th className="pb-3 pr-4 font-semibold text-slate-600">Department</th>
                                <th className="pb-3 pr-4 font-semibold text-slate-600">Subjects Assigned</th>
                                <th className="pb-3 font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-slate-400">No students found</td>
                                </tr>
                            ) : filteredStudents.map(student => {
                                const count = subjectCounts[student.id] || 0;
                                const isFull = count >= MAX_SUBJECTS;
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 pr-4">
                                            <p className="font-medium text-slate-800">{student.name}</p>
                                            <p className="text-xs text-slate-400">{student.email}</p>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                                Year {student.year} · Sem {(student.year || 1) * 2}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">
                                            {(student.departments as any)?.name || "—"}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 max-w-24 bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${isFull ? "bg-emerald-500" : count > 0 ? "bg-amber-400" : "bg-slate-300"}`}
                                                        style={{ width: `${(count / MAX_SUBJECTS) * 100}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold ${isFull ? "text-emerald-600" : "text-slate-500"}`}>
                                                    {count} / {MAX_SUBJECTS}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <Button size="sm" variant="outline" onClick={() => openModal(student)}>
                                                Assign Subjects
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Assignment Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Assign Subjects</h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {selectedStudent.name} · Year {selectedStudent.year} · Semester {studentEvenSem} (Even)
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {message.text && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Count pill */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-700">
                                    Selected: <span className={`font-bold ${selectedSubjectIds.size >= MAX_SUBJECTS ? "text-emerald-600" : "text-indigo-600"}`}>
                                        {selectedSubjectIds.size} / {MAX_SUBJECTS}
                                    </span>
                                </p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={handleAutoSelect}>
                                        ✨ Auto-select Sem {studentEvenSem}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedSubjectIds(new Set())}>
                                        Clear All
                                    </Button>
                                </div>
                            </div>

                            {modalLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                <>
                                    {/* Recommended: student's even semester */}
                                    {modalSubjects.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-indigo-700 mb-2 flex items-center gap-1">
                                                <span className="px-2 py-0.5 bg-indigo-100 rounded text-xs">Recommended</span>
                                                Semester {studentEvenSem} Subjects
                                            </h3>
                                            <div className="space-y-2">
                                                {modalSubjects.map(subj => {
                                                    const checked = selectedSubjectIds.has(subj.id);
                                                    return (
                                                        <label
                                                            key={subj.id}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleSubject(subj.id)}
                                                                className="w-4 h-4 text-indigo-600 rounded"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-slate-800 text-sm">{subj.name}</p>
                                                                <p className="text-xs text-slate-500">{subj.code} · Sem {subj.semester} · {subj.credits} Credits · {(subj.programs as any)?.code || ""}</p>
                                                            </div>
                                                            {checked && <span className="text-indigo-500 text-xs font-bold">✓</span>}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Other even semesters */}
                                    {otherSubjects.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-1">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">Other</span>
                                                Other Even Semester Subjects
                                            </h3>
                                            <div className="space-y-2">
                                                {otherSubjects.map(subj => {
                                                    const checked = selectedSubjectIds.has(subj.id);
                                                    return (
                                                        <label
                                                            key={subj.id}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleSubject(subj.id)}
                                                                className="w-4 h-4 text-indigo-600 rounded"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-slate-800 text-sm">{subj.name}</p>
                                                                <p className="text-xs text-slate-500">{subj.code} · Sem {subj.semester} · {subj.credits} Credits · {(subj.programs as any)?.code || ""}</p>
                                                            </div>
                                                            {checked && <span className="text-indigo-500 text-xs font-bold">✓</span>}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {modalSubjects.length === 0 && otherSubjects.length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                            <p>No subjects found. Add subjects first in the Subjects page.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <p className="text-xs text-slate-400">
                                {selectedSubjectIds.size >= MAX_SUBJECTS ? "✅ Full (6/6 subjects)" : `${MAX_SUBJECTS - selectedSubjectIds.size} more subject(s) can be added`}
                            </p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? "Saving..." : `💾 Save ${selectedSubjectIds.size} Subject${selectedSubjectIds.size !== 1 ? "s" : ""}`}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
