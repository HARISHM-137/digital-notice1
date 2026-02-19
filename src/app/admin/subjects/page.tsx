"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Subject, Program } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formError, setFormError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        program_id: "",
        semester: 2,
        year: 1,
        credits: 3,
    });

    useEffect(() => {
        fetchSubjects();
        fetchPrograms();
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from("subjects")
                .select("*, programs(name, code)")
                .order("code");

            if (error) throw error;
            setSubjects(data || []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrograms = async () => {
        try {
            const { data, error } = await supabase.from("programs").select("*").order("name");
            if (error) throw error;
            setPrograms(data || []);
        } catch (error) {
            console.error("Error fetching programs:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        // Validate program_id is selected
        if (!formData.program_id) {
            setFormError("Please select a program.");
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingSubject) {
                const { error } = await supabase
                    .from("subjects")
                    .update({
                        name: formData.name,
                        code: formData.code,
                        program_id: formData.program_id,
                        semester: formData.semester,
                        year: formData.year,
                        credits: formData.credits,
                    })
                    .eq("id", editingSubject.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from("subjects").insert({
                    name: formData.name,
                    code: formData.code,
                    program_id: formData.program_id,
                    semester: formData.semester,
                    year: formData.year,
                    credits: formData.credits,
                });

                if (error) throw error;
            }

            setFormData({ name: "", code: "", program_id: "", semester: 2, year: 1, credits: 3 });
            setEditingSubject(null);
            setShowModal(false);
            fetchSubjects();
        } catch (error: any) {
            console.error("Error saving subject:", error);
            const msg = error?.message || "Error saving subject.";
            if (msg.includes("duplicate") || msg.includes("unique")) {
                setFormError("A subject with this code already exists.");
            } else {
                setFormError(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (subj: Subject) => {
        setEditingSubject(subj);
        setFormData({
            name: subj.name,
            code: subj.code,
            program_id: subj.program_id,
            semester: subj.semester,
            year: subj.year || 1,
            credits: subj.credits,
        });
        setShowModal(true);
    };

    const handleDelete = async (subjId: string) => {
        if (confirm("Are you sure you want to delete this subject?")) {
            try {
                const { error } = await supabase.from("subjects").delete().eq("id", subjId);
                if (error) throw error;
                fetchSubjects();
            } catch (error) {
                console.error("Error deleting subject:", error);
                alert("Error deleting subject. Please try again.");
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
                    <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
                    <p className="text-slate-500">Manage academic subjects</p>
                </div>
                <Button onClick={() => { setEditingSubject(null); setFormData({ name: "", code: "", program_id: "", semester: 2, year: 1, credits: 3 }); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Subject
                </Button>
            </div>

            {/* Stats Card */}
            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Total Subjects</p>
                        <p className="text-2xl font-bold">{subjects.length}</p>
                    </div>
                </div>
            </Card>

            {/* Subjects Table */}
            <Card>
                {subjects.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-lg font-medium">No subjects yet</p>
                        <p className="text-sm">Add your first subject to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Program</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Year</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Semester</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Credits</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map((subj: any) => (
                                    <tr key={subj.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                                {subj.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">{subj.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{subj.programs?.name || "-"}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Year {subj.year || 1}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">Sem {subj.semester}</td>
                                        <td className="px-6 py-4 text-slate-600">{subj.credits}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(subj)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Edit</button>
                                                <button onClick={() => handleDelete(subj.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white">
                            <h2 className="text-xl font-bold">{editingSubject ? "Edit Subject" : "Add New Subject"}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {formError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code *</label>
                                    <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="e.g., CS301" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Credits *</label>
                                    <input type="number" required min={1} max={6} value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name *</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="e.g., Data Structures" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Program *</label>
                                    <select required value={formData.program_id} onChange={(e) => setFormData({ ...formData, program_id: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                        <option value="">Select program</option>
                                        {programs.map((prog) => (
                                            <option key={prog.id} value={prog.id}>{prog.code} - {prog.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                                    <select required value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                        <option value={1}>1st Year</option>
                                        <option value={2}>2nd Year</option>
                                        <option value={3}>3rd Year</option>
                                        <option value={4}>4th Year</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Semester *</label>
                                    <select required value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                        {[2, 4, 6, 8].map((sem) => (
                                            <option key={sem} value={sem}>Semester {sem}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "Saving..." : editingSubject ? "Update" : "Create"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
