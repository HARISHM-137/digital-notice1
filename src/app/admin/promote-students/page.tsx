"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PromoteStudentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState("");
    const [currentSemester, setCurrentSemester] = useState(2);
    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [promoting, setPromoting] = useState(false);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        supabase.from("departments").select("id, name, code").order("name").then(({ data }) => setDepartments(data || []));
    }, []);

    // Count students when dept or semester changes
    useEffect(() => {
        if (!selectedDept || !currentSemester) { setStudentCount(null); return; }
        const fetchCount = async () => {
            setLoading(true);
            const { count, error } = await supabase
                .from("users")
                .select("id", { count: "exact", head: true })
                .eq("role", "STUDENT")
                .eq("department_id", selectedDept)
                .eq("year", Math.ceil(currentSemester / 2));
            setStudentCount(error ? 0 : (count ?? 0));
            setLoading(false);
        };
        fetchCount();
    }, [selectedDept, currentSemester]);

    const handlePromote = async () => {
        if (!selectedDept) return;
        setPromoting(true);
        setError("");
        setResult("");
        setShowConfirm(false);

        try {
            const nextSemester = currentSemester + 1;
            const currentYear = Math.ceil(currentSemester / 2);
            const nextYear = Math.ceil(nextSemester / 2);

            // Get students in this dept + year
            const { data: students, error: fetchErr } = await supabase
                .from("users")
                .select("id")
                .eq("role", "STUDENT")
                .eq("department_id", selectedDept)
                .eq("year", currentYear);

            if (fetchErr) throw fetchErr;
            if (!students || students.length === 0) {
                setError("No students found to promote.");
                setPromoting(false);
                return;
            }

            // Update year if needed (semester 2→3 means year 1→2, etc.)
            const updatePayload: any = {};
            if (nextYear !== currentYear) {
                updatePayload.year = nextYear;
            }

            // Update via Supabase
            const studentIds = students.map(s => s.id);
            const { error: updateErr } = await supabase
                .from("users")
                .update(updatePayload)
                .eq("role", "STUDENT")
                .eq("department_id", selectedDept)
                .eq("year", currentYear);

            if (updateErr) throw updateErr;

            setResult(`✅ ${students.length} students promoted from Semester ${currentSemester} → Semester ${nextSemester} successfully!`);
            setStudentCount(0);
        } catch (err: any) {
            setError(err.message || "Failed to promote students");
        } finally {
            setPromoting(false);
        }
    };

    const nextSemester = currentSemester + 1;
    const isFinalSemester = currentSemester >= 8;
    const deptName = departments.find(d => d.id === selectedDept)?.name || "";

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Promote Students</h1>
                <p className="text-slate-500">Move students from one semester to the next</p>
            </div>

            {/* Selection Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">📋 Select Students to Promote</h2>

                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Department *</label>
                        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">— Select Department —</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Current Semester</label>
                        <select value={currentSemester} onChange={e => setCurrentSemester(+e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Preview */}
                {selectedDept && (
                    <div className={`rounded-xl p-5 border-2 ${isFinalSemester ? "bg-red-50 border-red-200" : "bg-indigo-50 border-indigo-200"}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-600">{deptName}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-bold text-sm">
                                        Sem {currentSemester}
                                    </span>
                                    <span className="text-2xl text-slate-400">→</span>
                                    <span className={`px-3 py-1.5 rounded-lg font-bold text-sm ${isFinalSemester ? "bg-red-200 text-red-700" : "bg-emerald-600 text-white"}`}>
                                        {isFinalSemester ? "FINAL (Cannot Promote)" : `Sem ${nextSemester}`}
                                    </span>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-4xl font-black text-slate-800">
                                    {loading ? "..." : studentCount ?? 0}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">Students Found</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error / Result */}
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">⚠️ {error}</div>}
            {result && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 font-semibold text-sm">{result}</div>}

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">⚠️ Confirm Promotion</h3>
                        <p className="text-slate-600 text-sm mb-4">
                            Are you sure you want to promote <b>{studentCount}</b> students from
                            <b> {deptName}</b> from Semester {currentSemester} → Semester {nextSemester}?
                        </p>
                        <p className="text-xs text-amber-600 mb-4 bg-amber-50 p-2 rounded">
                            This action will update student year records. It cannot be easily undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={handlePromote} disabled={promoting}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl disabled:opacity-60">
                                {promoting ? "Promoting..." : "Yes, Promote All"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!selectedDept || isFinalSemester || !studentCount || studentCount === 0 || promoting}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                    🎓 Promote {studentCount || 0} Students to Semester {nextSemester}
                </button>
            </div>
        </div>
    );
}
