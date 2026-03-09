"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";

interface Student {
    id: string;
    name: string;
    register_no: string;
    marks: Record<number, number>;
    lab_marks?: number;
    assignment_marks?: number;
}

interface COInfo {
    co_number: number;
    cutoff_mark: number;
    max_marks: number;
    description: string;
}

interface SubjectInfo {
    id: string;
    name: string;
    code: string;
    academic_year: string;
    lab_max_marks: number;
    assignment_max_marks: number;
}

interface COResult {
    co_number: number;
    description: string;
    cutoff_mark: number;
    total_students: number;
    students_passed: number;
    percentage: number;
    attainment_value: number;
}

export default function FacultyEnterMarksPage() {
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);
    const [academicYear, setAcademicYear] = useState("2025-26");
    const [students, setStudents] = useState<Student[]>([]);
    const [cos, setCos] = useState<COInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Attainment results
    const [coResults, setCoResults] = useState<COResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Local marks state: {studentId: {co_number: marks, lab: marks, assignment: marks}}
    const [localMarks, setLocalMarks] = useState<Record<string, Record<string | number, string>>>({});

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        const user = await getTestUser("FACULTY");
        if (!user) {
            const { data } = await supabase.from("subjects").select("id, name, code, academic_year, lab_max_marks, assignment_max_marks").order("name");
            setSubjects(data || []);
            return;
        }
        const { data } = await supabase
            .from("faculty_subjects")
            .select("subject:subjects(id, name, code, academic_year, lab_max_marks, assignment_max_marks)")
            .eq("faculty_id", user.id);
        let list = data?.map((d: any) => d.subject).filter(Boolean) || [];
        if (list.length === 0) {
            const { data: all } = await supabase.from("subjects").select("id, name, code, academic_year, lab_max_marks, assignment_max_marks").order("name");
            list = all || [];
        }
        setSubjects(list);
    };

    const fetchStudents = useCallback(async (subjectId: string, year: string) => {
        if (!subjectId) return;
        setLoading(true);
        try {
            // Updated API expected to return lab_marks and assignment_marks too
            const res = await fetch(`/api/student-co-marks?subject_id=${subjectId}&academic_year=${year}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCos(data.cos || []);
            setStudents(data.students || []);

            // Initialize localMarks
            const init: Record<string, Record<string | number, string>> = {};
            (data.students || []).forEach((s: Student) => {
                init[s.id] = {
                    lab: s.lab_marks !== undefined ? String(s.lab_marks) : "",
                    assignment: s.assignment_marks !== undefined ? String(s.assignment_marks) : ""
                };
                (data.cos || []).forEach((co: COInfo) => {
                    init[s.id][co.co_number] = s.marks[co.co_number] !== undefined ? String(s.marks[co.co_number]) : "";
                });
            });
            setLocalMarks(init);
            setCoResults([]);
            setShowResults(false);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSubjectChange = (subjectId: string) => {
        const subj = subjects.find(s => s.id === subjectId) || null;
        setSelectedSubject(subj);
        if (subj) fetchStudents(subjectId, academicYear);
    };

    const updateMark = (studentId: string, key: number | string, val: string) => {
        setLocalMarks(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [key]: val }
        }));
    };

    const saveMarks = async () => {
        if (!selectedSubject) return;
        setSaving(true);
        try {
            const marksPayload: any[] = [];
            students.forEach(s => {
                const lab = parseFloat(localMarks[s.id]?.lab || "0");
                const assignment = parseFloat(localMarks[s.id]?.assignment || "0");
                cos.forEach(co => {
                    const val = parseFloat(localMarks[s.id]?.[co.co_number] || "0");
                    marksPayload.push({
                        student_id: s.id,
                        co_number: co.co_number,
                        marks: val,
                        lab_marks: lab,
                        assignment_marks: assignment
                    });
                });
            });

            // If no COs exist for the subject, save lab/assignment marks anyway
            if (cos.length === 0 && (selectedSubject.lab_max_marks > 0 || selectedSubject.assignment_max_marks > 0)) {
                students.forEach(s => {
                    const lab = parseFloat(localMarks[s.id]?.lab || "0");
                    const assignment = parseFloat(localMarks[s.id]?.assignment || "0");
                    marksPayload.push({
                        student_id: s.id,
                        co_number: 1, // Dummy CO just to store the row
                        marks: 0,
                        lab_marks: lab,
                        assignment_marks: assignment
                    });
                });
            }

            const res = await fetch("/api/student-co-marks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject_id: selectedSubject.id,
                    academic_year: academicYear,
                    marks: marksPayload,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert(`✅ Saved marks for ${students.length} students.`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const calculateAttainment = () => {
        if (!selectedSubject) return;

        // Compute dynamically purely in frontend based on currently entered marks
        const results: COResult[] = cos.map(co => {
            let passed = 0;
            students.forEach(s => {
                const mark = parseFloat(localMarks[s.id]?.[co.co_number] || "0");
                if (mark >= co.cutoff_mark) passed++;
            });

            const total = students.length;
            const pct = total > 0 ? (passed / total) * 100 : 0;
            const att = pct >= 80 ? 3 : pct >= 70 ? 2 : pct >= 60 ? 1 : 0;

            return {
                co_number: co.co_number,
                description: co.description,
                cutoff_mark: co.cutoff_mark,
                total_students: total,
                students_passed: passed,
                percentage: pct,
                attainment_value: att
            };
        });

        setCoResults(results);
        setShowResults(true);
    };

    const hasLab = (selectedSubject?.lab_max_marks ?? 0) > 0;
    const hasAssignment = (selectedSubject?.assignment_max_marks ?? 0) > 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Enter Student Marks</h1>
                <p className="text-slate-500">Enter CO-wise marks, Lab, and Assignment marks per student, then calculate attainment</p>
            </div>

            {/* Subject Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[300px]">
                    <label className="block text-sm text-slate-600 mb-1">Subject</label>
                    <select value={selectedSubject?.id || ""} onChange={e => handleSubjectChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">— Select Subject —</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-slate-600 mb-1">Academic Year</label>
                    <select value={academicYear} onChange={e => { setAcademicYear(e.target.value); if (selectedSubject) fetchStudents(selectedSubject.id, e.target.value); }}
                        className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        {["2023-24", "2024-25", "2025-26", "2026-27"].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Marks Table */}
            {!loading && selectedSubject && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:border-none">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
                        Step 1. Student Marks
                        <span className="ml-2 text-indigo-600 normal-case text-xs font-normal">({students.length} students)</span>
                    </h2>

                    {students.length === 0 ? (
                        <div className="text-center py-12 text-slate-600">No students enrolled in this subject.</div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800 text-white">
                                        <th className="px-4 py-3 text-left">Student Name</th>
                                        {cos.map(co => (
                                            <th key={co.co_number} className="px-3 py-3 text-center min-w-[80px]">
                                                CO{co.co_number}
                                                <div className="text-xs font-normal text-slate-300">Max: {co.max_marks || "-"} | Cutoff: {co.cutoff_mark}</div>
                                            </th>
                                        ))}
                                        {hasLab && (
                                            <th className="px-3 py-3 text-center bg-slate-700 border-l border-slate-600">
                                                Lab
                                                <div className="text-xs font-normal text-slate-300">Max: {selectedSubject.lab_max_marks}</div>
                                            </th>
                                        )}
                                        {hasAssignment && (
                                            <th className="px-3 py-3 text-center bg-slate-700">
                                                Assignment
                                                <div className="text-xs font-normal text-slate-300">Max: {selectedSubject.assignment_max_marks}</div>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, idx) => (
                                        <tr key={s.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-indigo-50`}>
                                            <td className="px-4 py-2.5 font-medium text-slate-800">
                                                {s.name}
                                                <div className="text-xs font-normal text-slate-500">{s.register_no}</div>
                                            </td>
                                            {cos.map(co => {
                                                const val = localMarks[s.id]?.[co.co_number] ?? "";
                                                const numVal = parseFloat(val);
                                                const isPassed = !isNaN(numVal) && numVal >= co.cutoff_mark;
                                                return (
                                                    <td key={co.co_number} className="px-2 py-2 text-center">
                                                        <input type="number" min={0} max={co.max_marks || 100} step={0.5}
                                                            value={val} onChange={e => updateMark(s.id, co.co_number, e.target.value)}
                                                            className={`w-16 px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none print:border-none print:w-auto
                                                                ${val === "" ? "border-slate-200" : isPassed ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}`}
                                                            placeholder="0" />
                                                    </td>
                                                );
                                            })}
                                            {hasLab && (
                                                <td className="px-2 py-2 text-center border-l border-slate-100 bg-slate-50">
                                                    <input type="number" min={0} max={selectedSubject.lab_max_marks} step={0.5}
                                                        value={localMarks[s.id]?.lab ?? ""} onChange={e => updateMark(s.id, "lab", e.target.value)}
                                                        className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center text-sm outline-none print:border-none print:w-auto" placeholder="0" />
                                                </td>
                                            )}
                                            {hasAssignment && (
                                                <td className="px-2 py-2 text-center bg-slate-50">
                                                    <input type="number" min={0} max={selectedSubject.assignment_max_marks} step={0.5}
                                                        value={localMarks[s.id]?.assignment ?? ""} onChange={e => updateMark(s.id, "assignment", e.target.value)}
                                                        className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center text-sm outline-none print:border-none print:w-auto" placeholder="0" />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 print:hidden">
                        <button onClick={saveMarks} disabled={saving} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl">
                            {saving ? "Saving..." : "💾 Save Marks"}
                        </button>
                        <button onClick={calculateAttainment} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                            📊 Calculate CO Attainment
                        </button>
                    </div>
                </div>
            )}

            {/* Results Grid */}
            {showResults && selectedSubject && coResults.length > 0 && (
                <div className="space-y-6">
                    {/* Step 2: CO Attainment Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:border-none">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Step 2. CO Attainment Table</h2>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800 text-white">
                                        <th className="px-4 py-3 text-left">CO</th>
                                        <th className="px-4 py-3 text-center">Total Students</th>
                                        <th className="px-4 py-3 text-center">Students Passed</th>
                                        <th className="px-4 py-3 text-center">Percentage</th>
                                        <th className="px-4 py-3 text-center">Attainment Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coResults.map(co => (
                                        <tr key={co.co_number} className="border-b border-slate-100">
                                            <td className="px-4 py-3 font-bold text-indigo-700">CO{co.co_number}</td>
                                            <td className="px-4 py-3 text-center">{co.total_students}</td>
                                            <td className="px-4 py-3 text-center">{co.students_passed}</td>
                                            <td className="px-4 py-3 text-center font-bold">{co.percentage.toFixed(1)}%</td>
                                            <td className="px-4 py-3 text-center font-black text-lg">{co.attainment_value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Step 3 & 4: Mappings Base & Final Result */}
                    <FinalAttainmentSection coResults={coResults} subjectId={selectedSubject.id} />
                </div>
            )}
        </div>
    );
}

// -------------------------------------------------------------------------------------------------
// CO-PO-PSO Final Attainment Section
// -------------------------------------------------------------------------------------------------
function FinalAttainmentSection({ coResults, subjectId }: { coResults: COResult[]; subjectId: string }) {
    const [mapping, setMapping] = useState<Record<string, number>>({});
    const [poCols, setPoCols] = useState<number[]>([]);
    const [psoCols, setPsoCols] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMapping = async () => {
            setLoading(true);
            const { data: poMap } = await supabase.from("co_po_mapping").select("co_number, po_number, mapping_value").eq("subject_id", subjectId);
            const { data: psoMap } = await supabase.from("co_pso_mapping").select("co_number, pso_number, mapping_value").eq("subject_id", subjectId);

            const m: Record<string, number> = {};
            const pos = new Set<number>();
            const psos = new Set<number>();

            (poMap || []).forEach(r => {
                if (r.mapping_value > 0) { m[`co${r.co_number}_po${r.po_number}`] = r.mapping_value; pos.add(r.po_number); }
            });
            (psoMap || []).forEach(r => {
                if (r.mapping_value > 0) { m[`co${r.co_number}_pso${r.pso_number}`] = r.mapping_value; psos.add(r.pso_number); }
            });

            setMapping(m);
            // Default 1-12 POs if none exist
            setPoCols(pos.size > 0 ? Array.from(pos).sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            setPsoCols(Array.from(psos).sort((a, b) => a - b));
            setLoading(false);
        };
        fetchMapping();
    }, [subjectId]);

    if (loading) return <div>Loading mapping data...</div>;

    const getBaseVal = (co: number, type: "po" | "pso", num: number) => mapping[`co${co}_${type}${num}`] || 0;

    // Formula: (CO Attainment × Mapping Value) / 3
    const getFinalVal = (co: number, type: "po" | "pso", num: number) => {
        const mapVal = getBaseVal(co, type, num);
        if (mapVal === 0) return "-";
        const attVal = coResults.find(c => c.co_number === co)?.attainment_value || 0;
        return ((attVal * mapVal) / 3).toFixed(2);
    };

    const getColAvg = (type: "po" | "pso", num: number) => {
        const vals = coResults.map(co => {
            const m = getBaseVal(co.co_number, type, num);
            if (m === 0) return null;
            return (co.attainment_value * m) / 3;
        }).filter(v => v !== null) as number[];
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "-";
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:border-none">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Step 3. Original CO-PO-PSO Mapping Table</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700">
                                <th className="px-3 py-2 text-left border-r border-slate-200">CO\PO</th>
                                {poCols.map(p => <th key={p} className="px-2 py-2 font-semibold">PO{p}</th>)}
                                {psoCols.map(p => <th key={p} className="px-2 py-2 font-semibold border-l border-slate-200">PSO{p}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {coResults.map(co => (
                                <tr key={co.co_number} className="border-b border-slate-100">
                                    <td className="px-3 py-2 font-bold text-indigo-700 border-r border-slate-200">CO{co.co_number}</td>
                                    {poCols.map(p => {
                                        const v = getBaseVal(co.co_number, "po", p);
                                        return <td key={p} className="px-2 py-2 text-center text-slate-600">{v || "-"}</td>;
                                    })}
                                    {psoCols.map(p => {
                                        const v = getBaseVal(co.co_number, "pso", p);
                                        return <td key={p} className="px-2 py-2 text-center text-slate-600 border-l border-slate-100">{v || "-"}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:border-none">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Step 4. Final PO-PSO Attainment Table</h2>
                    <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
                        Formula: (CO Attainment × Mapping Value) / 3
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-indigo-900 text-white">
                                <th className="px-3 py-3 text-left border-r border-indigo-700">CO\PO</th>
                                {poCols.map(p => <th key={p} className="px-2 py-3 font-semibold text-center">PO{p}</th>)}
                                {psoCols.map(p => <th key={p} className="px-2 py-3 font-semibold text-center border-l border-indigo-700">PSO{p}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {coResults.map(co => (
                                <tr key={co.co_number} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-2.5 font-bold text-indigo-700 border-r border-slate-200">CO{co.co_number}</td>
                                    {poCols.map(p => (
                                        <td key={p} className="px-2 py-2 text-center font-semibold text-slate-700">{getFinalVal(co.co_number, "po", p)}</td>
                                    ))}
                                    {psoCols.map(p => (
                                        <td key={p} className="px-2 py-2 text-center font-semibold text-slate-700 border-l border-slate-100">{getFinalVal(co.co_number, "pso", p)}</td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                                <td className="px-3 py-3 font-black text-indigo-900 border-r border-indigo-200">AVERAGE</td>
                                {poCols.map(p => (
                                    <td key={p} className="px-2 py-3 text-center font-black text-indigo-700">{getColAvg("po", p)}</td>
                                ))}
                                {psoCols.map(p => (
                                    <td key={p} className="px-2 py-3 text-center font-black text-purple-700 border-l border-indigo-200">{getColAvg("pso", p)}</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 flex justify-end print:hidden">
                    <button onClick={() => window.print()} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors">
                        🖨️ Print Final Report
                    </button>
                </div>
            </div>
        </>
    );
}
