"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface COResult {
    co_number: number;
    description: string;
    cutoff_mark: number;
    total_students: number;
    students_passed: number;
    percentage: number;
    attainment_value: number;
}

interface POResult { po_number: number; attainment_value: number; }
interface PSOResult { pso_number: number; attainment_value: number; }

export default function AdminAttainmentReportPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [academicYear, setAcademicYear] = useState("2025-26");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [coResults, setCoResults] = useState<COResult[]>([]);
    const [poResults, setPoResults] = useState<POResult[]>([]);
    const [psoResults, setPsoResults] = useState<PSOResult[]>([]);

    useEffect(() => {
        supabase.from("subjects").select("id, name, code, academic_year").order("name")
            .then(({ data }) => setSubjects(data || []));
    }, []);

    const fetchReport = async (subjectId: string, year: string) => {
        if (!subjectId) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/attainment/calculate-full?subject_id=${subjectId}&academic_year=${year}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setCoResults(data.co_results || []);
            setPoResults(data.po_results || []);
            setPsoResults(data.pso_results || []);

        } catch (err: any) {
            setError(err.message);
            setCoResults([]);
            setPoResults([]);
            setPsoResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectChange = (val: string) => {
        setSelectedSubject(val);
        fetchReport(val, academicYear);
    };

    const handleYearChange = (val: string) => {
        setAcademicYear(val);
        if (selectedSubject) fetchReport(selectedSubject, val);
    };

    const getLevelColor = (val: number) => val >= 3 ? "bg-green-100 text-green-700" : val >= 2 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
    const getLevelText = (val: number) => val >= 3 ? "High" : val >= 2 ? "Medium" : "Low";

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-slate-900">Attainment Reports</h1>
                <p className="text-slate-500">View CO, PO, and PSO attainment results for any subject</p>
            </div>

            {/* Selectors */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:hidden">
                <div className="flex gap-4">
                    <div className="flex-1 max-w-md">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                        <select value={selectedSubject} onChange={e => handleSubjectChange(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">— Select Subject —</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Academic Year</label>
                        <select value={academicYear} onChange={e => handleYearChange(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            {["2023-24", "2024-25", "2025-26", "2026-27"].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end ml-auto">
                        <button onClick={() => window.print()} disabled={!coResults.length}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                            🖨️ Export PDF
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">⚠️ {error}</div>}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            ) : (!selectedSubject ? (
                <div className="text-center py-12 text-slate-500 print:hidden">
                    <p className="text-lg">Select a subject to view its report</p>
                </div>
            ) : coResults.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <p className="text-lg text-slate-800 font-bold">No results found</p>
                    <p className="text-sm mt-1">Faculty hasn't generated attainment for this subject yet.</p>
                </div>
            ) : (
                <div className="space-y-6 print:space-y-4">
                    {/* Header for Print */}
                    <div className="hidden print:block text-center border-b pb-4 mb-6">
                        <h2 className="text-2xl font-bold">Course Attainment Report</h2>
                        <h3 className="text-xl mt-1">{subjects.find(s => s.id === selectedSubject)?.name} ({subjects.find(s => s.id === selectedSubject)?.code})</h3>
                        <p className="text-gray-600 mt-1">Academic Year: {academicYear}</p>
                    </div>

                    {/* CO Results */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:border-none print:p-0">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 print:text-xl">Course Outcomes (CO) Attainment</h2>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-gray-300">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800 text-white print:bg-gray-200 print:text-black">
                                        <th className="px-4 py-3 text-left">CO</th>
                                        <th className="px-4 py-3 text-center">Total Students</th>
                                        <th className="px-4 py-3 text-center">Passed</th>
                                        <th className="px-4 py-3 text-center">Percentage</th>
                                        <th className="px-4 py-3 text-center">Attainment Level</th>
                                        <th className="px-4 py-3 text-center print:hidden">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coResults.map(co => (
                                        <tr key={co.co_number} className="border-b border-slate-100 print:border-gray-200">
                                            <td className="px-4 py-3 font-bold text-indigo-700 print:text-black">CO{co.co_number}</td>
                                            <td className="px-4 py-3 text-center">{co.total_students}</td>
                                            <td className="px-4 py-3 text-center">{co.students_passed}</td>
                                            <td className="px-4 py-3 text-center font-bold">{co.percentage.toFixed(1)}%</td>
                                            <td className="px-4 py-3 text-center text-xl font-black">{co.attainment_value}</td>
                                            <td className="px-4 py-3 text-center print:hidden">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(co.attainment_value)}`}>
                                                    {getLevelText(co.attainment_value)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* CO Bar Chart (CSS based for print compatibility) */}
                        <div className="mt-5 p-4 bg-slate-50 rounded-xl print:bg-white print:p-0 print:border">
                            <h3 className="text-sm font-bold text-slate-700 mb-3">CO Attainment Graph</h3>
                            <div className="space-y-3">
                                {coResults.map(co => (
                                    <div key={co.co_number} className="flex items-center gap-3">
                                        <span className="w-8 text-xs font-bold text-indigo-600 print:text-black">CO{co.co_number}</span>
                                        <div className="flex-1 bg-slate-200 rounded-full h-6 relative print:bg-gray-100 print:border">
                                            <div className="h-full rounded-full bg-indigo-500 print:bg-gray-500"
                                                style={{ width: `${Math.min(co.percentage, 100)}%` }} />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                                                {co.percentage.toFixed(1)}% (Level {co.attainment_value})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PO & PSO Results Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                        {/* POs */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:p-0 print:border-none">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 print:text-lg">Program Outcomes (PO)</h2>
                            <div className="grid grid-cols-4 gap-3">
                                {poResults.map(p => (
                                    <div key={p.po_number} className={`p-3 rounded-xl border text-center ${p.attainment_value > 0 ? "bg-indigo-50 border-indigo-100 print:bg-gray-50" : "bg-slate-50 border-slate-200"}`}>
                                        <div className="text-xs font-bold text-slate-500">PO{p.po_number}</div>
                                        <div className={`text-xl font-black ${p.attainment_value > 0 ? "text-indigo-700 print:text-black" : "text-slate-300"}`}>
                                            {p.attainment_value > 0 ? p.attainment_value.toFixed(2) : "-"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PSOs */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:p-0 print:border-none">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 print:text-lg">Program Specific Outcomes (PSO)</h2>
                            <div className="grid grid-cols-3 gap-3">
                                {psoResults.map(p => (
                                    <div key={p.pso_number} className={`p-3 rounded-xl border text-center ${p.attainment_value > 0 ? "bg-purple-50 border-purple-100 print:bg-gray-50" : "bg-slate-50 border-slate-200"}`}>
                                        <div className="text-xs font-bold text-slate-500">PSO{p.pso_number}</div>
                                        <div className={`text-xl font-black ${p.attainment_value > 0 ? "text-purple-700 print:text-black" : "text-slate-300"}`}>
                                            {p.attainment_value > 0 ? p.attainment_value.toFixed(2) : "-"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CO-PO-PSO Matrix */}
                    <CoPoPsoMatrix subjectId={selectedSubject} coResults={coResults} poResults={poResults} psoResults={psoResults} />
                </div>
            ))}
        </div>
    );
}

// Reusable Matrix Component (Similar to Faculty view but optimized for reports)
function CoPoPsoMatrix({ subjectId, coResults, poResults, psoResults }: any) {
    const [mapping, setMapping] = useState<Record<string, number>>({});
    const activePOs = poResults.filter((p: any) => p.attainment_value > 0);
    const activePSOs = psoResults.filter((p: any) => p.attainment_value > 0);

    useEffect(() => {
        if (!subjectId) return;
        import("@/lib/supabaseClient").then(({ supabase }) => {
            supabase.from("co_po_mapping").select("co_number, po_number, mapping_value").eq("subject_id", subjectId)
                .then(({ data: poMap }) => {
                    supabase.from("co_pso_mapping").select("co_number, pso_number, mapping_value").eq("subject_id", subjectId)
                        .then(({ data: psoMap }) => {
                            const m: Record<string, number> = {};
                            (poMap || []).forEach((r: any) => { m[`co${r.co_number}_po${r.po_number}`] = r.mapping_value; });
                            (psoMap || []).forEach((r: any) => { m[`co${r.co_number}_pso${r.pso_number}`] = r.mapping_value; });
                            setMapping(m);
                        });
                });
        });
    }, [subjectId]);

    if (activePOs.length === 0 && activePSOs.length === 0) return null;

    const getCellVal = (coNum: number, type: "po" | "pso", num: number) => {
        const mapVal = mapping[`co${coNum}_${type}${num}`] || 0;
        if (mapVal === 0) return "-";
        const coLevel = coResults.find((c: any) => c.co_number === coNum)?.attainment_value || 0;
        return ((coLevel * mapVal) / 3).toFixed(2);
    };

    const getAvg = (type: "po" | "pso", num: number) => {
        const vals = coResults
            .map((co: any) => {
                const mapVal = mapping[`co${co.co_number}_${type}${num}`] || 0;
                if (mapVal === 0) return null;
                return (co.attainment_value * mapVal) / 3;
            })
            .filter((v: any) => v !== null) as number[];
        return vals.length > 0 ? (vals.reduce((s: number, v: number) => s + v, 0) / vals.length).toFixed(2) : "-";
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:shadow-none print:border-none print:p-0 print:mt-6 print:break-inside-avoid">
            <h2 className="text-lg font-bold text-slate-800 mb-1 print:text-lg">CO's–PO's & PSO's MAPPING MATRIX</h2>
            <p className="text-xs text-slate-500 mb-4">1 – low, 2 – medium, 3 – high, '–' – no correlation</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-gray-300">
                <table className="text-xs w-full">
                    <thead>
                        <tr className="bg-slate-700 text-white print:bg-gray-200 print:text-black">
                            <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-600 print:border-gray-300">CO's</th>
                            <th colSpan={activePOs.length} className="px-2 py-2 text-center border-r border-slate-600 print:border-gray-300">PO's</th>
                            {activePSOs.length > 0 && <th colSpan={activePSOs.length} className="px-2 py-2 text-center">PSO's</th>}
                        </tr>
                        <tr className="bg-slate-600 text-white print:bg-gray-100 print:text-black">
                            {activePOs.map((p: any) => <th key={p.po_number} className="px-2 py-2 text-center font-semibold min-w-[40px] print:border-t print:border-gray-300">{p.po_number}</th>)}
                            {activePSOs.map((p: any) => <th key={p.pso_number} className="px-2 py-2 text-center font-semibold text-yellow-300 border-l border-slate-500 print:border-gray-300 min-w-[40px]">{p.pso_number}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {coResults.map((co: any, idx: number) => (
                            <tr key={co.co_number} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 print:bg-white"}>
                                <td className="px-3 py-2 font-bold text-indigo-700 border-r border-slate-200 print:border-gray-300 print:text-black">{co.co_number}</td>
                                {activePOs.map((p: any) => {
                                    const v = getCellVal(co.co_number, "po", p.po_number);
                                    return <td key={p.po_number} className="px-2 py-2 text-center font-semibold text-slate-700 border-t print:border-gray-200">{v === "0.00" ? "-" : v}</td>;
                                })}
                                {activePSOs.map((p: any) => {
                                    const v = getCellVal(co.co_number, "pso", p.pso_number);
                                    return <td key={p.pso_number} className="px-2 py-2 text-center font-semibold text-slate-700 border-l border-slate-100 border-t print:border-gray-200">{v === "0.00" ? "-" : v}</td>;
                                })}
                            </tr>
                        ))}
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 print:bg-gray-100 print:border-gray-400">
                            <td className="px-3 py-2 text-slate-700 border-r border-slate-200 print:border-gray-300 print:text-black">AVg.</td>
                            {activePOs.map((p: any) => <td key={p.po_number} className="px-2 py-2 text-center text-indigo-700 print:text-black">{getAvg("po", p.po_number)}</td>)}
                            {activePSOs.map((p: any) => <td key={p.pso_number} className="px-2 py-2 text-center text-purple-700 border-l border-slate-200 print:border-gray-300 print:text-black">{getAvg("pso", p.pso_number)}</td>)}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
