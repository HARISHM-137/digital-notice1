"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Link from "next/link";

interface StatData {
    departments: number;
    programs: number;
    subjects: number;
    faculty: number;
    students: number;
    documents: number;
}

interface RecentSubject {
    id: string;
    name: string;
    code: string;
    created_at: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<StatData>({ departments: 0, programs: 0, subjects: 0, faculty: 0, students: 0, documents: 0 });
    const [recentSubjects, setRecentSubjects] = useState<RecentSubject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [depts, progs, subjs, fac, studs, docs] = await Promise.all([
                    supabase.from("departments").select("id", { count: "exact", head: true }),
                    supabase.from("programs").select("id", { count: "exact", head: true }),
                    supabase.from("subjects").select("id", { count: "exact", head: true }),
                    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "FACULTY"),
                    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "STUDENT"),
                    supabase.from("documents").select("id", { count: "exact", head: true }),
                ]);

                setStats({
                    departments: depts.count || 0,
                    programs: progs.count || 0,
                    subjects: subjs.count || 0,
                    faculty: fac.count || 0,
                    students: studs.count || 0,
                    documents: docs.count || 0,
                });

                const { data: recent } = await supabase
                    .from("subjects")
                    .select("id, name, code, created_at")
                    .order("created_at", { ascending: false })
                    .limit(5);
                setRecentSubjects(recent || []);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    const statCards = [
        { title: "Departments", value: stats.departments, icon: "🏛️", color: "primary" as const, href: "/admin/departments" },
        { title: "Programs", value: stats.programs, icon: "📚", color: "secondary" as const, href: "/admin/programs" },
        { title: "Subjects", value: stats.subjects, icon: "📖", color: "success" as const, href: "/admin/subjects" },
        { title: "Faculty", value: stats.faculty, icon: "👨‍🏫", color: "warning" as const, href: "/admin/users" },
        { title: "Students", value: stats.students, icon: "🎓", color: "danger" as const, href: "/admin/users" },
        { title: "Documents", value: stats.documents, icon: "📄", color: "primary" as const, href: "/admin/ai-upload" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">CO-PO Attainment Management System Overview</p>
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map(stat => (
                    <Link key={stat.title} href={stat.href}>
                        <Card title={stat.title} value={stat.value} color={stat.color} icon={<span className="text-2xl">{stat.icon}</span>} />
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link href="/admin/ai-upload" className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl hover:shadow-md transition-all">
                        <span className="text-2xl">🤖</span>
                        <span className="text-sm font-medium text-indigo-800">AI Upload</span>
                    </Link>
                    <Link href="/admin/student-upload" className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all">
                        <span className="text-2xl">👥</span>
                        <span className="text-sm font-medium text-green-800">Student Upload</span>
                    </Link>
                    <Link href="/admin/attainment" className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all">
                        <span className="text-2xl">📊</span>
                        <span className="text-sm font-medium text-purple-800">Attainment</span>
                    </Link>
                    <Link href="/admin/reports" className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl hover:shadow-md transition-all">
                        <span className="text-2xl">📋</span>
                        <span className="text-sm font-medium text-amber-800">Reports</span>
                    </Link>
                </div>
            </Card>

            {/* Recent Subjects */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Recent Subjects</h3>
                    <Link href="/admin/subjects" className="text-sm text-indigo-600 hover:text-indigo-800">View all →</Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentSubjects.map(subj => (
                        <Link key={subj.id} href={`/admin/subjects/${subj.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-3 px-3 rounded-lg transition-colors">
                            <div>
                                <p className="font-medium text-slate-800">{subj.name}</p>
                                <p className="text-xs text-slate-500">{subj.code}</p>
                            </div>
                            <span className="text-xs text-slate-400">{new Date(subj.created_at).toLocaleDateString()}</span>
                        </Link>
                    ))}
                    {recentSubjects.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No subjects yet</p>}
                </div>
            </Card>
        </div>
    );
}
