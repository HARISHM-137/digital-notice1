"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SubjectOption { id: string; name: string; code: string; }
interface ProgramOption { id: string; name: string; code: string; }
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

interface ProgramReport {
    type: "program";
    report: {
        program: { name: string; code: string; department: string; };
        academic_year: string;
        subjects: { id: string; name: string; code: string; semester: number; }[];
        program_outcomes: { po_number: number; description: string; final_attainment: number; }[];
    };
}

type ReportData = CourseReport | ProgramReport;

export default function ReportsPage() {
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [programs, setPrograms] = useState<ProgramOption[]>([]);
    const [reportType, setReportType] = useState<"course" | "program">("course");
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ReportData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetch = async () => {
            const [{ data: s }, { data: p }] = await Promise.all([
                supabase.from("subjects").select("id, name, code").order("code"),
                supabase.from("programs").select("id, name, code").order("code"),
            ]);
            setSubjects(s || []);
            setPrograms(p || []);
        };
        fetch();
    }, []);

    const generateReport = async () => {
        if (!selectedId) return;
        setLoading(true); setError(""); setReport(null);
        try {
            const body = reportType === "course"
                ? { type: "course", subject_id: selectedId }
                : { type: "program", program_id: selectedId };

            const res = await fetch("/api/reports/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setReport(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Report generation failed");
        } finally { setLoading(false); }
    };

    const exportToExcel = async () => {
        if (!report) return;
        try {
            const XLSX = await import("xlsx");
            const wb = XLSX.utils.book_new();

            if (report.type === "course") {
                const r = report.report;
                // Subject info
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

                // CO Attainment
                const coData = r.course_outcomes.map(co => ({
                    "CO": `CO${co.co_number}`,
                    "Description": co.description,
                    "Direct %": co.direct_attainment,
                    "Indirect %": co.indirect_attainment,
                    "Final %": co.final_attainment,
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coData), "CO Attainment");

                // PO Attainment
                const poData = r.program_outcomes.map(po => ({
                    "PO": `PO${po.po_number}`,
                    "Description": po.description,
                    "Attainment %": po.final_attainment,
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poData), "PO Attainment");

                XLSX.writeFile(wb, `Course_Report_${r.subject.code}.xlsx`);
            } else {
                const r = report.report;
                const poData = r.program_outcomes.map(po => ({
                    "PO": `PO${po.po_number}`,
                    "Description": po.description,
                    "Avg Attainment %": po.final_attainment,
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poData), "PO Attainment");
                XLSX.writeFile(wb, `Program_Report_${r.program.code}.xlsx`);
            }
        } catch (err) {
            console.error("Excel export error:", err);
            setError("Failed to export Excel. Try again.");
        }
    };

    const levelColor = (val: number) => {
        if (val >= 70) return "text-green-700 bg-green-100";
        if (val >= 50) return "text-yellow-700 bg-yellow-100";
        if (val > 0) return "text-red-700 bg-red-100";
        return "text-slate-400 bg-slate-100";
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">📋 Reports</h1>
                <p className="text-slate-500 mt-1">Generate NBA-compliant CO-PO attainment reports.</p>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

            {/* Report Configuration */}
            <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Report Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                        <select value={reportType} onChange={e => { setReportType(e.target.value as "course" | "program"); setSelectedId(""); setReport(null); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <option value="course">Course Report</option>
                            <option value="program">Program Report</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {reportType === "course" ? "Select Subject" : "Select Program"}
                        </label>
                        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <option value="">— Choose —</option>
                            {(reportType === "course" ? subjects : programs).map(item => (
                                <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={generateReport} disabled={!selectedId || loading}>
                            {loading ? "Generating..." : "📊 Generate Report"}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Course Report */}
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

                    {/* CO Table */}
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

                    {/* PO Table */}
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

            {/* Program Report */}
            {report?.type === "program" && (
                <div className="space-y-6">
                    <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-sm uppercase tracking-wider">Program Report</p>
                                <h2 className="text-2xl font-bold mt-1">{report.report.program.name}</h2>
                                <p className="text-white/80 mt-1">{report.report.program.code} • {report.report.program.department} • AY {report.report.academic_year}</p>
                            </div>
                            <Button variant="outline" onClick={exportToExcel} className="border-white text-white hover:bg-white/20">📥 Excel</Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Program Outcome Attainment (Aggregated)</h3>
                        <div className="space-y-3">
                            {report.report.program_outcomes.map(po => (
                                <div key={po.po_number} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 flex-shrink-0">PO{po.po_number}</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 truncate max-w-md">{po.description}</p>
                                        <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                                            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(po.final_attainment, 100)}%` }}></div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${levelColor(po.final_attainment)}`}>{po.final_attainment.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
