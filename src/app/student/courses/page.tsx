"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";

interface EnrolledCourse {
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

export default function StudentCoursesPage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("student_subjects")
                .select(`
                    id,
                    academic_year,
                    subjects (
                        id, name, code, semester, credits,
                        programs (name, code)
                    )
                `)
                .eq("student_id", user.id)
                .order("academic_year", { ascending: false });

            if (error) throw error;
            setEnrollments(data || []);
        } catch (error) {
            console.error("Error fetching enrollments:", error);
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
                <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
                <p className="text-slate-500">Subjects you are enrolled in</p>
            </div>

            {/* Fixed enrollment banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <span className="text-blue-500 text-lg">ℹ️</span>
                <p className="text-sm text-blue-700">
                    <strong>6 subjects</strong> are auto-assigned per semester by the administrator. You cannot add or remove subjects.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Enrolled Courses</p>
                            <p className="text-2xl font-bold">{enrollments.length} / 6</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Total Credits</p>
                            <p className="text-2xl font-bold">
                                {enrollments.reduce((sum: number, e: any) => sum + (e.subjects?.credits || 0), 0)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Courses Grid */}
            {enrollments.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium">No enrollments yet</p>
                        <p className="text-sm">Contact admin for enrollment</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrollments.map((enrollment: any) => (
                        <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                    {enrollment.subjects?.code}
                                </span>
                                <span className="text-xs text-slate-500">{enrollment.academic_year}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                {enrollment.subjects?.name}
                            </h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p>Program: {enrollment.subjects?.programs?.name || "-"}</p>
                                <p>Semester: {enrollment.subjects?.semester}</p>
                                <p>Credits: {enrollment.subjects?.credits}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                                <a href={`/student/co-attainment?subject=${enrollment.subjects?.id}`} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                                    View CO Attainment →
                                </a>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
