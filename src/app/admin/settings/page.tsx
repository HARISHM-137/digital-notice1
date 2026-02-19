"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({
        direct_weightage: "80",
        indirect_weightage: "20",
        level_target: "60", // % marks for Level 1
        level_1_threshold: "50", // % students > target for Level 1
        level_2_threshold: "60", // % students > target for Level 2
        level_3_threshold: "70", // % students > target for Level 3
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from("app_settings").select("*");
            if (error) throw error;

            if (data && data.length > 0) {
                const newSettings: any = { ...settings };
                data.forEach((item: any) => {
                    if (newSettings[item.key] !== undefined) {
                        newSettings[item.key] = item.value;
                    }
                });
                setSettings(newSettings);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString(),
            }));

            const { error } = await supabase.from("app_settings").upsert(updates, { onConflict: "key" });
            if (error) throw error;

            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => {
            const newSettings = { ...prev, [name]: value };
            // Auto-balance direct/indirect
            if (name === "direct_weightage") {
                newSettings.indirect_weightage = String(100 - parseInt(value || "0"));
            } else if (name === "indirect_weightage") {
                newSettings.direct_weightage = String(100 - parseInt(value || "0"));
            }
            return newSettings;
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Global Configuration</h1>
                <p className="text-slate-600 mt-1">Configure NBA attainment parameters and thresholds</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Weightage Settings */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Attainment Weightage</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 mb-2">
                            Total attainment is calculated as a weighted average of Direct (Internal/Exams) and Indirect (Surveys) assessment.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput
                                label="Direct Assessment (%)"
                                name="direct_weightage"
                                type="number"
                                value={settings.direct_weightage}
                                onChange={handleChange}
                            />
                            <FormInput
                                label="Indirect Assessment (%)"
                                name="indirect_weightage"
                                type="number"
                                value={settings.indirect_weightage}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex mt-2">
                            <div
                                className="bg-primary-600 h-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, parseInt(settings.direct_weightage)))}%` }}
                            />
                            <div
                                className="bg-secondary-500 h-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, parseInt(settings.indirect_weightage)))}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Direct</span>
                            <span>Indirect</span>
                        </div>
                    </div>
                </div>

                {/* Level Thresholds */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">NBA Attainment Levels</h3>
                    <div className="space-y-4">
                        <FormInput
                            label="Target Marks (%) to Pass CO"
                            name="level_target"
                            type="number"
                            value={settings.level_target}
                            onChange={handleChange}
                        />
                        <p className="text-xs text-slate-500 mt-1">Student must score this % of marks to be considered for attainment.</p>

                        <div className="space-y-3 pt-2">
                            <h4 className="font-medium text-slate-700">Attainment Level Thresholds</h4>
                            <p className="text-xs text-slate-500">Percentage of students scoring above target marks required for each level.</p>

                            <div className="grid grid-cols-3 gap-3">
                                <FormInput
                                    label="Level 1"
                                    name="level_1_threshold"
                                    type="number"
                                    value={settings.level_1_threshold}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Level 2"
                                    name="level_2_threshold"
                                    type="number"
                                    value={settings.level_2_threshold}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Level 3"
                                    name="level_3_threshold"
                                    type="number"
                                    value={settings.level_3_threshold}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
        </div>
    );
}
