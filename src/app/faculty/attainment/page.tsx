"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

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

interface POAttainment {
    po_id: string;
    po_number: number;
    description: string;
    final_attainment: number;
}

export default function FacultyAttainmentPage() {
    const [selectedSubject, setSelectedSubject] = useState("");
    const [subjects, setSubjects] = useState<any[]>([]);
    const [coAttainment, setCoAttainment] = useState<COAttainment[]>([]);
    const [poAttainment, setPoAttainment] = useState<POAttainment[]>([]);
    const [config, setConfig] = useState({ direct_weight: 0.8, indirect_weight: 0.2, target_percentage: 60 });
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("faculty_subjects")
                .select("subject:subjects(id, name, code)")
                .eq("faculty_id", user.id);
            if (error) throw error;
            const formatted = data?.map((item: any) => ({
                label: `${item.subject.code} - ${item.subject.name}`,
                value: item.subject.id,
            })) || [];
            setSubjects(formatted);
            if (formatted.length > 0) setSelectedSubject(formatted[0].value);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAttainment = async () => {
        if (!selectedSubject) return;
        setCalculating(true);
        try {
            const res = await fetch("/api/attainment/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_id: selectedSubject }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Calculation failed");

            setCoAttainment(data.co_attainments || []);
            setPoAttainment(data.po_attainments || []);
            setConfig({
                direct_weight: data.direct_weight || 0.8,
                indirect_weight: data.indirect_weight || 0.2,
                target_percentage: data.target_percentage || 60,
            });
            showToast("Attainment calculated successfully!", "success");
        } catch (error: any) {
            console.error("Calculation error:", error);
            showToast(error.message || "Calculation failed", "error");
        } finally {
            setCalculating(false);
        }
    };

    const getColor = (value: number) => {
        if (value >= 70) return { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50", border: "border-emerald-200" };
        if (value >= 50) return { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200" };
        return { bg: "bg-red-500", text: "text-red-700", light: "bg-red-50", border: "border-red-200" };
    };

    const getStatusLabel = (value: number) => {
        if (value >= 70) return "High";
        if (value >= 50) return "Moderate";
        return "Low";
    };

    // Simple inline bar chart component
    const BarChart = ({ data, title, labelKey, valueKey }: { data: any[]; title: string; labelKey: string; valueKey: string }) => {
        const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 100);
        return (
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
                <div className="space-y-3">
                    {data.map((item, i) => {
                        const value = item[valueKey] || 0;
                        const color = getColor(value);
                        return (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-12 text-sm font-bold text-slate-700">{item[labelKey]}</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${color.bg} transition-all duration-700 ease-out`}
                                        style={{ width: `${Math.min((value / maxVal) * 100, 100)}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
                                        {Math.round(value)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const overallCO = coAttainment.length > 0
        ? Math.round(coAttainment.reduce((s, c) => s + c.final_attainment, 0) / coAttainment.length)
        : 0;
    const overallPO = poAttainment.length > 0
        ? Math.round(poAttainment.filter(p => p.final_attainment > 0).reduce((s, p) => s + p.final_attainment, 0) / Math.max(poAttainment.filter(p => p.final_attainment > 0).length, 1))
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Attainment Analysis</h1>
                    <p className="text-slate-600 mt-1">
                        Final CO = ({config.direct_weight * 100}% × Direct) + ({config.indirect_weight * 100}% × Indirect)
                    </p>
                </div>
                <Button onClick={calculateAttainment} disabled={calculating || !selectedSubject}>
                    {calculating ? "Calculating..." : "Calculate Attainment"}
                </Button>
            </div>

            {/* Subject Selector */}
            <Card className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setCoAttainment([]); setPoAttainment([]); }}
                    className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    {subjects.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </Card>

            {coAttainment.length === 0 && poAttainment.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-lg font-medium">Click &quot;Calculate Attainment&quot; to see results</p>
                        <p className="text-sm">Ensure COs, assessments, and survey data are available.</p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Overall Summary Cards */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className={`rounded-xl shadow-md p-6 border-2 ${getColor(overallCO).border} ${getColor(overallCO).light}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Overall CO Attainment</p>
                                    <p className={`text-4xl font-bold ${getColor(overallCO).text}`}>{overallCO}%</p>
                                </div>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getColor(overallCO).bg} text-white text-xl font-bold`}>
                                    {getStatusLabel(overallCO)[0]}
                                </div>
                            </div>
                            <p className={`text-sm mt-2 ${getColor(overallCO).text}`}>{getStatusLabel(overallCO)} Performance</p>
                        </div>
                        <div className={`rounded-xl shadow-md p-6 border-2 ${getColor(overallPO).border} ${getColor(overallPO).light}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Overall PO Attainment</p>
                                    <p className={`text-4xl font-bold ${getColor(overallPO).text}`}>{overallPO}%</p>
                                </div>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getColor(overallPO).bg} text-white text-xl font-bold`}>
                                    {getStatusLabel(overallPO)[0]}
                                </div>
                            </div>
                            <p className={`text-sm mt-2 ${getColor(overallPO).text}`}>{getStatusLabel(overallPO)} Performance</p>
                        </div>
                    </div>

                    {/* CO Box Cards */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Course Outcome Attainment</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {coAttainment.map((co) => {
                                const color = getColor(co.final_attainment);
                                return (
                                    <div key={co.co_id} className={`rounded-xl border-2 ${color.border} ${color.light} p-4 transition-all hover:shadow-lg`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="px-2 py-1 text-xs font-bold rounded bg-slate-800 text-white">CO{co.co_number}</span>
                                            <span className={`text-2xl font-bold ${color.text}`}>{Math.round(co.final_attainment)}%</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">{co.description}</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                                <p className="text-slate-500">Direct</p>
                                                <p className="font-bold text-blue-700">{Math.round(co.direct_attainment)}%</p>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-2 text-center">
                                                <p className="text-slate-500">Indirect</p>
                                                <p className="font-bold text-purple-700">{Math.round(co.indirect_attainment)}%</p>
                                            </div>
                                        </div>
                                        {co.total_students > 0 && (
                                            <p className="text-xs text-slate-500 mt-2 text-center">
                                                {co.students_above_target}/{co.total_students} students above target
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CO Bar Chart */}
                    <BarChart
                        data={coAttainment.map((c) => ({ label: `CO${c.co_number}`, value: c.final_attainment }))}
                        title="CO Attainment Bar Chart"
                        labelKey="label"
                        valueKey="value"
                    />

                    {/* PO Box Cards */}
                    {poAttainment.filter(p => p.final_attainment > 0).length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Program Outcome Attainment</h2>
                            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {poAttainment.filter(p => p.final_attainment > 0).map((po) => {
                                    const color = getColor(po.final_attainment);
                                    return (
                                        <div key={po.po_id} className={`rounded-xl border-2 ${color.border} ${color.light} p-4 text-center transition-all hover:shadow-lg`}>
                                            <span className="px-2 py-1 text-xs font-bold rounded bg-indigo-800 text-white">
                                                PO{po.po_number}
                                            </span>
                                            <p className={`text-3xl font-bold ${color.text} mt-2`}>
                                                {Math.round(po.final_attainment)}%
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{po.description?.slice(0, 50)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PO Bar Chart */}
                    {poAttainment.filter(p => p.final_attainment > 0).length > 0 && (
                        <BarChart
                            data={poAttainment.filter(p => p.final_attainment > 0).map((p) => ({ label: `PO${p.po_number}`, value: p.final_attainment }))}
                            title="PO Attainment Bar Chart"
                            labelKey="label"
                            valueKey="value"
                        />
                    )}

                    {/* Detailed CO Table */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Detailed CO Analysis</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-left text-sm">CO</th>
                                        <th className="px-4 py-3 text-left text-sm">Description</th>
                                        <th className="px-4 py-3 text-center text-sm">Direct ({config.direct_weight * 100}%)</th>
                                        <th className="px-4 py-3 text-center text-sm">Indirect ({config.indirect_weight * 100}%)</th>
                                        <th className="px-4 py-3 text-center text-sm">Final</th>
                                        <th className="px-4 py-3 text-center text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coAttainment.map((co) => (
                                        <tr key={co.co_id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-bold text-indigo-600">CO{co.co_number}</td>
                                            <td className="px-4 py-3 text-slate-600 text-sm">{co.description}</td>
                                            <td className="px-4 py-3 text-center font-medium text-blue-700">{Math.round(co.direct_attainment)}%</td>
                                            <td className="px-4 py-3 text-center font-medium text-purple-700">{Math.round(co.indirect_attainment)}%</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-800">{Math.round(co.final_attainment)}%</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${co.final_attainment >= 70 ? "bg-green-100 text-green-700" :
                                                    co.final_attainment >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                        "bg-red-100 text-red-700"
                                                    }`}>
                                                    {getStatusLabel(co.final_attainment)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
