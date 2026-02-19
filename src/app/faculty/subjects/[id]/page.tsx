"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SubjectData {
    id: string;
    name: string;
    code: string;
    semester: number;
    credits: number;
    program_id: string;
}

interface COData {
    id: string;
    co_number: number;
    description: string;
    target_attainment: number;
}

interface POData {
    id: string;
    po_number: number;
    description: string;
}

interface MappingData {
    id: string;
    co_id: string;
    po_id: string;
    correlation_level: number;
}

export default function SubjectDetailsPage() {
    const params = useParams();
    const subjectId = params.id as string;

    const [subject, setSubject] = useState<SubjectData | null>(null);
    const [cos, setCOs] = useState<COData[]>([]);
    const [pos, setPOs] = useState<POData[]>([]);
    const [mappings, setMappings] = useState<MappingData[]>([]);
    const [loading, setLoading] = useState(true);

    // Editing states
    const [editingSubject, setEditingSubject] = useState(false);
    const [editSubjectForm, setEditSubjectForm] = useState<SubjectData | null>(null);

    const [editingCOId, setEditingCOId] = useState<string | null>(null);
    const [editCOForm, setEditCOForm] = useState({ co_number: 0, description: "", target_attainment: 0.6 });

    const [addingCO, setAddingCO] = useState(false);
    const [newCO, setNewCO] = useState({ co_number: 0, description: "", target_attainment: 0.6 });

    const [editingPOId, setEditingPOId] = useState<string | null>(null);
    const [editPOForm, setEditPOForm] = useState({ po_number: 0, description: "" });

    const [addingPO, setAddingPO] = useState(false);
    const [newPO, setNewPO] = useState({ po_number: 0, description: "" });

    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectRes, cosRes, mappingsRes] = await Promise.all([
                supabase.from("subjects").select("*").eq("id", subjectId).single(),
                supabase.from("course_outcomes").select("*").eq("subject_id", subjectId).order("co_number"),
                supabase.from("co_po_mapping").select("*"),
            ]);

            if (subjectRes.error) throw subjectRes.error;
            setSubject(subjectRes.data);

            if (!cosRes.error) setCOs(cosRes.data || []);

            // Fetch POs for the subject's program
            if (subjectRes.data?.program_id) {
                const posRes = await supabase
                    .from("program_outcomes")
                    .select("*")
                    .eq("program_id", subjectRes.data.program_id)
                    .order("po_number");
                if (!posRes.error) setPOs(posRes.data || []);
            }

            // Filter mappings relevant to this subject's COs
            if (!mappingsRes.error && mappingsRes.data) {
                const coIds = (cosRes.data || []).map((c) => c.id);
                const relevantMappings = mappingsRes.data.filter((m: MappingData) => coIds.includes(m.co_id));
                setMappings(relevantMappings);
            }
        } catch (err) {
            console.error("Error fetching subject details:", err);
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        if (subjectId) fetchData();
    }, [subjectId, fetchData]);

    // ---------- Subject CRUD ----------
    const handleSaveSubject = async () => {
        if (!editSubjectForm) return;
        setSaving(true);
        const { error } = await supabase
            .from("subjects")
            .update({
                name: editSubjectForm.name,
                code: editSubjectForm.code,
                semester: editSubjectForm.semester,
                credits: editSubjectForm.credits,
            })
            .eq("id", subjectId);
        if (error) { alert("Failed to update subject: " + error.message); }
        else { setEditingSubject(false); fetchData(); }
        setSaving(false);
    };

    // ---------- CO CRUD ----------
    const handleSaveCO = async (id: string) => {
        setSaving(true);
        const { error } = await supabase
            .from("course_outcomes")
            .update({
                co_number: editCOForm.co_number,
                description: editCOForm.description,
                target_attainment: editCOForm.target_attainment,
            })
            .eq("id", id);
        if (error) alert("Failed: " + error.message);
        else { setEditingCOId(null); fetchData(); }
        setSaving(false);
    };

    const handleAddCO = async () => {
        setSaving(true);
        const { error } = await supabase.from("course_outcomes").insert({
            subject_id: subjectId,
            co_number: newCO.co_number,
            description: newCO.description,
            target_attainment: newCO.target_attainment,
        });
        if (error) alert("Failed: " + error.message);
        else { setAddingCO(false); setNewCO({ co_number: 0, description: "", target_attainment: 0.6 }); fetchData(); }
        setSaving(false);
    };

    const handleDeleteCO = async (id: string) => {
        if (!confirm("Delete this Course Outcome? This will also remove related mappings.")) return;
        const { error } = await supabase.from("course_outcomes").delete().eq("id", id);
        if (error) alert("Failed: " + error.message);
        else fetchData();
    };

    // ---------- PO CRUD ----------
    const handleSavePO = async (id: string) => {
        setSaving(true);
        const { error } = await supabase
            .from("program_outcomes")
            .update({ po_number: editPOForm.po_number, description: editPOForm.description })
            .eq("id", id);
        if (error) alert("Failed: " + error.message);
        else { setEditingPOId(null); fetchData(); }
        setSaving(false);
    };

    const handleAddPO = async () => {
        if (!subject?.program_id) return;
        setSaving(true);
        const { error } = await supabase.from("program_outcomes").insert({
            program_id: subject.program_id,
            po_number: newPO.po_number,
            description: newPO.description,
        });
        if (error) alert("Failed: " + error.message);
        else { setAddingPO(false); setNewPO({ po_number: 0, description: "" }); fetchData(); }
        setSaving(false);
    };

    const handleDeletePO = async (id: string) => {
        if (!confirm("Delete this Program Outcome? This will also remove related mappings.")) return;
        const { error } = await supabase.from("program_outcomes").delete().eq("id", id);
        if (error) alert("Failed: " + error.message);
        else fetchData();
    };

    // ---------- CO-PO Mapping CRUD ----------
    const handleCellClick = async (coId: string, poId: string, currentLevel: number) => {
        const nextLevel = currentLevel >= 3 ? 0 : currentLevel + 1;

        if (nextLevel === 0) {
            // Remove mapping
            const mapping = mappings.find((m) => m.co_id === coId && m.po_id === poId);
            if (mapping) {
                await supabase.from("co_po_mapping").delete().eq("id", mapping.id);
            }
        } else {
            // Upsert mapping
            const existing = mappings.find((m) => m.co_id === coId && m.po_id === poId);
            if (existing) {
                await supabase.from("co_po_mapping").update({ correlation_level: nextLevel }).eq("id", existing.id);
            } else {
                await supabase.from("co_po_mapping").insert({ co_id: coId, po_id: poId, correlation_level: nextLevel });
            }
        }
        fetchData();
    };

    const correlationColor = (level: number) => {
        switch (level) {
            case 3: return "bg-emerald-500 text-white hover:bg-emerald-600";
            case 2: return "bg-yellow-400 text-slate-900 hover:bg-yellow-500";
            case 1: return "bg-orange-300 text-slate-900 hover:bg-orange-400";
            default: return "bg-slate-100 text-slate-400 hover:bg-slate-200";
        }
    };

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
        <div className="space-y-6">
            {/* Back link */}
            <a href="/faculty/subjects" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Subjects
            </a>

            {/* Subject Info */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg font-bold">S</span>
                        Subject Information
                    </h2>
                    {!editingSubject ? (
                        <Button size="sm" variant="outline" onClick={() => { setEditingSubject(true); setEditSubjectForm(subject); }}>
                            ✏️ Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveSubject} disabled={saving}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSubject(false)}>Cancel</Button>
                        </div>
                    )}
                </div>

                {editingSubject && editSubjectForm ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(["name", "code"] as const).map((field) => (
                            <div key={field}>
                                <label className="text-xs text-slate-500 uppercase tracking-wide">{field}</label>
                                <input
                                    className="form-input mt-1"
                                    value={editSubjectForm[field]}
                                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, [field]: e.target.value })}
                                />
                            </div>
                        ))}
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Semester</label>
                            <select className="form-input mt-1" value={editSubjectForm.semester}
                                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, semester: parseInt(e.target.value) })}>
                                {[2, 4, 6, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Credits</label>
                            <input type="number" className="form-input mt-1" value={editSubjectForm.credits}
                                onChange={(e) => setEditSubjectForm({ ...editSubjectForm, credits: parseInt(e.target.value) || 1 })} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                            <p className="font-semibold text-slate-800 mt-1">{subject.name}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Code</p>
                            <p className="font-semibold text-slate-800 mt-1">{subject.code}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Semester</p>
                            <p className="font-semibold text-slate-800 mt-1">{subject.semester}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Credits</p>
                            <p className="font-semibold text-slate-800 mt-1">{subject.credits}</p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Course Outcomes */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm font-bold">CO</span>
                        Course Outcomes ({cos.length})
                    </h2>
                    <Button size="sm" variant="outline" onClick={() => { setAddingCO(true); setNewCO({ co_number: cos.length + 1, description: "", target_attainment: 0.6 }); }}>
                        + Add CO
                    </Button>
                </div>

                {addingCO && (
                    <div className="bg-emerald-50 p-4 rounded-lg mb-4 space-y-3 border border-emerald-200">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-slate-600">CO Number</label>
                                <input type="number" className="form-input mt-1" value={newCO.co_number}
                                    onChange={(e) => setNewCO({ ...newCO, co_number: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-slate-600">Target Attainment</label>
                                <input type="number" step="0.1" min="0" max="1" className="form-input mt-1" value={newCO.target_attainment}
                                    onChange={(e) => setNewCO({ ...newCO, target_attainment: parseFloat(e.target.value) || 0.6 })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-600">Description</label>
                            <textarea className="form-input mt-1" rows={2} value={newCO.description}
                                onChange={(e) => setNewCO({ ...newCO, description: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddCO} disabled={saving}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingCO(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {cos.map((co) => (
                        <div key={co.id} className="bg-slate-50 rounded-lg p-3">
                            {editingCOId === co.id ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-600">CO Number</label>
                                            <input type="number" className="form-input mt-1" value={editCOForm.co_number}
                                                onChange={(e) => setEditCOForm({ ...editCOForm, co_number: parseInt(e.target.value) || 1 })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-slate-600">Target Attainment</label>
                                            <input type="number" step="0.1" className="form-input mt-1" value={editCOForm.target_attainment}
                                                onChange={(e) => setEditCOForm({ ...editCOForm, target_attainment: parseFloat(e.target.value) || 0.6 })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600">Description</label>
                                        <textarea className="form-input mt-1" rows={2} value={editCOForm.description}
                                            onChange={(e) => setEditCOForm({ ...editCOForm, description: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleSaveCO(co.id)} disabled={saving}>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingCOId(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700 flex-shrink-0">
                                            CO{co.co_number}
                                        </span>
                                        <div>
                                            <p className="text-sm text-slate-700">{co.description}</p>
                                            <p className="text-xs text-slate-400 mt-1">Target: {(co.target_attainment * 100).toFixed(0)}%</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => { setEditingCOId(co.id); setEditCOForm({ co_number: co.co_number, description: co.description, target_attainment: co.target_attainment }); }}
                                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                                        >Edit</button>
                                        <button onClick={() => handleDeleteCO(co.id)}
                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        >Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {cos.length === 0 && <p className="text-center text-slate-400 py-4">No Course Outcomes yet</p>}
                </div>
            </Card>

            {/* Program Outcomes */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-sm font-bold">PO</span>
                        Program Outcomes ({pos.length})
                    </h2>
                    <Button size="sm" variant="outline" onClick={() => { setAddingPO(true); setNewPO({ po_number: pos.length + 1, description: "" }); }}>
                        + Add PO
                    </Button>
                </div>

                {addingPO && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-3 border border-blue-200">
                        <div>
                            <label className="text-xs text-slate-600">PO Number</label>
                            <input type="number" className="form-input mt-1" value={newPO.po_number}
                                onChange={(e) => setNewPO({ ...newPO, po_number: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600">Description</label>
                            <textarea className="form-input mt-1" rows={2} value={newPO.description}
                                onChange={(e) => setNewPO({ ...newPO, description: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddPO} disabled={saving}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingPO(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {pos.map((po) => (
                        <div key={po.id} className="bg-slate-50 rounded-lg p-3">
                            {editingPOId === po.id ? (
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-slate-600">PO Number</label>
                                        <input type="number" className="form-input mt-1" value={editPOForm.po_number}
                                            onChange={(e) => setEditPOForm({ ...editPOForm, po_number: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600">Description</label>
                                        <textarea className="form-input mt-1" rows={2} value={editPOForm.description}
                                            onChange={(e) => setEditPOForm({ ...editPOForm, description: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleSavePO(po.id)} disabled={saving}>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingPOId(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 flex-shrink-0">
                                            PO{po.po_number}
                                        </span>
                                        <p className="text-sm text-slate-700">{po.description}</p>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => { setEditingPOId(po.id); setEditPOForm({ po_number: po.po_number, description: po.description }); }}
                                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                                        >Edit</button>
                                        <button onClick={() => handleDeletePO(po.id)}
                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        >Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {pos.length === 0 && <p className="text-center text-slate-400 py-4">No Program Outcomes yet</p>}
                </div>
            </Card>

            {/* CO-PO Mapping Heatmap */}
            <Card>
                <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-sm font-bold">M</span>
                    CO-PO Mapping Matrix
                </h2>
                <p className="text-sm text-slate-500 mb-4">Click on a cell to cycle through correlation levels: – → 1 → 2 → 3 → –</p>

                <div className="flex items-center gap-4 mb-4 text-xs">
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> 3 – High</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-400 inline-block"></span> 2 – Medium</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-300 inline-block"></span> 1 – Low</span>
                    <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-100 inline-block border"></span> – None</span>
                </div>

                {cos.length > 0 && pos.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left bg-slate-50 rounded-tl-lg font-bold text-slate-700">CO / PO</th>
                                    {pos.map((po) => (
                                        <th key={po.id} className="px-3 py-2 text-center bg-slate-50 text-xs font-bold text-slate-600">
                                            PO{po.po_number}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cos.map((co) => (
                                    <tr key={co.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2 font-bold text-xs text-slate-700">CO{co.co_number}</td>
                                        {pos.map((po) => {
                                            const mapping = mappings.find((m) => m.co_id === co.id && m.po_id === po.id);
                                            const level = mapping?.correlation_level || 0;
                                            return (
                                                <td key={po.id} className="px-1 py-1 text-center">
                                                    <button
                                                        onClick={() => handleCellClick(co.id, po.id, level)}
                                                        className={`w-9 h-9 rounded text-xs font-bold transition-all duration-150 cursor-pointer ${correlationColor(level)}`}
                                                        title={`CO${co.co_number} × PO${po.po_number}: Click to change`}
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
                ) : (
                    <p className="text-center text-slate-400 py-8">Add Course Outcomes and Program Outcomes to build the mapping matrix</p>
                )}
            </Card>
        </div>
    );
}
