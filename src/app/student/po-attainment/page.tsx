"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";

interface POAttainment {
    po_number: number;
    description: string;
    attainment: number;
    status: "achieved" | "partially" | "not_achieved" | "pending";
}

export default function StudentPOAttainmentPage() {
    const [attainments, setAttainments] = useState<POAttainment[]>([]);
    const [loading, setLoading] = useState(true);
    const [noData, setNoData] = useState(false);

    useEffect(() => {
        fetchPOAttainment();
    }, []);

    const fetchPOAttainment = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get student's department to find their program
            const { data: userData } = await supabase
                .from("users")
                .select("department_id")
                .eq("id", user.id)
                .single();

            if (!userData?.department_id) {
                setLoading(false);
                return;
            }

            // Get program for student's department
            const { data: program } = await supabase
                .from("programs")
                .select("id")
                .eq("department_id", userData.department_id)
                .single();

            if (!program) {
                setLoading(false);
                return;
            }

            // Fetch all POs for the program
            const { data: pos, error: poError } = await supabase
                .from("program_outcomes")
                .select("*")
                .eq("program_id", program.id)
                .order("po_number");

            if (poError) throw poError;
            if (!pos || pos.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch student's enrolled subjects
            const { data: enrollments } = await supabase
                .from("student_subjects")
                .select("subject_id")
                .eq("student_id", user.id);

            const subjectIds = enrollments?.map((e: any) => e.subject_id) || [];

            if (subjectIds.length === 0) {
                const pending: POAttainment[] = pos.map((po: any) => ({
                    po_number: po.po_number,
                    description: po.description || "",
                    attainment: 0,
                    status: "pending" as const,
                }));
                setAttainments(pending);
                setNoData(true);
                setLoading(false);
                return;
            }

            // Fetch PO attainment results for student's subjects
            const { data: poResults } = await supabase
                .from("attainment_results")
                .select("po_id, final_attainment")
                .in("subject_id", subjectIds)
                .eq("result_type", "PO");

            const hasResults = poResults && poResults.length > 0;
            if (!hasResults) setNoData(true);

            const attainmentData: POAttainment[] = pos.map((po: any) => {
                // Average across all subjects for this PO
                const matchingResults = (poResults || []).filter((r: any) => r.po_id === po.id);
                let attainment = 0;
                if (matchingResults.length > 0) {
                    attainment = matchingResults.reduce((sum: number, r: any) =>
                        sum + (r.final_attainment || 0), 0) / matchingResults.length;
                }
                return {
                    po_number: po.po_number,
                    description: po.description || "",
                    attainment: Math.round(attainment * 100) / 100,
                    status: !hasResults ? "pending" as const
                        : attainment >= 70 ? "achieved" as const
                            : attainment >= 50 ? "partially" as const
                                : "not_achieved" as const,
                };
            });

            setAttainments(attainmentData);
        } catch (error) {
            console.error("Error fetching PO attainment:", error);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "achieved": return "bg-green-500";
            case "partially": return "bg-yellow-500";
            case "pending": return "bg-slate-300";
            default: return "bg-red-500";
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "achieved": return "bg-green-100 text-green-700";
            case "partially": return "bg-yellow-100 text-yellow-700";
            case "pending": return "bg-slate-100 text-slate-500";
            default: return "bg-red-100 text-red-700";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "achieved": return "ACHIEVED";
            case "partially": return "PARTIAL";
            case "pending": return "PENDING";
            case "not_achieved": return "NOT ACHIEVED";
            default: return status?.toUpperCase() || "UNKNOWN";
        }
    };

    const averageAttainment = attainments.length > 0
        ? attainments.reduce((sum, po) => sum + po.attainment, 0) / attainments.length
        : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">PO Attainment</h1>
                <p className="text-slate-500">Your Program Outcome attainment status</p>
            </div>

            {/* No Data Banner */}
            {noData && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <p className="font-medium">📊 Attainment not yet calculated</p>
                    <p className="text-sm mt-1">PO attainment will be available once faculty publishes assessment marks and calculates attainment for your subjects.</p>
                </div>
            )}

            {/* Overall Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <div className="text-center">
                        <p className="text-white/80 text-sm">Overall Attainment</p>
                        <p className="text-3xl font-bold">{averageAttainment.toFixed(1)}%</p>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Achieved</p>
                            <p className="text-2xl font-bold">{attainments.filter((a) => a.status === "achieved").length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Partial</p>
                            <p className="text-2xl font-bold">{attainments.filter((a) => a.status === "partially").length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-sm">Not Achieved</p>
                            <p className="text-2xl font-bold">{attainments.filter((a) => a.status === "not_achieved").length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* PO Details */}
            {attainments.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <p className="text-lg font-medium">No Program Outcomes defined</p>
                        <p className="text-sm">POs not yet defined for your program</p>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="space-y-4">
                        {attainments.map((po) => (
                            <div key={po.po_number} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 text-sm font-bold rounded-full bg-purple-100 text-purple-700">
                                            PO{po.po_number}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(po.status)}`}>
                                            {getStatusLabel(po.status)}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-slate-900">
                                        {po.attainment.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">{po.description}</p>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getStatusColor(po.status)} transition-all duration-700`}
                                        style={{ width: `${Math.min(po.attainment, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
