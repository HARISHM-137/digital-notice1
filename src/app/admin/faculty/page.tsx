"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Subject, FacultySubject } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function FacultyAssignmentPage() {
    const [assignments, setAssignments] = useState<FacultySubject[]>([]);
    const [faculty, setFaculty] = useState<User[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        faculty_id: "",
        subject_id: "",
        academic_year: "2025-2026",
    });

    useEffect(() => {
        fetchAssignments();
        fetchFaculty();
        fetchSubjects();
    }, []);

    const fetchAssignments = async () => {
        try {
            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("*, users:faculty_id(name, email), subjects:subject_id(name, code)")
                .order("academic_year", { ascending: false });

            if (error) throw error;
            setAssignments(data || []);
        } catch (error) {
            console.error("Error fetching assignments:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculty = async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("role", "FACULTY")
                .order("name");
            if (error) throw error;
            setFaculty(data || []);
        } catch (error) {
            console.error("Error fetching faculty:", error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase.from("subjects").select("*").order("code");
            if (error) throw error;
            setSubjects(data || []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase.from("faculty_subjects").insert({
                faculty_id: formData.faculty_id,
                subject_id: formData.subject_id,
                academic_year: formData.academic_year,
            });

            if (error) throw error;

            setFormData({ faculty_id: "", subject_id: "", academic_year: "2025-2026" });
            setShowModal(false);
            fetchAssignments();
        } catch (error: any) {
            console.error("Error saving assignment:", error);
            if (error.code === "23505") {
                alert("This faculty is already assigned to this subject for this academic year.");
            } else {
                alert("Error saving assignment. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (assignmentId: string) => {
        if (confirm("Are you sure you want to remove this assignment?")) {
            try {
                const { error } = await supabase.from("faculty_subjects").delete().eq("id", assignmentId);
                if (error) throw error;
                fetchAssignments();
            } catch (error) {
                console.error("Error deleting assignment:", error);
                alert("Error deleting assignment. Please try again.");
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
                    <h1 className="text-2xl font-bold text-slate-900">Faculty-Subject Assignment</h1>
                    <p className="text-slate-500">Assign faculty members to subjects</p>
                </div>
                <Button onClick={() => { setFormData({ faculty_id: "", subject_id: "", academic_year: "2025-2026" }); setShowModal(true); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Assign Faculty
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Total Faculty</p>
                            <p className="text-2xl font-bold">{faculty.length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Assignments</p>
                            <p className="text-2xl font-bold">{assignments.length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Assignments Table */}
            <Card>
                {assignments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-lg font-medium">No assignments yet</p>
                        <p className="text-sm">Assign faculty to subjects to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Faculty</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Subject</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Academic Year</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map((assignment: any) => (
                                    <tr key={assignment.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-slate-900 font-medium">{assignment.users?.name || "-"}</p>
                                                <p className="text-slate-500 text-sm">{assignment.users?.email || ""}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                                {assignment.subjects?.code}
                                            </span>
                                            <span className="ml-2 text-slate-600">{assignment.subjects?.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{assignment.academic_year}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleDelete(assignment.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Assignment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            <h2 className="text-xl font-bold">Assign Faculty to Subject</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Faculty *</label>
                                <select required value={formData.faculty_id} onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="">Select faculty</option>
                                    {faculty.map((f) => (
                                        <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                                <select required value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="">Select subject</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year *</label>
                                <select required value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="2025-2026">2025-2026</option>
                                    <option value="2026-2027">2026-2027</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "Saving..." : "Assign"}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
