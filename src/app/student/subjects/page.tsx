"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";
import Card from "@/components/ui/Card";

interface StudentSubject {
    id: string;
    academic_year: string;
    subjects: {
        id: string;
        name: string;
        code: string;
        semester: number;
        year: number;
        credits: number;
        programs?: { name: string; code: string };
    };
}

export default function StudentSubjectsPage() {
    const [assignments, setAssignments] = useState<StudentSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [userYear, setUserYear] = useState<number | null>(null);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const testUser = await getTestUser('STUDENT');
            if (!testUser?.id) return;

            // Get user year
            const { data: profile } = await supabase
                .from("users")
                .select("year")
                .eq("id", testUser.id)
                .single();

            setUserYear(profile?.year || null);

            // Get assigned subjects — NO LIMIT
            console.log("[StudentSubjects] Fetching subjects for student:", testUser.id);
            const { data, error } = await supabase
                .from("student_subjects")
                .select("id, academic_year, subjects(id, name, code, semester, year, credits, programs(name, code))")
                .eq("student_id", testUser.id)
                .order("academic_year", { ascending: false });

            if (error) throw error;
            console.log(`[StudentSubjects] Loaded ${(data as any)?.length || 0} subjects`);
            setAssignments((data as any) || []);
        } catch (error) {
            console.error("[StudentSubjects] Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    // Group by semester
    const bySemester: Record<number, StudentSubject[]> = {};
    assignments.forEach((a) => {
        if (a.subjects) {
            const sem = a.subjects.semester;
            if (!bySemester[sem]) bySemester[sem] = [];
            bySemester[sem].push(a);
        }
    });

    const sortedSemesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Subjects</h1>
                <p className="text-slate-500">
                    {userYear ? `Year ${userYear} · Semester ${userYear * 2} (Even)` : "Auto-assigned subjects"}
                </p>
            </div>

            {/* Info banner — NO hardcoded limit */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <span className="text-blue-500 text-lg">ℹ️</span>
                <p className="text-sm text-blue-700">
                    Subjects are auto-assigned by the administrator based on your year and department. You cannot add or remove subjects.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <p className="text-white/80 text-sm">Total Subjects</p>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <p className="text-white/80 text-sm">Total Credits</p>
                    <p className="text-2xl font-bold">{assignments.reduce((sum, a) => sum + (a.subjects?.credits || 0), 0)}</p>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <p className="text-white/80 text-sm">Semesters</p>
                    <p className="text-2xl font-bold">{sortedSemesters.length}</p>
                </Card>
            </div>

            {/* Subject List by Semester */}
            {sortedSemesters.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium">No subjects assigned</p>
                        <p className="text-sm">Subjects will be auto-assigned based on your year and department</p>
                    </div>
                </Card>
            ) : (
                sortedSemesters.map((sem) => (
                    <div key={sem} className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold">Semester {sem}</span>
                            <span className="text-sm text-slate-400 font-normal">{bySemester[sem].length} subject{bySemester[sem].length !== 1 ? "s" : ""}</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {bySemester[sem].map((a) => (
                                <Card key={a.id} className="hover:shadow-lg transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {a.subjects.code?.slice(0, 3)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 line-clamp-1">{a.subjects.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500">{a.subjects.code}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="text-xs text-slate-500">{a.subjects.credits} Credits</span>
                                                {a.subjects.programs && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        <span className="text-xs text-slate-500">{a.subjects.programs.code}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">{a.academic_year}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
