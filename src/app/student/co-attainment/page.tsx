"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTestUser } from "@/lib/auth";
import Card from "@/components/ui/Card";

interface COAttainment {
    co_id: string;
    co_number: number;
    description: string;
    direct_attainment: number;
    indirect_attainment: number;
    final_attainment: number;
    students_above_target: number;
    total_students: number;
}

export default function StudentCOAttainmentPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [attainments, setAttainments] = useState<COAttainment[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [noData, setNoData] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            fetchCOAttainment();
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const user = await getTestUser('STUDENT');
            if (!user) return;

            const { data, error } = await supabase
                .from("student_subjects")
                .select("subjects(id, name, code)")
                .eq("student_id", user.id);

            if (error) throw error;
            const subjectsList = data?.map((d: any) => d.subjects).filter(Boolean) || [];
            setSubjects(subjectsList);
            if (subjectsList.length > 0) {
                setSelectedSubject(subjectsList[0].id);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCOAttainment = async () => {
        setCalculating(true);
        setNoData(false);
        try {
            // First try to fetch pre-calculated results
            const { data: results } = await supabase
                .from("attainment_results")
                .select("*, course_outcomes(co_number, description)")
                .eq("subject_id", selectedSubject)
                .eq("result_type", "CO");

            if (results && results.length > 0) {
                const mapped: COAttainment[] = results.map((r: any) => ({
                    co_id: r.co_id || "",
                    co_number: r.course_outcomes?.co_number || 0,
                    description: r.course_outcomes?.description || "",
                    direct_attainment: r.direct_attainment || 0,
                    indirect_attainment: r.indirect_attainment || 0,
                    final_attainment: r.final_attainment || 0,
                    students_above_target: 0,
                    total_students: 0,
                }));
                mapped.sort((a, b) => a.co_number - b.co_number);
                setAttainments(mapped);
            } else {
                // Fetch COs to show even if no attainment data
                const { data: cos } = await supabase
                    .from("course_outcomes")
                    .select("*")
                    .eq("subject_id", selectedSubject)
                    .order("co_number");

                if (cos && cos.length > 0) {
                    const pending: COAttainment[] = cos.map((co: any) => ({
                        co_id: co.id,
                        co_number: co.co_number,
                        description: co.description || "",
                        direct_attainment: 0,
                        indirect_attainment: 0,
                        final_attainment: 0,
                        students_above_target: 0,
                        total_students: 0,
                    }));
                    setAttainments(pending);
                    setNoData(true);
                } else {
                    setAttainments([]);
                }
            }
        } catch (error) {
            console.error("Error fetching CO attainment:", error);
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const getColor = (value: number) => {
        if (value >= 70) return { bg: "bg-emerald-500", badge: "bg-green-100 text-green-700" };
        if (value >= 50) return { bg: "bg-amber-500", badge: "bg-yellow-100 text-yellow-700" };
        if (value > 0) return { bg: "bg-red-500", badge: "bg-red-100 text-red-700" };
        return { bg: "bg-slate-300", badge: "bg-slate-100 text-slate-500" };
    };

    const avgFinal = attainments.length > 0
        ? attainments.reduce((sum, a) => sum + a.final_attainment, 0) / attainments.length
        : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">CO Attainment</h1>
                <p className="text-slate-500">Course Outcome attainment analysis for your enrolled subjects</p>
            </div>

            {/* Subject Selector */}
            <Card>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Choose a subject</option>
                    {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                            {subj.code} - {subj.name}
                        </option>
                    ))}
                </select>
            </Card>

            {calculating && (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {/* No Data Banner */}
            {noData && selectedSubject && !calculating && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <p className="font-medium">📊 Marks not yet published</p>
                    <p className="text-sm mt-1">Attainment will be available once your faculty publishes assessment marks and calculates attainment.</p>
                </div>
            )}

            {/* Summary Cards */}
            {selectedSubject && attainments.length > 0 && !calculating && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        <div className="text-center">
                            <p className="text-white/80 text-sm">Average CO Attainment</p>
                            <p className="text-3xl font-bold">{avgFinal.toFixed(1)}%</p>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white/80 text-sm">COs ≥ 60%</p>
                                <p className="text-2xl font-bold">{attainments.filter((a) => a.final_attainment >= 60).length} / {attainments.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                        <div className="text-center">
                            <p className="text-white/80 text-sm">Formula</p>
                            <p className="text-sm font-medium mt-1">80% Direct + 20% Indirect</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* Bar Chart */}
            {selectedSubject && attainments.length > 0 && !calculating && !noData && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">CO Attainment Bar Chart</h3>
                    <div className="space-y-3">
                        {attainments.map((co) => {
                            const color = getColor(co.final_attainment);
                            return (
                                <div key={co.co_id} className="flex items-center gap-3">
                                    <span className="w-12 text-sm font-bold text-slate-700">CO{co.co_number}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${color.bg} transition-all duration-700 ease-out`}
                                            style={{ width: `${Math.min(co.final_attainment, 100)}%` }}
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
                                            {co.final_attainment.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Detailed Table */}
            {selectedSubject && attainments.length > 0 && !calculating && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Detailed CO Analysis</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">CO</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Direct %</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Indirect %</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Final %</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attainments.map((co) => {
                                    const color = getColor(co.final_attainment);
                                    const status = co.final_attainment === 0 ? "Pending" : co.final_attainment >= 60 ? "Achieved" : "Not Achieved";
                                    return (
                                        <tr key={co.co_id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">CO{co.co_number}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 max-w-xs">{co.description || "—"}</td>
                                            <td className="px-4 py-3 text-center font-medium">{co.direct_attainment.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-center font-medium">{co.indirect_attainment.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-center font-bold">{co.final_attainment.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${color.badge}`}>{status}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {selectedSubject && attainments.length === 0 && !calculating && (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <p className="text-lg font-medium">No Course Outcomes defined</p>
                        <p className="text-sm">COs not yet defined for this subject</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
