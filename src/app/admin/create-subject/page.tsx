"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const PO_COUNT = 12;
const PSO_COUNT = 3;

interface CO {
    co_number: number;
    description: string;
    max_marks: number;
    cutoff_mark: number;
}

interface MappingGrid {
    [key: string]: number;
}

export default function CreateSubjectPage() {
    const router = useRouter();
    const [departments, setDepartments] = useState<any[]>([]);
    const [facultyList, setFacultyList] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Subject data — no program_id
    const [subjectData, setSubjectData] = useState({
        name: "",
        code: "",
        department_id: "",
        semester: 2,
        year: 1,
        credits: 3,
        academic_year: "2025-26",
        faculty_id: "",
        lab_max_marks: 25,
        assignment_max_marks: 15,
    });

    // COs with max_marks + cutoff
    const [cos, setCos] = useState<CO[]>([
        { co_number: 1, description: "CO1", max_marks: 20, cutoff_mark: 12 },
        { co_number: 2, description: "CO2", max_marks: 20, cutoff_mark: 12 },
        { co_number: 3, description: "CO3", max_marks: 20, cutoff_mark: 12 },
        { co_number: 4, description: "CO4", max_marks: 20, cutoff_mark: 12 },
        { co_number: 5, description: "CO5", max_marks: 20, cutoff_mark: 12 },
    ]);

    const [mapping, setMapping] = useState<MappingGrid>({});

    useEffect(() => {
        Promise.all([
            supabase.from("departments").select("id, name, code").order("name"),
            supabase.from("users").select("id, name, email, department_id").eq("role", "FACULTY").order("name"),
        ]).then(([deptRes, facRes]) => {
            setDepartments(deptRes.data || []);
            setFacultyList(facRes.data || []);
        });
    }, []);

    const getMapping = (coNum: number, type: "po" | "pso", num: number) => {
        return mapping[`co${coNum}_${type}${num}`] ?? 0;
    };

    const setMappingVal = (coNum: number, type: "po" | "pso", num: number, val: number) => {
        setMapping(prev => ({ ...prev, [`co${coNum}_${type}${num}`]: val }));
    };

    const addCO = () => {
        const n = cos.length + 1;
        setCos([...cos, { co_number: n, description: `CO${n}`, max_marks: 20, cutoff_mark: 12 }]);
    };

    const removeCO = (idx: number) => {
        if (cos.length <= 1) return;
        setCos(cos.filter((_, i) => i !== idx).map((co, i) => ({ ...co, co_number: i + 1 })));
    };

    const handleSubmit = async () => {
        if (!subjectData.name.trim()) { setError("Subject name is required."); return; }
        if (!subjectData.code.trim()) { setError("Subject code is required."); return; }
        for (const co of cos) {
            if (co.max_marks <= 0) { setError(`Set max marks for CO${co.co_number}.`); return; }
            if (co.cutoff_mark <= 0) { setError(`Set cutoff mark for CO${co.co_number}.`); return; }
        }

        setIsSubmitting(true);
        setError("");
        try {
            const po_mapping: { co_number: number; po_number: number; mapping_value: number }[] = [];
            const pso_mapping: { co_number: number; pso_number: number; mapping_value: number }[] = [];

            cos.forEach(co => {
                for (let po = 1; po <= PO_COUNT; po++) {
                    const val = getMapping(co.co_number, "po", po);
                    if (val > 0) po_mapping.push({ co_number: co.co_number, po_number: po, mapping_value: val });
                }
                for (let pso = 1; pso <= PSO_COUNT; pso++) {
                    const val = getMapping(co.co_number, "pso", pso);
                    if (val > 0) pso_mapping.push({ co_number: co.co_number, pso_number: pso, mapping_value: val });
                }
            });

            const res = await fetch("/api/create-subject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...subjectData,
                    code: subjectData.code.toUpperCase(),
                    cos,
                    po_mapping,
                    pso_mapping,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create subject");

            setSuccessMsg(`✅ Subject "${subjectData.name}" created! ${data.enrolled_students || 0} students auto-enrolled.`);
            setTimeout(() => router.push("/admin/subjects"), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredFaculty = subjectData.department_id
        ? facultyList.filter(f => f.department_id === subjectData.department_id)
        : facultyList;

    const cellColor = (val: number) =>
        val === 0 ? "bg-gray-50 border-slate-200 text-slate-400"
            : val === 1 ? "bg-blue-50 border-blue-300 text-blue-700"
                : val === 2 ? "bg-orange-50 border-orange-300 text-orange-700"
                    : "bg-green-50 border-green-300 text-green-700";

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Create Subject</h1>
                <p className="text-slate-500">Subject details → COs with max/cutoff marks → CO–PO–PSO mapping</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start gap-2"><span className="text-red-500 text-lg">⚠</span> {error}</div>}
            {successMsg && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm font-semibold">{successMsg}</div>}

            {/* ═══════ SECTION 1: Subject Details ═══════ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="text-xl">📋</span> Section 1 — Subject Details
                </h2>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Subject Name *</label>
                        <input type="text" value={subjectData.name} placeholder="e.g. Data Structures"
                            onChange={e => setSubjectData({ ...subjectData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Subject Code *</label>
                        <input type="text" value={subjectData.code} placeholder="e.g. CS301"
                            onChange={e => setSubjectData({ ...subjectData, code: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                        <select value={subjectData.department_id} onChange={e => setSubjectData({ ...subjectData, department_id: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">— Select —</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Semester</label>
                        <select value={subjectData.semester} onChange={e => setSubjectData({ ...subjectData, semester: +e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Faculty Assigned</label>
                        <select value={subjectData.faculty_id} onChange={e => setSubjectData({ ...subjectData, faculty_id: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">— Select Faculty —</option>
                            {filteredFaculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.email})</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ═══════ SECTION 2: COs with Max Marks & Cutoff ═══════ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-xl">🎯</span> Section 2 — Course Outcomes
                    </h2>
                    <button onClick={addCO} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                        <span className="text-lg leading-none">+</span> Add CO
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600 w-16">CO</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">Description</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-slate-600 w-32">Max Marks</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-slate-600 w-32">Cutoff</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cos.map((co, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">CO{co.co_number}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input type="text" value={co.description} placeholder={`Describe CO${co.co_number}...`}
                                            onChange={e => setCos(cos.map((c, i) => i === idx ? { ...c, description: e.target.value } : c))}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input type="number" min={1} max={100} value={co.max_marks}
                                            onChange={e => setCos(cos.map((c, i) => i === idx ? { ...c, max_marks: +e.target.value } : c))}
                                            className="w-20 mx-auto px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input type="number" min={0} max={100} value={co.cutoff_mark}
                                            onChange={e => setCos(cos.map((c, i) => i === idx ? { ...c, cutoff_mark: +e.target.value } : c))}
                                            className="w-20 mx-auto px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {cos.length > 1 && (
                                            <button onClick={() => removeCO(idx)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Lab & Assignment Max Marks */}
                <div className="grid grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">🔬 Lab Maximum Marks</label>
                        <input type="number" min={0} max={100} value={subjectData.lab_max_marks}
                            onChange={e => setSubjectData({ ...subjectData, lab_max_marks: +e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">📝 Assignment Maximum Marks</label>
                        <input type="number" min={0} max={100} value={subjectData.assignment_max_marks}
                            onChange={e => setSubjectData({ ...subjectData, assignment_max_marks: +e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-700 text-sm">
                    💡 <b>Max Marks</b> = maximum score per CO. <b>Cutoff</b> = minimum for attainment. Lab/Assignment are entered separately during marks entry.
                </div>
            </div>

            {/* ═══════ SECTION 3: CO-PO-PSO Mapping ═══════ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <div className="pb-2 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-xl">🗺️</span> Section 3 — CO–PO–PSO Mapping
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        <b className="text-slate-700">-</b> = No Correlation &nbsp;·&nbsp;
                        <b className="text-blue-600">1</b> = Low &nbsp;·&nbsp;
                        <b className="text-orange-600">2</b> = Medium &nbsp;·&nbsp;
                        <b className="text-green-600">3</b> = High
                    </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="text-xs min-w-full">
                        <thead>
                            <tr className="bg-slate-800 text-white">
                                <th className="px-3 py-3 text-left font-bold sticky left-0 bg-slate-800 z-10 w-16">CO&apos;s</th>
                                <th colSpan={PO_COUNT} className="px-2 py-2 text-center font-bold border-l border-slate-600">PO&apos;s</th>
                                <th colSpan={PSO_COUNT} className="px-2 py-2 text-center font-bold border-l border-slate-600">PSO&apos;s</th>
                            </tr>
                            <tr className="bg-slate-700 text-white text-center">
                                <th className="px-3 py-2 sticky left-0 bg-slate-700 z-10"></th>
                                {Array.from({ length: PO_COUNT }, (_, i) => (
                                    <th key={i} className="px-2 py-2 min-w-[48px] font-semibold text-slate-200">{i + 1}</th>
                                ))}
                                {Array.from({ length: PSO_COUNT }, (_, i) => (
                                    <th key={i} className="px-2 py-2 min-w-[48px] font-semibold text-yellow-300 border-l border-slate-600">{i + 1}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cos.map((co) => (
                                <tr key={co.co_number} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-bold text-indigo-700 text-center border-r border-slate-200">
                                        <span className="inline-block px-2 py-1 bg-indigo-100 rounded font-bold">{co.co_number}</span>
                                    </td>
                                    {Array.from({ length: PO_COUNT }, (_, i) => i + 1).map(po => {
                                        const val = getMapping(co.co_number, "po", po);
                                        return (
                                            <td key={po} className="px-1 py-2 text-center">
                                                <select value={val} onChange={e => setMappingVal(co.co_number, "po", po, +e.target.value)}
                                                    className={`w-12 px-1 py-1.5 rounded border text-center text-xs font-bold outline-none cursor-pointer transition-all ${cellColor(val)}`}>
                                                    <option value={0}>-</option>
                                                    <option value={1}>1</option>
                                                    <option value={2}>2</option>
                                                    <option value={3}>3</option>
                                                </select>
                                            </td>
                                        );
                                    })}
                                    {Array.from({ length: PSO_COUNT }, (_, i) => i + 1).map(pso => {
                                        const val = getMapping(co.co_number, "pso", pso);
                                        return (
                                            <td key={pso} className="px-1 py-2 text-center border-l border-slate-100">
                                                <select value={val} onChange={e => setMappingVal(co.co_number, "pso", pso, +e.target.value)}
                                                    className={`w-12 px-1 py-1.5 rounded border text-center text-xs font-bold outline-none cursor-pointer transition-all ${cellColor(val)}`}>
                                                    <option value={0}>-</option>
                                                    <option value={1}>1</option>
                                                    <option value={2}>2</option>
                                                    <option value={3}>3</option>
                                                </select>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                    <span className="font-semibold">Legend:</span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-slate-500">- = No Correlation</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">1 = Low</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-bold">2 = Medium</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">3 = High</span>
                </div>
            </div>

            {/* ═══════ SUBMIT ═══════ */}
            <div className="flex justify-end gap-4 pb-8">
                <button onClick={() => router.push("/admin/subjects")}
                    className="px-6 py-3 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting}
                    className="px-10 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? "Creating Subject..." : "✓ Create Subject"}
                </button>
            </div>
        </div>
    );
}
