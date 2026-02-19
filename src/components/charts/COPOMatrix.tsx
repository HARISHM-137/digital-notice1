"use client";

interface COPOMatrixProps {
    courseOutcomes: { id: string; co_number: number; description?: string }[];
    programOutcomes: { id: string; po_number: number; description?: string }[];
    mappings: Record<string, Record<string, number>>; // { co_id: { po_id: correlation_level } }
}

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    0: { bg: "bg-slate-50", text: "text-slate-300", border: "border-slate-200" },
    1: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
    2: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
    3: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
};

export default function COPOMatrix({ courseOutcomes, programOutcomes, mappings }: COPOMatrixProps) {
    if (courseOutcomes.length === 0 || programOutcomes.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm">Define COs and POs first to see the mapping matrix</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                            <th className="px-4 py-3 text-left text-sm font-bold text-white rounded-tl-xl sticky left-0 bg-slate-800 z-10">
                                CO / PO
                            </th>
                            {programOutcomes.map((po, idx) => (
                                <th
                                    key={po.id}
                                    className={`px-3 py-3 text-center text-sm font-bold text-white min-w-[60px] ${idx === programOutcomes.length - 1 ? "rounded-tr-xl" : ""
                                        }`}
                                    title={po.description}
                                >
                                    PO{po.po_number}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {courseOutcomes.map((co, rowIdx) => (
                            <tr
                                key={co.id}
                                className={`${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/50 transition-colors`}
                            >
                                <td className={`px-4 py-3 sticky left-0 z-10 ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
                                        CO{co.co_number}
                                    </span>
                                </td>
                                {programOutcomes.map((po) => {
                                    const level = mappings[co.id]?.[po.id] || 0;
                                    const colors = LEVEL_COLORS[level];
                                    return (
                                        <td key={po.id} className="px-3 py-3 text-center">
                                            <span
                                                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all 
                                                    ${colors.bg} ${colors.text} ${colors.border}
                                                    ${level > 0 ? "shadow-sm" : ""}`}
                                            >
                                                {level || "-"}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 justify-center text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3">
                <span className="font-medium">Scale:</span>
                <span className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded border-2 border-yellow-300 bg-yellow-100 inline-flex items-center justify-center text-xs font-bold text-yellow-800">1</span>
                    Low
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded border-2 border-orange-300 bg-orange-100 inline-flex items-center justify-center text-xs font-bold text-orange-800">2</span>
                    Medium
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded border-2 border-emerald-300 bg-emerald-100 inline-flex items-center justify-center text-xs font-bold text-emerald-800">3</span>
                    High
                </span>
            </div>
        </div>
    );
}
