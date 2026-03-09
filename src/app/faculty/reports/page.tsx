"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

interface SubjectOption { id: string; name: string; code: string; }
interface MappingCell { co_number: number; po_number: number; correlation_level: number; }
interface GapAnalysis { co_number: number; target: number; attainment: number; gap: number; comments: string; }
interface ActionPlan { co_number: number; action: string; }

interface CourseReport {
    type: "course";
    report: {
        subject: { name: string; code: string; semester: number; credits: number; program: string; department: string; };
        academic_year: string;
        student_count: number;
        config: { direct_weight: number; indirect_weight: number; target_percentage: number; };
        course_outcomes: { co_number: number; description: string; direct_attainment: number; indirect_attainment: number; final_attainment: number; }[];
        program_outcomes: { po_number: number; description: string; final_attainment: number; }[];
        co_po_mapping: MappingCell[];
        gap_analysis?: GapAnalysis[];
        action_plan?: ActionPlan[];
        assessment_tools?: { direct: string[]; indirect: string[]; };
    };
}

export default function FacultyReportsPage() {
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetchingSubjects, setFetchingSubjects] = useState(true);
    const [report, setReport] = useState<CourseReport | null>(null);
    const [error, setError] = useState("");

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
            const formatted = (data || [])
                .map((item: any) => item.subject)
                .filter(Boolean);
            setSubjects(formatted);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setFetchingSubjects(false);
        }
    };

    const generateReport = async () => {
        if (!selectedSubject) return;
        setLoading(true); setError(""); setReport(null);
        try {
            const res = await fetch("/api/reports/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "course", subject_id: selectedSubject }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setReport(data);
            showToast("Report generated successfully!", "success");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Report generation failed";
            setError(msg);
            showToast(msg, "error");
        } finally { setLoading(false); }
    };

    const exportToExcel = async () => {
        if (!report) return;
        try {
            const XLSX = await import("xlsx");
            const wb = XLSX.utils.book_new();
            const r = report.report;

            // Subject info sheet
            const infoSheet = XLSX.utils.aoa_to_sheet([
                ["Course Report", r.subject.name],
                ["Code", r.subject.code],
                ["Department", r.subject.department],
                ["Program", r.subject.program],
                ["Semester", r.subject.semester],
                ["Credits", r.subject.credits],
                ["Academic Year", r.academic_year],
                ["Students", r.student_count],
                ["Direct Weight", r.config.direct_weight],
                ["Indirect Weight", r.config.indirect_weight],
                ["Target %", r.config.target_percentage],
            ]);
            XLSX.utils.book_append_sheet(wb, infoSheet, "Subject Info");

            // CO Attainment sheet
            const coData = r.course_outcomes.map(co => ({
                "CO": `CO${co.co_number}`,
                "Description": co.description,
                "Direct %": co.direct_attainment,
                "Indirect %": co.indirect_attainment,
                "Final %": co.final_attainment,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coData), "CO Attainment");

            // PO Attainment sheet
            const poData = r.program_outcomes.map(po => ({
                "PO": `PO${po.po_number}`,
                "Description": po.description,
                "Attainment %": po.final_attainment,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poData), "PO Attainment");

            // Gap Analysis sheet
            if (r.gap_analysis) {
                const gapData = r.gap_analysis.map(g => ({
                    "CO": `CO${g.co_number}`,
                    "Target %": g.target,
                    "Attainment %": g.attainment,
                    "Gap %": g.gap,
                    "Remarks": g.comments,
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gapData), "Gap Analysis");
            }

            XLSX.writeFile(wb, `Course_Report_${r.subject.code}.xlsx`);
            showToast("Excel exported successfully!", "success");
        } catch (err) {
            console.error("Excel export error:", err);
            showToast("Failed to export Excel. Try again.", "error");
        }
    };

    const levelColor = (val: number) => {
        if (val >= 70) return "text-green-700 bg-green-100";
        if (val >= 50) return "text-yellow-700 bg-yellow-100";
        if (val > 0) return "text-red-700 bg-red-100";
        return "text-slate-400 bg-slate-100";
    };

    if (fetchingSubjects) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">📋 Reports</h1>
                <p className="text-slate-500 mt-1">Generate NBA-compliant CO-PO attainment reports for your subjects.</p>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

            {/* Report Configuration */}
            <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Report Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">— Choose a subject —</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={generateReport} disabled={!selectedSubject || loading}>
                            {loading ? "Generating..." : "📊 Generate Report"}
                        </Button>
                    </div>
                </div>
                {subjects.length === 0 && (
                    <p className="text-sm text-slate-500">No subjects assigned. Contact admin for subject assignment.</p>
                )}
            </Card>

            {/* Report Display */}
            {report?.type === "course" && (
                <div className="space-y-6" id="report-content">
                    {/* Header */}
                    <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-sm uppercase tracking-wider">Course Report</p>
                                <h2 className="text-2xl font-bold mt-1">{report.report.subject.name}</h2>
                                <p className="text-white/80 mt-1">{report.report.subject.code} • Sem {report.report.subject.semester} • {report.report.subject.credits} Credits</p>
                                <p className="text-white/70 text-sm mt-1">{report.report.subject.department} • {report.report.subject.program} • AY {report.report.academic_year}</p>
                            </div>
                            <Button variant="outline" onClick={exportToExcel} className="border-white text-white hover:bg-white/20">📥 Excel</Button>
                        </div>
                    </Card>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="text-center">
                            <p className="text-xs text-slate-500 uppercase">Students</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{report.report.student_count}</p>
                        </Card>
                        <Card className="text-center">
                            <p className="text-xs text-slate-500 uppercase">Direct Weight</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{(report.report.config.direct_weight * 100).toFixed(0)}%</p>
                        </Card>
                        <Card className="text-center">
                            <p className="text-xs text-slate-500 uppercase">Indirect Weight</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{(report.report.config.indirect_weight * 100).toFixed(0)}%</p>
                        </Card>
                        <Card className="text-center">
                            <p className="text-xs text-slate-500 uppercase">Target</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{report.report.config.target_percentage}%</p>
                        </Card>
                    </div>

                    {/* CO Attainment Table */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">CO Attainment</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b">
                                        <th className="px-4 py-3 text-left font-semibold">CO</th>
                                        <th className="px-4 py-3 text-left font-semibold">Description</th>
                                        <th className="px-4 py-3 text-center font-semibold">Direct %</th>
                                        <th className="px-4 py-3 text-center font-semibold">Indirect %</th>
                                        <th className="px-4 py-3 text-center font-semibold">Final %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.report.course_outcomes.map(co => (
                                        <tr key={co.co_number} className="border-b border-slate-100">
                                            <td className="px-4 py-3 font-bold">CO{co.co_number}</td>
                                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{co.description}</td>
                                            <td className="px-4 py-3 text-center">{co.direct_attainment.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-center">{co.indirect_attainment.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${levelColor(co.final_attainment)}`}>{co.final_attainment.toFixed(1)}%</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* PO Attainment Table */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">PO Attainment</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b">
                                        <th className="px-4 py-3 text-left font-semibold">PO</th>
                                        <th className="px-4 py-3 text-left font-semibold">Description</th>
                                        <th className="px-4 py-3 text-center font-semibold">Attainment %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.report.program_outcomes.map(po => (
                                        <tr key={po.po_number} className="border-b border-slate-100">
                                            <td className="px-4 py-3 font-bold">PO{po.po_number}</td>
                                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{po.description}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${levelColor(po.final_attainment)}`}>{po.final_attainment.toFixed(1)}%</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* CO-PO Mapping Matrix */}
                    {report.report.co_po_mapping.length > 0 && (
                        <Card>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">CO-PO Mapping Matrix</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b">
                                            <th className="px-3 py-2 text-left font-semibold">CO / PO</th>
                                            {[...new Set(report.report.co_po_mapping.map(m => m.po_number))].sort((a, b) => a - b).map(po => (
                                                <th key={po} className="px-3 py-2 text-center font-semibold">PO{po}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...new Set(report.report.co_po_mapping.map(m => m.co_number))].sort((a, b) => a - b).map(co => (
                                            <tr key={co} className="border-b border-slate-100">
                                                <td className="px-3 py-2 font-bold">CO{co}</td>
                                                {[...new Set(report.report.co_po_mapping.map(m => m.po_number))].sort((a, b) => a - b).map(po => {
                                                    const mapping = report.report.co_po_mapping.find(m => m.co_number === co && m.po_number === po);
                                                    const level = mapping?.correlation_level || 0;
                                                    const colors = level === 3 ? "bg-green-100 text-green-700 font-bold" :
                                                        level === 2 ? "bg-yellow-100 text-yellow-700 font-bold" :
                                                            level === 1 ? "bg-orange-100 text-orange-700 font-bold" : "text-slate-300";
                                                    return (
                                                        <td key={po} className="px-3 py-2 text-center">
                                                            <span className={`px-2 py-1 rounded text-xs ${colors}`}>
                                                                {level > 0 ? level : "-"}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Gap Analysis */}
                    {report.report.gap_analysis && (
                        <Card>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Gap Analysis</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b">
                                            <th className="px-4 py-3 text-left">CO</th>
                                            <th className="px-4 py-3 text-center">Target %</th>
                                            <th className="px-4 py-3 text-center">Attainment %</th>
                                            <th className="px-4 py-3 text-center">Gap %</th>
                                            <th className="px-4 py-3 text-left">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.report.gap_analysis.map(g => (
                                            <tr key={g.co_number} className="border-b border-slate-100">
                                                <td className="px-4 py-3 font-bold">CO{g.co_number}</td>
                                                <td className="px-4 py-3 text-center">{g.target}%</td>
                                                <td className="px-4 py-3 text-center">{g.attainment.toFixed(1)}%</td>
                                                <td className={`px-4 py-3 text-center font-bold ${g.gap < 0 ? "text-red-600" : "text-green-600"}`}>
                                                    {g.gap > 0 ? "+" : ""}{g.gap.toFixed(1)}%
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{g.comments}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Action Plan */}
                    {report.report.action_plan && report.report.action_plan.length > 0 && (
                        <Card>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Action Plan for Improvement</h3>
                            <ul className="space-y-2">
                                {report.report.action_plan.map(a => (
                                    <li key={a.co_number} className="flex gap-3 text-sm text-slate-700 bg-red-50 p-3 rounded-lg border border-red-100">
                                        <span className="font-bold flex-shrink-0 text-red-700">CO{a.co_number}:</span>
                                        <span>{a.action}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
