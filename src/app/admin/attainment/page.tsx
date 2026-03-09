"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SubjectItem {
    id: string;
    name: string;
    code: string;
}

interface Config {
    id?: string;
    subject_id: string;
    direct_weight: number;
    indirect_weight: number;
    target_percentage: number;
    academic_year: string;
}

export default function AttainmentSettingsPage() {
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [config, setConfig] = useState<Config | null>(null);
    const [saving, setSaving] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [calcResult, setCalcResult] = useState<{ co_attainments: { co_number: number; direct_attainment: number; indirect_attainment: number; final_attainment: number }[]; po_attainments: { po_number: number; final_attainment: number }[] } | null>(null);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        const fetchSubjects = async () => {
            const { data } = await supabase.from("subjects").select("id, name, code").order("code");
            setSubjects(data || []);
        };
        fetchSubjects();
    }, []);

    const fetchConfig = useCallback(async (subjectId: string) => {
        const { data } = await supabase
            .from("attainment_config")
            .select("*")
            .eq("subject_id", subjectId)
            .maybeSingle();

        setConfig(data || {
            subject_id: subjectId,
            direct_weight: 0.8,
            indirect_weight: 0.2,
            target_percentage: 60,
            academic_year: "2025-26",
        });
    }, []);

    useEffect(() => {
        if (selectedSubject) { fetchConfig(selectedSubject); setCalcResult(null); }
    }, [selectedSubject, fetchConfig]);

    const handleSaveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const res = await fetch("/api/attainment/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setMessage({ text: "Configuration saved!", type: "success" });
                fetchConfig(selectedSubject);
            } else {
                // Fallback: direct supabase upsert
                await supabase.from("attainment_config").upsert({
                    subject_id: config.subject_id,
                    direct_weight: config.direct_weight,
                    indirect_weight: config.indirect_weight,
                    target_percentage: config.target_percentage,
                    academic_year: config.academic_year,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "subject_id,academic_year" });
                setMessage({ text: "Configuration saved!", type: "success" });
                fetchConfig(selectedSubject);
            }
        } catch {
            setMessage({ text: "Save failed", type: "error" });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage({ text: "", type: "" }), 3000);
        }
    };

    const handleCalculate = async () => {
        if (!selectedSubject) return;
        setCalculating(true);
        setCalcResult(null);
        try {
            const res = await fetch("/api/attainment/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_id: selectedSubject, academic_year: config?.academic_year || "2025-26" }),
            });
            const data = await res.json();
            if (res.ok) {
                setCalcResult(data);
                setMessage({ text: data.message || "Attainment calculated!", type: "success" });
            } else {
                throw new Error(data.error);
            }
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : "Calculation failed", type: "error" });
        } finally {
            setCalculating(false);
            setTimeout(() => setMessage({ text: "", type: "" }), 5000);
        }
    };

    const attainmentLevel = (val: number) => {
        if (val >= 70) return { label: "High", color: "text-green-600 bg-green-50" };
        if (val >= 50) return { label: "Medium", color: "text-yellow-600 bg-yellow-50" };
        if (val > 0) return { label: "Low", color: "text-red-600 bg-red-50" };
        return { label: "N/A", color: "text-slate-400 bg-slate-50" };
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">⚙️ Attainment Configuration</h1>
                <p className="text-slate-500 mt-1">Configure attainment weights and calculate CO/PO attainments for subjects.</p>
            </div>

            {message.text && (
                <div className={`p-3 rounded-lg text-sm ${message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                    {message.text}
                </div>
            )}

            {/* Subject Selection */}
            <Card>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Subject</label>
                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="">— Choose a subject —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </select>
            </Card>

            {/* Configuration */}
            {config && selectedSubject && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Weight Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Direct Weight</label>
                            <input type="number" min={0} max={1} step={0.05} value={config.direct_weight}
                                onChange={e => setConfig({ ...config, direct_weight: parseFloat(e.target.value), indirect_weight: Math.round((1 - parseFloat(e.target.value)) * 100) / 100 })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            <p className="text-xs text-slate-400 mt-1">Weight for direct assessments (tests, exams)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Indirect Weight</label>
                            <input type="number" min={0} max={1} step={0.05} value={config.indirect_weight}
                                onChange={e => setConfig({ ...config, indirect_weight: parseFloat(e.target.value), direct_weight: Math.round((1 - parseFloat(e.target.value)) * 100) / 100 })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            <p className="text-xs text-slate-400 mt-1">Weight for indirect assessments (surveys)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Percentage</label>
                            <input type="number" min={0} max={100} value={config.target_percentage}
                                onChange={e => setConfig({ ...config, target_percentage: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            <p className="text-xs text-slate-400 mt-1">Minimum % marks for target attainment</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleSaveConfig} disabled={saving}>{saving ? "Saving..." : "💾 Save Config"}</Button>
                        <Button variant="secondary" onClick={handleCalculate} disabled={calculating}>
                            {calculating ? "Calculating..." : "📊 Calculate Attainment"}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Results */}
            {calcResult && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CO Results */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">📋 CO Attainment</h3>
                        <div className="space-y-3">
                            {calcResult.co_attainments.map(co => {
                                const level = attainmentLevel(co.final_attainment);
                                return (
                                    <div key={co.co_number} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-700">CO{co.co_number}</span>
                                        <div className="flex-1">
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(co.final_attainment, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">{co.final_attainment.toFixed(1)}%</p>
                                            <span className={`text-xs px-2 py-0.5 rounded ${level.color}`}>{level.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {calcResult.co_attainments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No CO data</p>}
                        </div>
                    </Card>

                    {/* PO Results */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">🎯 PO Attainment</h3>
                        <div className="space-y-3">
                            {calcResult.po_attainments.map(po => {
                                const level = attainmentLevel(po.final_attainment);
                                return (
                                    <div key={po.po_number} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">PO{po.po_number}</span>
                                        <div className="flex-1">
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(po.final_attainment, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">{po.final_attainment.toFixed(1)}%</p>
                                            <span className={`text-xs px-2 py-0.5 rounded ${level.color}`}>{level.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {calcResult.po_attainments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No PO data</p>}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
