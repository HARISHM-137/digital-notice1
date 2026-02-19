"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Program, Department } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ProgramsPage() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        department_id: "",
    });

    useEffect(() => {
        fetchPrograms();
        fetchDepartments();
    }, []);

    const fetchPrograms = async () => {
        try {
            const { data, error } = await supabase
                .from("programs")
                .select("*, departments(name, code)")
                .order("name");

            if (error) throw error;
            setPrograms(data || []);
        } catch (error) {
            console.error("Error fetching programs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase.from("departments").select("*").order("name");
            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingProgram) {
                const { error } = await supabase
                    .from("programs")
                    .update({
                        name: formData.name,
                        code: formData.code,
                        department_id: formData.department_id,
                    })
                    .eq("id", editingProgram.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from("programs").insert({
                    name: formData.name,
                    code: formData.code,
                    department_id: formData.department_id,
                });

                if (error) throw error;
            }

            setFormData({ name: "", code: "", department_id: "" });
            setEditingProgram(null);
            setShowModal(false);
            fetchPrograms();
        } catch (error) {
            console.error("Error saving program:", error);
            alert("Error saving program. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (prog: Program) => {
        setEditingProgram(prog);
        setFormData({
            name: prog.name,
            code: prog.code,
            department_id: prog.department_id,
        });
        setShowModal(true);
    };

    const handleDelete = async (progId: string) => {
        if (confirm("Are you sure you want to delete this program?")) {
            try {
                const { error } = await supabase.from("programs").delete().eq("id", progId);
                if (error) throw error;
                fetchPrograms();
            } catch (error) {
                console.error("Error deleting program:", error);
                alert("Error deleting program. Please try again.");
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
                    <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
                    <p className="text-slate-500">Manage academic programs</p>
                </div>
                <Button onClick={() => { setEditingProgram(null); setFormData({ name: "", code: "", department_id: "" }); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Program
                </Button>
            </div>

            {/* Stats Card */}
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Total Programs</p>
                        <p className="text-2xl font-bold">{programs.length}</p>
                    </div>
                </div>
            </Card>

            {/* Programs Table */}
            <Card>
                {programs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium">No programs yet</p>
                        <p className="text-sm">Add your first program to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Department</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Created</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {programs.map((prog: any) => (
                                    <tr key={prog.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                                                {prog.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">{prog.name}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {prog.departments?.name || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(prog.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(prog)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(prog.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                >
                                                    Delete
                                                </button>
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
                        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                            <h2 className="text-xl font-bold">{editingProgram ? "Edit Program" : "Add New Program"}</h2>
                            <p className="text-white/80 text-sm">
                                {editingProgram ? "Update program information" : "Create a new program"}
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Program Code *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="e.g., BTCSE"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Program Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="e.g., B.Tech Computer Science"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                                <select
                                    required
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="">Select department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.code} - {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? "Saving..." : editingProgram ? "Update" : "Create"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
