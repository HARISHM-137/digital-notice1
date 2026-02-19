"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SubjectDetail {
    id: string; name: string; code: string; semester: number; credits: number;
    programs?: { id: string; name: string; code: string };
}
interface CO { id: string; co_number: number; description: string; target_attainment: number; }
interface PO { id: string; po_number: number; description: string; }
interface Mapping { id: string; co_id: string; po_id: string; correlation_level: number; }

export default function SubjectDetailPage() {
    const params = useParams();
    const subjectId = params.id as string;

    const [subject, setSubject] = useState<SubjectDetail | null>(null);
    const [cos, setCOs] = useState<CO[]>([]);
    const [pos, setPOs] = useState<PO[]>([]);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // CO form
    const [showCOModal, setShowCOModal] = useState(false);
    const [editingCO, setEditingCO] = useState<CO | null>(null);
    const [coForm, setCOForm] = useState({ co_number: 1, description: "", target_attainment: 0.6 });

    // Subject edit
    const [editingSubject, setEditingSubject] = useState(false);
    const [subjForm, setSubjForm] = useState({ name: "", code: "", semester: 2, credits: 3 });

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/subjects/${subjectId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSubject(data.subject);
            setCOs(data.course_outcomes);
            setPOs(data.program_outcomes);
            setMappings(data.co_po_mapping);
            setSubjForm({
                name: data.subject.name,
                code: data.subject.code,
                semester: data.subject.semester,
                credits: data.subject.credits,
            });
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
            setCOForm({ co_number: 1, description: "", target_attainment: 0.6 });
            fetchData();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Save failed");
        } finally { setSaving(false); }
    };

    const handleCODelete = async (id: string) => {
        if (!confirm("Delete this Course Outcome? All mappings for this CO will also be removed.")) return;
        try {
            await fetch(`/api/course-outcomes?id=${id}`, { method: "DELETE" });
            fetchData();
        } catch { setError("Delete failed"); }
    };

    const handleMappingClick = async (coId: string, poId: string, currentLevel: number) => {
        const newLevel = currentLevel >= 3 ? 0 : currentLevel + 1;
        try {
            if (newLevel === 0) {
                const mapping = mappings.find(m => m.co_id === coId && m.po_id === poId);
                if (mapping) {
                    await fetch(`/api/co-po-mapping?id=${mapping.id}`, { method: "DELETE" });
                }
            } else {
                await fetch("/api/co-po-mapping", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ co_id: coId, po_id: poId, correlation_level: newLevel }),
                });
            }
            fetchData();
        } catch { setError("Mapping update failed"); }
    };

    const correlationColor = (level: number) => {
        switch (level) {
            case 3: return "bg-emerald-500 text-white";
            case 2: return "bg-yellow-400 text-slate-900";
            case 1: return "bg-orange-300 text-slate-900";
            default: return "bg-slate-100 text-slate-400";
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!subject) return (
        <div className="text-center py-12">
            <p className="text-red-600">{error || "Subject not found"}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

            {/* Subject Info */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Subject Information</h2>
                    <Button size="sm" variant={editingSubject ? "danger" : "outline"} onClick={() => setEditingSubject(!editingSubject)}>
                        {editingSubject ? "Cancel" : "Edit"}
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
                        <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase">Semester</p><p className="font-semibold text-slate-800 mt-1">Sem {subject.semester}</p></div>
                        <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase">Credits</p><p className="font-semibold text-slate-800 mt-1">{subject.credits}</p></div>
                    </div>
                )}
            </Card>

            {/* Course Outcomes */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Course Outcomes ({cos.length})</h3>
                    <Button size="sm" onClick={() => { setEditingCO(null); setCOForm({ co_number: cos.length + 1, description: "", target_attainment: 0.6 }); setShowCOModal(true); }}>+ Add CO</Button>
                </div>
                <div className="space-y-2">
                    {cos.map(co => (
                        <div key={co.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg group">
                            <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700 flex-shrink-0">CO{co.co_number}</span>
                            <p className="text-sm text-slate-700 flex-1">{co.description}</p>
                            <span className="text-xs text-slate-400">Target: {(co.target_attainment * 100).toFixed(0)}%</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingCO(co); setCOForm({ co_number: co.co_number, description: co.description, target_attainment: co.target_attainment }); setShowCOModal(true); }} className="text-indigo-600 text-xs font-medium">Edit</button>
                                <button onClick={() => handleCODelete(co.id)} className="text-red-600 text-xs font-medium">Del</button>
                            </div>
                        </div>
                    ))}
                    {cos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No course outcomes defined yet</p>}
                </div>
            </Card>

            {/* CO-PO Mapping Matrix */}
            {cos.length > 0 && pos.length > 0 && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">CO-PO Mapping Matrix</h3>
                    <p className="text-xs text-slate-500 mb-4">Click cells to cycle: None → 1 (Low) → 2 (Medium) → 3 (High) → None</p>
                    <div className="flex items-center gap-4 mb-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> 3 – High</span>
                        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-400 inline-block"></span> 2 – Medium</span>
                        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-300 inline-block"></span> 1 – Low</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left bg-slate-50">CO / PO</th>
                                    {pos.map(po => (
                                        <th key={po.id} className="px-3 py-2 text-center bg-slate-50 text-xs font-bold">PO{po.po_number}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cos.map(co => (
                                    <tr key={co.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2 font-bold text-xs">CO{co.co_number}</td>
                                        {pos.map(po => {
                                            const mapping = mappings.find(m => m.co_id === co.id && m.po_id === po.id);
                                            const level = mapping?.correlation_level || 0;
                                            return (
                                                <td key={po.id} className="px-1 py-1 text-center">
                                                    <button
                                                        onClick={() => handleMappingClick(co.id, po.id, level)}
                                                        className={`inline-flex w-8 h-8 items-center justify-center rounded text-xs font-bold cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all ${correlationColor(level)}`}
                                                    >
                                                        {level || "-"}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Program Outcomes (read-only) */}
            <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Program Outcomes ({pos.length})</h3>
                <div className="space-y-2">
                    {pos.map(po => (
                        <div key={po.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 flex-shrink-0">PO{po.po_number}</span>
                            <p className="text-sm text-slate-700">{po.description}</p>
                        </div>
                    ))}
                </div>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Target %</label>
                                    <input type="number" min={0} max={1} step={0.05} value={coForm.target_attainment} onChange={e => setCOForm({ ...coForm, target_attainment: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
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
