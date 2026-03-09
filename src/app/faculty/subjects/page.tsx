"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";
import Card from "@/components/ui/Card";

interface AssignedSubject {
    id: string;
    academic_year: string;
    subjects: {
        id: string;
        name: string;
        code: string;
        semester: number;
        credits: number;
        programs?: {
            name: string;
            code: string;
        };
    };
}

export default function FacultySubjectsPage() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssignedSubjects();
    }, []);

    const fetchAssignedSubjects = async () => {
        try {
            const user = await getTestUser('FACULTY');
            if (!user) { setLoading(false); return; }

            const { data, error } = await supabase
                .from("faculty_subjects")
                .select(`
                    id,
                    academic_year,
                    subjects (
                        id,
                        name,
                        code,
                        semester,
                        credits,
                        programs (name, code)
                    )
                `)
                .eq("faculty_id", user.id)
                .order("academic_year", { ascending: false });

            if (error) throw error;
            setAssignments(data || []);
        } catch (error) {
            console.error("Error fetching assigned subjects:", error);
        } finally {
            setLoading(false);
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
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Subjects</h1>
                <p className="text-slate-500">Subjects assigned to you</p>
            </div>

            {/* Stats */}
            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Assigned Subjects</p>
                        <p className="text-2xl font-bold">{assignments.length}</p>
                    </div>
                </div>
            </Card>

            {/* Subjects Grid */}
            {assignments.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium">No subjects assigned</p>
                        <p className="text-sm">Contact admin for subject assignment</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((assignment: any) => (
                        <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                    {assignment.subjects?.code}
                                </span>
                                <span className="text-xs text-slate-500">{assignment.academic_year}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                {assignment.subjects?.name}
                            </h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p>Program: {assignment.subjects?.programs?.name || "-"}</p>
                                <p>Semester: {assignment.subjects?.semester}</p>
                                <p>Credits: {assignment.subjects?.credits}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
                                <a href={`/faculty/subjects/${assignment.subjects?.id}`} className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                                    View Details →
                                </a>
                                <a href={`/faculty/assessments?subject=${assignment.subjects?.id}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                    Enter Marks →
                                </a>
                                <a href={`/faculty/outcomes?subject=${assignment.subjects?.id}`} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                                    Manage COs →
                                </a>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
