interface HeatmapProps {
    rows: string[];
    columns: string[];
    data: number[][];
    title?: string;
}

const getColor = (value: number): string => {
    if (value >= 3) return "bg-green-500 text-white";
    if (value >= 2) return "bg-green-300 text-green-900";
    if (value >= 1) return "bg-yellow-300 text-yellow-900";
    if (value > 0) return "bg-orange-300 text-orange-900";
    return "bg-slate-100 text-slate-400";
};

export default function Heatmap({ rows, columns, data, title }: HeatmapProps) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 overflow-x-auto">
            {title && <h3 className="text-lg font-semibold text-slate-800 mb-6">{title}</h3>}
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600"></th>
                        {columns.map((col) => (
                            <th key={col} className="px-3 py-2 text-center text-sm font-semibold text-slate-600">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) => (
                        <tr key={row}>
                            <td className="px-3 py-2 text-sm font-medium text-slate-700">{row}</td>
                            {columns.map((col, colIdx) => (
                                <td key={col} className="px-3 py-2 text-center">
                                    <span
                                        className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-semibold text-sm ${getColor(
                                            data[rowIdx]?.[colIdx] || 0
                                        )}`}
                                    >
                                        {data[rowIdx]?.[colIdx] || "-"}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-200">
                <span className="text-sm text-slate-500">Legend:</span>
                <div className="flex items-center gap-1">
                    <span className="w-6 h-6 bg-green-500 rounded"></span>
                    <span className="text-xs text-slate-600">High (3)</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-6 h-6 bg-green-300 rounded"></span>
                    <span className="text-xs text-slate-600">Medium (2)</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-6 h-6 bg-yellow-300 rounded"></span>
                    <span className="text-xs text-slate-600">Low (1)</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-6 h-6 bg-slate-100 rounded border"></span>
                    <span className="text-xs text-slate-600">None</span>
                </div>
            </div>
        </div>
    );
}
