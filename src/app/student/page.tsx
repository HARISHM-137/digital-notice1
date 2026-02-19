"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import AttainmentGauge from "@/components/charts/AttainmentGauge";
import Link from "next/link";

export default function StudentDashboard() {
    const [userName, setUserName] = useState("Student");
    const [enrolledCount, setEnrolledCount] = useState(0);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [overallCO, setOverallCO] = useState(0);
    const [overallPO, setOverallPO] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch user name
            const { data: userData } = await supabase
                .from("users")
                .select("name")
                .eq("id", user.id)
                .single();
            if (userData?.name) setUserName(userData.name);

            // Fetch enrolled subjects from student_subjects
            const { data: enrollments } = await supabase
                .from("student_subjects")
                .select("subject_id, subjects(id, name, code)")
                .eq("student_id", user.id);

            const enrolledSubjects = enrollments?.map((e: any) => e.subjects).filter(Boolean) || [];
            setEnrolledCount(enrolledSubjects.length);

            // For each subject, try to fetch attainment results
            const courseData: any[] = [];
            for (const subj of enrolledSubjects) {
                const { data: results } = await supabase
                    .from("attainment_results")
                    .select("final_attainment")
                    .eq("subject_id", subj.id)
                    .eq("result_type", "CO");

                let attainment = 0;
                if (results && results.length > 0) {
                    const avg = results.reduce((sum: number, r: any) => sum + (r.final_attainment || 0), 0) / results.length;
                    attainment = Math.round(avg);
                }
                courseData.push({ code: subj.code, name: subj.name, id: subj.id, attainment });
            }

            setCourses(courseData);

            // Calculate overall CO/PO attainment
            if (courseData.length > 0) {
                const coAvg = courseData.reduce((sum: number, c: any) => sum + c.attainment, 0) / courseData.length;
                setOverallCO(Math.round(coAvg));

                // Fetch PO attainment from results
                const subjectIds = enrolledSubjects.map((s: any) => s.id);
                const { data: poResults } = await supabase
                    .from("attainment_results")
                    .select("final_attainment")
                    .in("subject_id", subjectIds)
                    .eq("result_type", "PO");

                if (poResults && poResults.length > 0) {
                    const poAvg = poResults.reduce((sum: number, r: any) => sum + (r.final_attainment || 0), 0) / poResults.length;
                    setOverallPO(Math.round(poAvg));
                }
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
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

    const stats = [
        { title: "My Subjects", value: `${enrolledCount} / 6`, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, color: "primary" as const },
        { title: "Avg CO Attainment", value: `${overallCO}%`, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, color: "success" as const },
        { title: "Avg PO Attainment", value: `${overallPO}%`, icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>, color: "warning" as const },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Student Dashboard</h1>
                <p className="text-slate-600 mt-1">Welcome, {userName}</p>
                <p className="text-xs text-slate-400 mt-1">📚 6 subjects are auto-assigned per semester based on your year &amp; department</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((s) => <Card key={s.title} {...s} />)}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">My Courses</h3>
                        <Link href="/student/courses" className="text-primary-600 text-sm">View All →</Link>
                    </div>
                    {courses.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <p className="text-sm">No courses enrolled yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {courses.map((c: any) => (
                                <div key={c.code} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">{c.code}</span>
                                        <p className="font-medium text-slate-800 mt-1">{c.name}</p>
                                    </div>
                                    <AttainmentGauge value={c.attainment} label="" size="sm" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Overall Attainment</h3>
                    <div className="flex justify-center gap-8">
                        <AttainmentGauge value={overallCO} label="CO Attainment" size="md" />
                        <AttainmentGauge value={overallPO} label="PO Attainment" size="md" />
                    </div>
                </div>
            </div>
        </div>
    );
}
