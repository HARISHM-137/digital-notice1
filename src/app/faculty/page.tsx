"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";
import Card from "@/components/ui/Card";
import Link from "next/link";


export default function FacultyDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
    const [coCount, setCoCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [facultyName, setFacultyName] = useState("");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const user = await getTestUser('FACULTY');
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch faculty profile
            const { data: profile } = await supabase
                .from("users")
                .select("name")
                .eq("id", user.id)
                .single();
            if (profile) setFacultyName(profile.name);

            // Fetch assigned subjects
            const { data: subjectData } = await supabase
                .from("faculty_subjects")
                .select(`
                    id,
                    academic_year,
                    subjects (
                        id, name, code, semester, credits,
                        programs (name, code)
                    )
                `)
                .eq("faculty_id", user.id)
                .order("academic_year", { ascending: false });

            const subjects = subjectData || [];
            setAssignedSubjects(subjects);

            // Fetch total COs for all assigned subjects
            if (subjects.length > 0) {
                const subjectIds = subjects.map((s: any) => s.subjects?.id).filter(Boolean);

                const { data: coData } = await supabase
                    .from("course_outcomes")
                    .select("id")
                    .in("subject_id", subjectIds);
                setCoCount(coData?.length || 0);

                // Fetch total enrolled students across all subjects
                const { data: enrollData } = await supabase
                    .from("student_subjects")
                    .select("student_id")
                    .in("subject_id", subjectIds);
                // Unique students count
                const uniqueStudents = new Set(enrollData?.map((e: any) => e.student_id) || []);
                setStudentCount(uniqueStudents.size);
            }
        } catch (error) {
            console.error("Error fetching faculty dashboard data:", error);
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

    const quickActions = [
        { label: "My Subjects", href: "/faculty/subjects", icon: "📚", color: "from-blue-500 to-indigo-600" },
        { label: "Assessments", href: "/faculty/assessments", icon: "📝", color: "from-green-500 to-emerald-600" },
        { label: "Course Outcomes", href: "/faculty/outcomes", icon: "🎯", color: "from-purple-500 to-violet-600" },
        { label: "CO-PO Mapping", href: "/faculty/mapping", icon: "🗺️", color: "from-orange-500 to-red-600" },
        { label: "Attainment", href: "/faculty/attainment", icon: "📊", color: "from-cyan-500 to-blue-600" },
        { label: "Surveys", href: "/faculty/surveys", icon: "📋", color: "from-pink-500 to-rose-600" },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    Welcome back{facultyName ? `, ${facultyName}` : ""}!
                </h1>
                <p className="text-slate-500">Faculty Dashboard — Academic Year 2025-26</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Assigned Subjects</p>
                            <p className="text-2xl font-bold">{assignedSubjects.length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Total COs Defined</p>
                            <p className="text-2xl font-bold">{coCount}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Students Enrolled</p>
                            <p className="text-2xl font-bold">{studentCount}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Assigned Subjects */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-800">My Subjects</h2>
                    <Link href="/faculty/subjects" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        View all →
                    </Link>
                </div>
                {assignedSubjects.length === 0 ? (
                    <Card>
                        <div className="text-center py-10 text-slate-500">
                            <p className="text-lg font-medium">No subjects assigned yet</p>
                            <p className="text-sm">Contact admin to get subjects assigned to you.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignedSubjects.map((item: any) => (
                            <Card key={item.id} className="hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                        {item.subjects?.code}
                                    </span>
                                    <span className="text-xs text-slate-400">Sem {item.subjects?.semester}</span>
                                </div>
                                <h3 className="font-semibold text-slate-800 mb-1">{item.subjects?.name}</h3>
                                <p className="text-xs text-slate-500 mb-3">
                                    {item.subjects?.programs?.name || "—"} · {item.subjects?.credits} credits · {item.academic_year}
                                </p>
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                    <Link
                                        href={`/faculty/outcomes?subject=${item.subjects?.id}`}
                                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                                    >
                                        COs →
                                    </Link>
                                    <Link
                                        href={`/faculty/assessments?subject=${item.subjects?.id}`}
                                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                                    >
                                        Marks →
                                    </Link>
                                    <Link
                                        href={`/faculty/attainment?subject=${item.subjects?.id}`}
                                        className="text-xs text-cyan-600 hover:text-cyan-800 font-medium"
                                    >
                                        Attainment →
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className={`bg-gradient-to-br ${action.color} text-white rounded-xl p-4 text-center hover:scale-105 transition-transform shadow-sm`}
                        >
                            <div className="text-2xl mb-1">{action.icon}</div>
                            <p className="text-xs font-medium">{action.label}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
