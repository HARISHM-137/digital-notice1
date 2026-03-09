"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SubjectDetailPage() {
    const params = useParams();
    const subjectId = params.id as string;

    const [subject, setSubject] = useState<any>(null);
    const [cos, setCOs] = useState<any[]>([]);
    const [poMapping, setPoMapping] = useState<any[]>([]);
    const [psoMapping, setPsoMapping] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showTable, setShowTable] = useState(false);
    const [saving, setSaving] = useState(false);

    // CO form
    const [showCOModal, setShowCOModal] = useState(false);
    const [editingCO, setEditingCO] = useState<any>(null);
    const [coForm, setCOForm] = useState({ co_number: 1, description: "", cutoff_mark: 12 });

    // Subject edit
    const [editingSubject, setEditingSubject] = useState(false);
    const [subjForm, setSubjForm] = useState({ name: "", code: "", semester: 2, credits: 3 });

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/subjects/${subjectId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSubject(data.subject);
            setCOs(data.course_outcomes || []);
            setSubjForm({
                name: data.subject.name,
                code: data.subject.code,
                semester: data.subject.semester,
                credits: data.subject.credits,
            });

            // Fetch CO-PO mapping using new subject_id-based schema
            const poRes = await fetch(`/api/co-po-mapping?subject_id=${subjectId}`);
            if (poRes.ok) {
                const poData = await poRes.json();
                setPoMapping(poData.po_mapping || []);
                setPsoMapping(poData.pso_mapping || []);
            } else {
                // Fallback: try direct supabase
                const { supabase } = await import("@/lib/supabaseClient");
                const { data: poMap } = await supabase
                    .from("co_po_mapping")
                    .select("co_number, po_number, mapping_value")
                    .eq("subject_id", subjectId)
                    .gt("mapping_value", 0);
                setPoMapping(poMap || []);
                const { data: psoMap } = await supabase
                    .from("co_pso_mapping")
                    .select("co_number, pso_number, mapping_value")
                    .eq("subject_id", subjectId)
                    .gt("mapping_value", 0);
                setPsoMapping(psoMap || []);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load subject");
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubjectSave = async () => {
        setSaving(true); setError(""); setSuccess("");
        try {
            const res = await fetch(`/api/subjects/${subjectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subjForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSubject(data.subject);
            setEditingSubject(false);
            setSuccess("Subject updated!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Update failed");
        } finally { setSaving(false); }
    };

    const handleCOSave = async () => {
        setSaving(true); setError("");
        try {
            const method = editingCO ? "PUT" : "POST";
            const body = editingCO
                ? { id: editingCO.id, ...coForm }
                : { subject_id: subjectId, ...coForm };

            const res = await fetch("/api/course-outcomes", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setShowCOModal(false);
            setEditingCO(null);
            setCOForm({ co_number: 1, description: "", cutoff_mark: 12 });
            fetchData();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Save failed");
        } finally { setSaving(false); }
    };

    const handleCODelete = async (id: string) => {
        if (!confirm("Delete this Course Outcome?")) return;
        try {
            await fetch(`/api/course-outcomes?id=${id}`, { method: "DELETE" });
            fetchData();
        } catch { setError("Delete failed"); }
    };

    const correlationColor = (level: number) => {
        switch (level) {
            case 3: return "bg-emerald-500 text-white";
            case 2: return "bg-yellow-400 text-slate-900";
            case 1: return "bg-orange-300 text-slate-900";
            default: return "bg-slate-100 text-slate-400";
        }
    };

    // Build the mapping table data
    const coNumbers = cos.length > 0
        ? cos.map((c: any) => c.co_number).sort((a: number, b: number) => a - b)
        : Array.from(new Set([...poMapping.map((m: any) => m.co_number), ...psoMapping.map((m: any) => m.co_number)])).sort((a: number, b: number) => a - b);
    const allPOs = poMapping.length > 0 ? Array.from({ length: 12 }, (_, i) => i + 1) : [];
    const psoNums = psoMapping.length > 0 ? Array.from(new Set(psoMapping.map((m: any) => m.pso_number))).sort((a: number, b: number) => a - b) : [];
    const allPSOs = psoNums.length > 0 ? Array.from({ length: Math.max(...psoNums, 2) }, (_, i) => i + 1) : [];

    const getMapVal = (coNum: number, poNum: number): number => {
        const m = poMapping.find((x: any) => x.co_number === coNum && x.po_number === poNum);
        return m?.mapping_value || 0;
    };
    const getPsoMapVal = (coNum: number, psoNum: number): number => {
        const m = psoMapping.find((x: any) => x.co_number === coNum && x.pso_number === psoNum);
        return m?.mapping_value || 0;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!subject) return (
        <div className="text-center py-12">
            <p className="text-red-600">{error || "Subject not found"}</p>
            <a href="/admin/subjects" className="text-indigo-600 hover:underline mt-2 inline-block">← Back to Subjects</a>
        </div>
    );

    return (
        <div className="space-y-6">
            <a href="/admin/subjects" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Subjects
            </a>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

            {/* Subject Info */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg font-bold">S</span>
                        Subject Information
                    </h2>
                    <Button size="sm" variant={editingSubject ? "danger" : "outline"} onClick={() => setEditingSubject(!editingSubject)}>
                        {editingSubject ? "Cancel" : "✏️ Edit"}
                    </Button>
                </div>
                {editingSubject ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input type="text" value={subjForm.name} onChange={e => setSubjForm({ ...subjForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                            <input type="text" value={subjForm.code} onChange={e => setSubjForm({ ...subjForm, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                            <select value={subjForm.semester} onChange={e => setSubjForm({ ...subjForm, semester: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                {[2, 4, 6, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Credits</label>
                            <input type="number" min={1} max={6} value={subjForm.credits} onChange={e => setSubjForm({ ...subjForm, credits: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div className="col-span-2">
                            <Button onClick={handleSubjectSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase">Name</p><p className="font-semibold text-slate-800 mt-1">{subject.name}</p></div>
                        <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase">Code</p><p className="font-semibold text-slate-800 mt-1">{subject.code}</p></div>
                        <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase">Semester</p><p className="font-semibold text-slate-800 mt-1">{subject.semester}</p></div>
                        <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase">Credits</p><p className="font-semibold text-slate-800 mt-1">{subject.credits}</p></div>
                    </div>
                )}
            </Card>

            {/* Course Outcomes */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm font-bold">CO</span>
                        Course Outcomes ({cos.length})
                    </h3>
                    <Button size="sm" onClick={() => { setEditingCO(null); setCOForm({ co_number: cos.length + 1, description: "", cutoff_mark: 12 }); setShowCOModal(true); }}>+ Add CO</Button>
                </div>
                <div className="space-y-2">
                    {cos.map((co: any) => (
                        <div key={co.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg group">
                            <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700 flex-shrink-0">CO{co.co_number}</span>
                            <div className="flex-1">
                                <p className="text-sm text-slate-700">{co.description}</p>
                                {co.cutoff_mark > 0 && <p className="text-xs text-slate-400 mt-1">Cutoff: {co.cutoff_mark}</p>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingCO(co); setCOForm({ co_number: co.co_number, description: co.description, cutoff_mark: co.cutoff_mark || 12 }); setShowCOModal(true); }} className="text-indigo-600 text-xs font-medium">Edit</button>
                                <button onClick={() => handleCODelete(co.id)} className="text-red-600 text-xs font-medium">Del</button>
                            </div>
                        </div>
                    ))}
                    {cos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No course outcomes defined yet</p>}
                </div>
            </Card>

            {/* CO-PO-PSO Mapping Table with Show/Hide */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-sm font-bold">M</span>
                        CO-PO-PSO Mapping Table
                    </h3>
                    <Button
                        size="sm"
                        variant={showTable ? "secondary" : "primary"}
                        onClick={() => setShowTable(!showTable)}
                    >
                        {showTable ? "Hide Table" : "📊 Show Table"}
                    </Button>
                </div>

                {showTable && (
                    <>
                        {(poMapping.length > 0 || psoMapping.length > 0) && coNumbers.length > 0 ? (
                            <div>
                                <p className="text-xs text-slate-500 mb-4">0 = No Correlation · 1 = Low · 2 = Medium · 3 = High</p>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="text-sm w-full">
                                        <thead>
                                            <tr className="bg-slate-700 text-white">
                                                <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-600 font-bold">CO&apos;s</th>
                                                {allPOs.length > 0 && <th colSpan={allPOs.length} className="px-2 py-2 text-center border-r border-slate-600 font-bold">PO&apos;s</th>}
                                                {allPSOs.length > 0 && <th colSpan={allPSOs.length} className="px-2 py-2 text-center font-bold">PSO&apos;s</th>}
                                            </tr>
                                            <tr className="bg-slate-600 text-white">
                                                {allPOs.map(po => (
                                                    <th key={`po-${po}`} className="px-2 py-2 text-center font-semibold min-w-[44px]">{po}</th>
                                                ))}
                                                {allPSOs.map(pso => (
                                                    <th key={`pso-${pso}`} className="px-2 py-2 text-center font-semibold text-yellow-300 border-l border-slate-500 min-w-[44px]">{pso}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {coNumbers.map((coNum: number, idx: number) => (
                                                <tr key={coNum} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-bold text-indigo-700 border-r border-slate-200">CO{coNum}</td>
                                                    {allPOs.map(po => {
                                                        const val = getMapVal(coNum, po);
                                                        return (
                                                            <td key={`${coNum}-po${po}`} className="px-1 py-1 text-center">
                                                                <span className={`inline-flex w-8 h-8 items-center justify-center rounded text-xs font-bold ${correlationColor(val)}`}>
                                                                    {val || "-"}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    {allPSOs.map(pso => {
                                                        const val = getPsoMapVal(coNum, pso);
                                                        return (
                                                            <td key={`${coNum}-pso${pso}`} className="px-1 py-1 text-center border-l border-slate-100">
                                                                <span className={`inline-flex w-8 h-8 items-center justify-center rounded text-xs font-bold ${correlationColor(val)}`}>
                                                                    {val || "-"}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs">
                                    <span className="text-slate-400">Legend:</span>
                                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-100 inline-block border"></span> – None</span>
                                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-300 inline-block"></span> 1 = Low</span>
                                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-400 inline-block"></span> 2 = Medium</span>
                                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> 3 = High</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 py-8">No CO-PO-PSO mapping found. Set mappings during subject creation.</p>
                        )}
                    </>
                )}
            </Card>

            {/* CO Modal */}
            {showCOModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                            <h2 className="text-xl font-bold">{editingCO ? "Edit Course Outcome" : "Add Course Outcome"}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CO Number</label>
                                    <input type="number" min={1} value={coForm.co_number} onChange={e => setCOForm({ ...coForm, co_number: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cutoff Mark</label>
                                    <input type="number" min={0} max={100} value={coForm.cutoff_mark} onChange={e => setCOForm({ ...coForm, cutoff_mark: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea rows={3} value={coForm.description} onChange={e => setCOForm({ ...coForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Course outcome description..." />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => { setShowCOModal(false); setEditingCO(null); }} className="flex-1">Cancel</Button>
                                <Button onClick={handleCOSave} disabled={saving} className="flex-1">{saving ? "Saving..." : "Save"}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
