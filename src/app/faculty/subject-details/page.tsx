"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";

export default function FacultySubjectDetailsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [loading, setLoading] = useState(false);

    // Data
    const [subjectInfo, setSubjectInfo] = useState<any>(null);
    const [cos, setCos] = useState<any[]>([]);
    const [poMapping, setPoMapping] = useState<any[]>([]);
    const [psoMapping, setPsoMapping] = useState<any[]>([]);
    const [studentMarks, setStudentMarks] = useState<any[]>([]);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        const user = await getTestUser("FACULTY");
        if (!user) {
            const { data } = await supabase.from("subjects").select("id, name, code").order("name");
            setSubjects(data || []);
            return;
        }
        const { data } = await supabase
            .from("faculty_subjects")
            .select("subject:subjects(id, name, code)")
            .eq("faculty_id", user.id);
        let list = data?.map((d: any) => d.subject).filter(Boolean) || [];
        if (list.length === 0) {
            const { data: all } = await supabase.from("subjects").select("id, name, code").order("name");
            list = all || [];
        }
        setSubjects(list);
    };

    const loadSubjectData = useCallback(async (subjectId: string) => {
        if (!subjectId) return;
        setLoading(true);
        setSelectedSubject(subjectId);

        try {
            // Fetch all data in parallel
            const [subjectRes, cosRes, poRes, psoRes, marksRes] = await Promise.all([
                supabase.from("subjects").select("*").eq("id", subjectId).single(),
                supabase.from("course_outcomes").select("*").eq("subject_id", subjectId).order("co_number"),
                supabase.from("co_po_mapping").select("*").eq("subject_id", subjectId).order("co_number"),
                supabase.from("co_pso_mapping").select("*").eq("subject_id", subjectId).order("co_number"),
                supabase.from("student_co_marks").select("*, users(name, register_no)").eq("subject_id", subjectId),
            ]);

            setSubjectInfo(subjectRes.data);
            setCos(cosRes.data || []);
            setPoMapping(poRes.data || []);
            setPsoMapping(psoRes.data || []);

            // Group marks by student
            const marksData = marksRes.data || [];
            const grouped: Record<string, any> = {};
            marksData.forEach((m: any) => {
                if (!grouped[m.student_id]) {
                    grouped[m.student_id] = {
                        student_id: m.student_id,
                        name: m.users?.name || "Unknown",
                        register_no: m.users?.register_no || "—",
                        marks: {},
                    };
                }
                grouped[m.student_id].marks[m.co_number] = m.marks;
            });
            setStudentMarks(Object.values(grouped));
        } catch (err) {
            console.error("Error loading subject data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Build mapping matrix
    const PO_COUNT = 12;
    const PSO_COUNT = 3;
    const getMapVal = (coNum: number, type: "po" | "pso", num: number) => {
        if (type === "po") {
            const m = poMapping.find(r => r.co_number === coNum && r.po_number === num);
            return m ? m.mapping_value : 0;
        } else {
            const m = psoMapping.find(r => r.co_number === coNum && r.pso_number === num);
            return m ? m.mapping_value : 0;
        }
    };

    const valColor = (v: number) =>
        v === 0 ? "text-slate-300" :
            v === 1 ? "text-blue-600 bg-blue-50" :
                v === 2 ? "text-orange-600 bg-orange-50" :
                    "text-green-600 bg-green-50";

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Subject Details</h1>
                <p className="text-slate-500">View CO table, CO-PO mapping, and student marks</p>
            </div>

            {/* Subject Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Select Subject</label>
                <select value={selectedSubject} onChange={e => loadSubjectData(e.target.value)}
                    className="w-full max-w-md px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">— Select Subject —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </select>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {!loading && selectedSubject && subjectInfo && (
                <>
                    {/* Subject Info */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
                        <h2 className="text-xl font-bold">{subjectInfo.name}</h2>
                        <p className="text-white/80 mt-1">Code: {subjectInfo.code} · Semester: {subjectInfo.semester} · Year: {subjectInfo.year}</p>
                    </div>

                    {/* ═══ Section 1: CO Table ═══ */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">🎯</span> Section 1 — Course Outcomes
                        </h2>
                        {cos.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No COs defined for this subject.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-800 text-white">
                                            <th className="px-4 py-3 text-left">CO</th>
                                            <th className="px-4 py-3 text-left">Description</th>
                                            <th className="px-4 py-3 text-center">Cutoff Mark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cos.map(co => (
                                            <tr key={co.co_number} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-bold text-sm">CO{co.co_number}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">{co.description}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800">{co.cutoff_mark ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ═══ Section 2: CO-PO Mapping ═══ */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">🗺️</span> Section 2 — CO–PO–PSO Mapping
                        </h2>
                        {cos.length === 0 || (poMapping.length === 0 && psoMapping.length === 0) ? (
                            <p className="text-slate-400 text-center py-8">No mapping data available.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="text-xs min-w-full">
                                    <thead>
                                        <tr className="bg-slate-800 text-white">
                                            <th className="px-3 py-3 text-left font-bold">CO</th>
                                            {Array.from({ length: PO_COUNT }, (_, i) => (
                                                <th key={i} className="px-2 py-2 text-center font-semibold min-w-[40px]">PO{i + 1}</th>
                                            ))}
                                            {Array.from({ length: PSO_COUNT }, (_, i) => (
                                                <th key={i} className="px-2 py-2 text-center font-semibold text-yellow-300 border-l border-slate-600 min-w-[40px]">PSO{i + 1}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cos.map((co, idx) => (
                                            <tr key={co.co_number} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                <td className="px-3 py-2 font-bold text-indigo-700">CO{co.co_number}</td>
                                                {Array.from({ length: PO_COUNT }, (_, i) => {
                                                    const v = getMapVal(co.co_number, "po", i + 1);
                                                    return <td key={i} className={`px-2 py-2 text-center font-bold ${valColor(v)}`}>{v === 0 ? "-" : v}</td>;
                                                })}
                                                {Array.from({ length: PSO_COUNT }, (_, i) => {
                                                    const v = getMapVal(co.co_number, "pso", i + 1);
                                                    return <td key={i} className={`px-2 py-2 text-center font-bold border-l border-slate-100 ${valColor(v)}`}>{v === 0 ? "-" : v}</td>;
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                            <span className="font-semibold">Legend:</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">- = No Correlation</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">1 = Low</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-bold">2 = Medium</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">3 = High</span>
                        </div>
                    </div>

                    {/* ═══ Section 3: Student Marks ═══ */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📝</span> Section 3 — Student Marks
                        </h2>
                        {studentMarks.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No marks entered yet. Use &quot;Enter Marks&quot; to add student marks.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-800 text-white">
                                            <th className="px-4 py-3 text-left">Reg. No</th>
                                            <th className="px-4 py-3 text-left">Student Name</th>
                                            {cos.map(co => (
                                                <th key={co.co_number} className="px-3 py-3 text-center">
                                                    CO{co.co_number}
                                                    <div className="text-xs font-normal text-slate-300">Cutoff: {co.cutoff_mark ?? 0}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentMarks.map((s, idx) => (
                                            <tr key={s.student_id} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                                                <td className="px-4 py-2.5 text-sm text-slate-500 font-mono">{s.register_no}</td>
                                                <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                                                {cos.map(co => {
                                                    const mark = s.marks[co.co_number];
                                                    const cutoff = co.cutoff_mark ?? 0;
                                                    const passed = mark !== undefined && mark >= cutoff;
                                                    return (
                                                        <td key={co.co_number} className="px-3 py-2.5 text-center">
                                                            {mark !== undefined ? (
                                                                <span className={`px-2 py-1 rounded font-bold text-sm ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                                    {mark}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
