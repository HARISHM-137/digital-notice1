"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Department } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .order("name");

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingDepartment) {
                const { error } = await supabase
                    .from("departments")
                    .update({
                        name: formData.name,
                        code: formData.code,
                    })
                    .eq("id", editingDepartment.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from("departments").insert({
                    name: formData.name,
                    code: formData.code,
                });

                if (error) throw error;
            }

            setFormData({ name: "", code: "" });
            setEditingDepartment(null);
            setShowModal(false);
            fetchDepartments();
        } catch (error) {
            console.error("Error saving department:", error);
            alert("Error saving department. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (dept: Department) => {
        setEditingDepartment(dept);
        setFormData({
            name: dept.name,
            code: dept.code,
        });
        setShowModal(true);
    };

    const handleDelete = async (deptId: string) => {
        if (confirm("Are you sure you want to delete this department?")) {
            try {
                const { error } = await supabase.from("departments").delete().eq("id", deptId);
                if (error) throw error;
                fetchDepartments();
            } catch (error) {
                console.error("Error deleting department:", error);
                alert("Error deleting department. Please try again.");
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
                    <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
                    <p className="text-slate-500">Manage academic departments</p>
                </div>
                <Button onClick={() => { setEditingDepartment(null); setFormData({ name: "", code: "" }); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Department
                </Button>
            </div>

            {/* Stats Card */}
            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Total Departments</p>
                        <p className="text-2xl font-bold">{departments.length}</p>
                    </div>
                </div>
            </Card>

            {/* Departments Table */}
            <Card>
                {departments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-lg font-medium">No departments yet</p>
                        <p className="text-sm">Add your first department to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Created</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.map((dept) => (
                                    <tr key={dept.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                                {dept.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">{dept.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(dept.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(dept)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept.id)}
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
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                            <h2 className="text-xl font-bold">{editingDepartment ? "Edit Department" : "Add New Department"}</h2>
                            <p className="text-white/80 text-sm">
                                {editingDepartment ? "Update department information" : "Create a new department"}
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department Code *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., CSE"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., Computer Science & Engineering"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? "Saving..." : editingDepartment ? "Update" : "Create"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
