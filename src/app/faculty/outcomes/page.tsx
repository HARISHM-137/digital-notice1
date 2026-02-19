"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Subject, CourseOutcome } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function FacultyOutcomesPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [outcomes, setOutcomes] = useState<CourseOutcome[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCO, setEditingCO] = useState<CourseOutcome | null>(null);
    const [formData, setFormData] = useState({
        co_number: 1,
        description: "",
        target_attainment: 0.6,
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            fetchOutcomes();
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subjects(*)")
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

    const fetchOutcomes = async () => {
        try {
            const { data, error } = await supabase
                .from("course_outcomes")
                .select("*")
                .eq("subject_id", selectedSubject)
                .order("co_number");

            if (error) throw error;
            setOutcomes(data || []);
        } catch (error) {
            console.error("Error fetching outcomes:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingCO) {
                const { error } = await supabase
                    .from("course_outcomes")
                    .update({
                        co_number: formData.co_number,
                        description: formData.description,
                        target_attainment: formData.target_attainment,
                    })
                    .eq("id", editingCO.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from("course_outcomes").insert({
                    subject_id: selectedSubject,
                    co_number: formData.co_number,
                    description: formData.description,
                    target_attainment: formData.target_attainment,
                });

                if (error) throw error;
            }

            setFormData({ co_number: outcomes.length + 2, description: "", target_attainment: 0.6 });
            setEditingCO(null);
            setShowModal(false);
            fetchOutcomes();
        } catch (error: any) {
            console.error("Error saving outcome:", error);
            if (error.code === "23505") {
                alert("CO number already exists for this subject.");
            } else {
                alert("Error saving outcome. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (co: CourseOutcome) => {
        setEditingCO(co);
        setFormData({
            co_number: co.co_number,
            description: co.description,
            target_attainment: co.target_attainment,
        });
        setShowModal(true);
    };

    const handleDelete = async (coId: string) => {
        if (confirm("Are you sure you want to delete this Course Outcome?")) {
            try {
                const { error } = await supabase.from("course_outcomes").delete().eq("id", coId);
                if (error) throw error;
                fetchOutcomes();
            } catch (error) {
                console.error("Error deleting outcome:", error);
                alert("Error deleting outcome. Please try again.");
            }
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
                    <h1 className="text-2xl font-bold text-slate-900">Course Outcomes</h1>
                    <p className="text-slate-500">Define COs for your subjects</p>
                </div>
                {selectedSubject && (
                    <Button onClick={() => { setEditingCO(null); setFormData({ co_number: outcomes.length + 1, description: "", target_attainment: 0.6 }); setShowModal(true); }}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add CO
                    </Button>
                )}
            </div>

            {/* Subject Selector */}
            <Card>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
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

            {/* COs Grid */}
            {selectedSubject && (
                outcomes.length === 0 ? (
                    <Card>
                        <div className="text-center py-12 text-slate-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <p className="text-lg font-medium">No Course Outcomes defined</p>
                            <p className="text-sm">Add COs to define learning objectives</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {outcomes.map((co) => (
                            <Card key={co.id} className="hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="px-3 py-1 text-sm font-bold rounded-full bg-emerald-100 text-emerald-700">
                                        CO{co.co_number}
                                    </span>
                                    <span className="text-sm text-slate-500">Target: {(co.target_attainment * 100).toFixed(0)}%</span>
                                </div>
                                <p className="text-slate-700">{co.description}</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                                    <button onClick={() => handleEdit(co)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(co.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                            <h2 className="text-xl font-bold">{editingCO ? "Edit Course Outcome" : "Add Course Outcome"}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CO Number *</label>
                                    <input type="number" required min={1} max={10} value={formData.co_number} onChange={(e) => setFormData({ ...formData, co_number: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Attainment *</label>
                                    <select value={formData.target_attainment} onChange={(e) => setFormData({ ...formData, target_attainment: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                        <option value={0.5}>50%</option>
                                        <option value={0.6}>60%</option>
                                        <option value={0.7}>70%</option>
                                        <option value={0.8}>80%</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                                <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="e.g., Understand and apply data structures..." />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "Saving..." : editingCO ? "Update" : "Create"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
