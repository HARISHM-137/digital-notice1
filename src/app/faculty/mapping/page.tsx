"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Subject, CourseOutcome, ProgramOutcome } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import COPOMatrix from "@/components/charts/COPOMatrix";
import { showToast } from "@/components/ui/Toast";

export default function FacultyMappingPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
    const [programOutcomes, setProgramOutcomes] = useState<ProgramOutcome[]>([]);
    const [mappings, setMappings] = useState<Record<string, Record<string, number>>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showEditor, setShowEditor] = useState(true);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            fetchCOsAndPOs();
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subjects(*, programs(id))")
                .eq("faculty_id", user.id)
                .order("academic_year", { ascending: false });

            if (error) throw error;
            const subjectsList = data?.map((d: any) => d.subjects).filter(Boolean) || [];
            setSubjects(subjectsList);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCOsAndPOs = async () => {
        try {
            const { data: cos, error: coError } = await supabase
                .from("course_outcomes")
                .select("*")
                .eq("subject_id", selectedSubject)
                .order("co_number");

            if (coError) throw coError;
            setCourseOutcomes(cos || []);

            const subject = subjects.find((s) => s.id === selectedSubject);
            if (subject?.program_id) {
                const { data: pos, error: poError } = await supabase
                    .from("program_outcomes")
                    .select("*")
                    .eq("program_id", subject.program_id)
                    .order("po_number");

                if (poError) throw poError;
                setProgramOutcomes(pos || []);

                const { data: mappingData, error: mapError } = await supabase
                    .from("co_po_mapping")
                    .select("*")
                    .in("co_id", (cos || []).map((c) => c.id));

                if (mapError) throw mapError;

                const mappingMap: Record<string, Record<string, number>> = {};
                mappingData?.forEach((m: any) => {
                    if (!mappingMap[m.co_id]) mappingMap[m.co_id] = {};
                    mappingMap[m.co_id][m.po_id] = m.correlation_level;
                });
                setMappings(mappingMap);
            }
        } catch (error) {
            console.error("Error fetching COs/POs:", error);
        }
    };

    const handleMappingChange = (coId: string, poId: string, value: number) => {
        setMappings((prev) => ({
            ...prev,
            [coId]: {
                ...prev[coId],
                [poId]: value,
            },
        }));
    };

    const saveMappings = async () => {
        setSaving(true);
        try {
            const coIds = courseOutcomes.map((c) => c.id);
            await supabase.from("co_po_mapping").delete().in("co_id", coIds);

            const newMappings: { co_id: string; po_id: string; correlation_level: number }[] = [];
            Object.entries(mappings).forEach(([coId, poMappings]) => {
                Object.entries(poMappings).forEach(([poId, level]) => {
                    if (level > 0) {
                        newMappings.push({ co_id: coId, po_id: poId, correlation_level: level });
                    }
                });
            });

            if (newMappings.length > 0) {
                const { error } = await supabase.from("co_po_mapping").insert(newMappings);
                if (error) throw error;
            }

            showToast("Mappings saved successfully!", "success");
            setShowEditor(false);
        } catch (error) {
            console.error("Error saving mappings:", error);
            showToast("Error saving mappings. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">CO-PO Mapping</h1>
                    <p className="text-slate-500">Map Course Outcomes to Program Outcomes</p>
                </div>
                <div className="flex gap-2">
                    {selectedSubject && courseOutcomes.length > 0 && programOutcomes.length > 0 && (
                        <>
                            <Button variant="secondary" onClick={() => setShowEditor(!showEditor)}>
                                {showEditor ? "View Matrix" : "Edit Mapping"}
                            </Button>
                            {showEditor && (
                                <Button onClick={saveMappings} disabled={saving}>
                                    {saving ? "Saving..." : "Save Mappings"}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Subject Selector */}
            <Card>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setShowEditor(true); }}
                    className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Choose a subject</option>
                    {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                            {subj.code} - {subj.name}
                        </option>
                    ))}
                </select>
            </Card>

            {/* Matrix Display */}
            {selectedSubject && (
                <Card>
                    {showEditor ? (
                        // Editable Table
                        courseOutcomes.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="text-lg font-medium">No Course Outcomes defined</p>
                                <p className="text-sm">Define COs first in the Outcomes page</p>
                            </div>
                        ) : programOutcomes.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="text-lg font-medium">No Program Outcomes defined</p>
                                <p className="text-sm">Contact admin to define POs for this program</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">CO / PO</th>
                                            {programOutcomes.map((po) => (
                                                <th key={po.id} className="px-3 py-3 text-center text-sm font-semibold text-slate-600">
                                                    PO{po.po_number}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courseOutcomes.map((co) => (
                                            <tr key={co.id} className="border-b border-slate-100">
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700">
                                                        CO{co.co_number}
                                                    </span>
                                                </td>
                                                {programOutcomes.map((po) => (
                                                    <td key={po.id} className="px-3 py-3 text-center">
                                                        <select
                                                            value={mappings[co.id]?.[po.id] || 0}
                                                            onChange={(e) => handleMappingChange(co.id, po.id, parseInt(e.target.value))}
                                                            className={`w-14 px-2 py-1 text-center border rounded-lg text-sm ${(mappings[co.id]?.[po.id] || 0) > 0 ? "bg-indigo-50 border-indigo-300" : "border-slate-200"}`}
                                                        >
                                                            <option value={0}>-</option>
                                                            <option value={1}>1</option>
                                                            <option value={2}>2</option>
                                                            <option value={3}>3</option>
                                                        </select>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        // Visual Matrix View
                        <COPOMatrix
                            courseOutcomes={courseOutcomes}
                            programOutcomes={programOutcomes}
                            mappings={mappings}
                        />
                    )}
                </Card>
            )}
        </div>
    );
}
