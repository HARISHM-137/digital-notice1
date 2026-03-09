"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SubjectDetailsPage() {
    const params = useParams();
    const subjectId = params.id as string;

    const [subject, setSubject] = useState<any>(null);
    const [cos, setCOs] = useState<any[]>([]);

    // Mappings
    const [mapping, setMapping] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(true);
    const [showTable, setShowTable] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const PO_COUNT = 12;
    const PSO_COUNT = 3;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch subject
            const { data: subj } = await supabase.from("subjects").select("*").eq("id", subjectId).single();
            setSubject(subj);

            // Fetch COs
            const { data: coData } = await supabase.from("course_outcomes").select("*").eq("subject_id", subjectId).order("co_number");
            setCOs(coData || []);

            // Fetch CO-PO mapping
            const { data: poMap } = await supabase.from("co_po_mapping").select("co_number, po_number, mapping_value").eq("subject_id", subjectId).gt("mapping_value", 0);

            // Fetch CO-PSO mapping
            const { data: psoMap } = await supabase.from("co_pso_mapping").select("co_number, pso_number, mapping_value").eq("subject_id", subjectId).gt("mapping_value", 0);

            // Build dictionary
            const m: Record<string, number> = {};
            (poMap || []).forEach(r => m[`co${r.co_number}_po${r.po_number}`] = r.mapping_value);
            (psoMap || []).forEach(r => m[`co${r.co_number}_pso${r.pso_number}`] = r.mapping_value);

            setMapping(m);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        if (subjectId) fetchData();
    }, [subjectId, fetchData]);

    const getMapping = (coNum: number, type: "po" | "pso", num: number) => {
        return mapping[`co${coNum}_${type}${num}`] || 0;
    };

    const setMappingVal = (coNum: number, type: "po" | "pso", num: number, val: number) => {
        setMapping(prev => ({ ...prev, [`co${coNum}_${type}${num}`]: val }));
    };

    const saveMapping = async () => {
        setIsSaving(true);
        try {
            const poRows: any[] = [];
            const psoRows: any[] = [];

            cos.forEach(co => {
                for (let po = 1; po <= PO_COUNT; po++) {
                    const val = getMapping(co.co_number, "po", po);
                    if (val > 0) poRows.push({ subject_id: subjectId, co_number: co.co_number, po_number: po, mapping_value: val });
                }
                for (let pso = 1; pso <= PSO_COUNT; pso++) {
                    const val = getMapping(co.co_number, "pso", pso);
                    if (val > 0) psoRows.push({ subject_id: subjectId, co_number: co.co_number, pso_number: pso, mapping_value: val });
                }
            });

            // Delete old mapping then insert new
            await supabase.from("co_po_mapping").delete().eq("subject_id", subjectId);
            await supabase.from("co_pso_mapping").delete().eq("subject_id", subjectId);

            if (poRows.length > 0) await supabase.from("co_po_mapping").insert(poRows);
            if (psoRows.length > 0) await supabase.from("co_pso_mapping").insert(psoRows);

            alert("Mapping saved successfully!");
            setIsEditing(false);
            fetchData();
        } catch (err: any) {
            alert("Error saving: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const cellColor = (val: number) =>
        val === 0 ? "bg-slate-50 border-slate-200 text-slate-400"
            : val === 1 ? "bg-blue-50 border-blue-300 text-blue-700"
                : val === 2 ? "bg-orange-50 border-orange-300 text-orange-700"
                    : "bg-emerald-50 border-emerald-300 text-emerald-700";

    const displayColor = (val: number) =>
        val === 0 ? "bg-slate-100 text-slate-400"
            : val === 1 ? "bg-blue-100 text-blue-700"
                : val === 2 ? "bg-orange-100 text-orange-700"
                    : "bg-emerald-100 text-emerald-700";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-500">Loading subject details...</p>
                </div>
            </div>
        );
    }

    if (!subject) {
        return (
            <Card>
                <div className="text-center py-12 text-slate-500">
                    <p className="text-lg font-medium">Subject not found</p>
                    <a href="/faculty/subjects" className="text-indigo-600 hover:underline mt-2 inline-block">← Back to Subjects</a>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <a href="/faculty/subjects" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Subjects
            </a>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <h2 className="text-xl font-bold text-slate-900 pb-2 border-b border-slate-100">📋 Subject Information</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Name</p>
                        <p className="font-bold text-slate-800 mt-1 text-lg">{subject.name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Code</p>
                        <p className="font-bold text-slate-800 mt-1 text-lg">{subject.code}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Semester</p>
                        <p className="font-bold text-slate-800 mt-1 text-lg">{subject.semester}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Credits</p>
                        <p className="font-bold text-slate-800 mt-1 text-lg">{subject.credits}</p>
                    </div>
                </div>
            </div>

            {cos.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-2xl">🎯</span> Course Outcomes
                    </h2>
                    <div className="space-y-3">
                        {cos.map((co: any) => (
                            <div key={co.id} className="flex items-start gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                <span className="px-3 py-1.5 text-sm font-black rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0 shadow-sm">CO{co.co_number}</span>
                                <div>
                                    <p className="text-base text-slate-800 font-medium leading-relaxed">{co.description}</p>
                                    <div className="flex gap-4 mt-2">
                                        <p className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Max Marks: {co.max_marks || 20}</p>
                                        <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">Cutoff: {co.cutoff_mark || 12}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={`bg-white rounded-2xl shadow-sm border ${isEditing ? 'border-purple-300 ring-4 ring-purple-50' : 'border-slate-200'} p-6 transition-all`}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="text-2xl">🗺️</span> CO-PO-PSO Mapping
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            0/- = No Correlation · 1 = Low · 2 = Medium · 3 = High
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {!showTable ? (
                            <button onClick={() => setShowTable(true)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center gap-2 rounded-xl transition-colors">
                                📊 Show Table
                            </button>
                        ) : isEditing ? (
                            <>
                                <button onClick={() => { setIsEditing(false); fetchData(); }} className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl">Cancel</button>
                                <button onClick={saveMapping} disabled={isSaving} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md">
                                    {isSaving ? "Saving..." : "💾 Save Changes"}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setShowTable(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 font-semibold rounded-xl transition-colors">Hide Table</button>
                                <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold flex items-center gap-2 rounded-xl transition-colors border border-purple-200">
                                    ✏️ Edit Mapping
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {showTable && cos.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
                        <table className="text-xs w-full">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th rowSpan={2} className="px-3 py-3 text-left border-r border-slate-600 sticky left-0 bg-slate-800 z-10 w-16">CO's</th>
                                    <th colSpan={PO_COUNT} className="px-2 py-2 text-center border-r border-slate-600 font-bold uppercase tracking-wider">PO's</th>
                                    <th colSpan={PSO_COUNT} className="px-2 py-2 text-center font-bold uppercase tracking-wider">PSO's</th>
                                </tr>
                                <tr className="bg-slate-700 text-white shadow-sm">
                                    <th className="sticky left-0 bg-slate-700 z-10 p-0 border-r border-slate-600"></th>
                                    {Array.from({ length: PO_COUNT }, (_, i) => i + 1).map(po => <th key={po} className="px-2 py-2 font-bold min-w-[48px] border-r border-slate-600/30">{po}</th>)}
                                    {Array.from({ length: PSO_COUNT }, (_, i) => i + 1).map(pso => <th key={pso} className="px-2 py-2 font-bold text-yellow-300 min-w-[48px] border-l border-slate-600">{pso}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {cos.map((co, idx) => (
                                    <tr key={co.co_number} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-indigo-50/30 transition-colors`}>
                                        <td className="px-3 py-2.5 font-black text-indigo-700 border-r border-slate-200 sticky left-0 bg-inherit z-10 text-center shadow-[1px_0_0_0_#e2e8f0]">
                                            {co.co_number}
                                        </td>
                                        {Array.from({ length: PO_COUNT }, (_, i) => i + 1).map(po => {
                                            const val = getMapping(co.co_number, "po", po);
                                            return (
                                                <td key={po} className="px-1 py-1.5 text-center">
                                                    {isEditing ? (
                                                        <select value={val} onChange={e => setMappingVal(co.co_number, "po", po, +e.target.value)}
                                                            className={`w-12 h-8 rounded border text-center text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-purple-400 ${cellColor(val)}`}>
                                                            <option value={0}>-</option>
                                                            <option value={1}>1</option>
                                                            <option value={2}>2</option>
                                                            <option value={3}>3</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg text-sm font-bold shadow-sm ${displayColor(val)}`}>
                                                            {val || "-"}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        {Array.from({ length: PSO_COUNT }, (_, i) => i + 1).map(pso => {
                                            const val = getMapping(co.co_number, "pso", pso);
                                            return (
                                                <td key={pso} className="px-1 py-1.5 text-center border-l-2 border-slate-100">
                                                    {isEditing ? (
                                                        <select value={val} onChange={e => setMappingVal(co.co_number, "pso", pso, +e.target.value)}
                                                            className={`w-12 h-8 rounded border text-center text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-purple-400 ${cellColor(val)}`}>
                                                            <option value={0}>-</option>
                                                            <option value={1}>1</option>
                                                            <option value={2}>2</option>
                                                            <option value={3}>3</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg text-sm font-bold shadow-sm ${displayColor(val)}`}>
                                                            {val || "-"}
                                                        </span>
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
        </div>
    );
}
