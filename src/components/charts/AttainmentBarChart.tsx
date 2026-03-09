"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AttainmentBarChartProps {
    data: { label: string; value: number; target?: number }[];
    title: string;
    colorScheme?: "co" | "po";
    targetLine?: number;
}

const CO_GRADIENT = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];
const PO_GRADIENT = ["#059669", "#10b981", "#34d399", "#6ee7b7"];

export default function AttainmentBarChart({ data, title, colorScheme = "co", targetLine }: AttainmentBarChartProps) {
    const colors = colorScheme === "co" ? CO_GRADIENT : PO_GRADIENT;

    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-sm">No attainment data available</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        label={{ value: "Attainment %", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#94a3b8" } }}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                            padding: "10px 14px",
                        }}
                        formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, "Attainment"]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {data.map((_, idx) => (
                            <Cell key={idx} fill={colors[idx % colors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            {targetLine !== undefined && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500">
                    <span className="w-4 h-0.5 bg-red-500 inline-block"></span>
                    Target: {targetLine}%
                </div>
            )}
        </div>
    );
}
